// ============================================================================
//  generate.ts — Socrates second-stage generation engine.
//  Three fast modes, called in sequence by the frontend so each stays well
//  inside the 26s function budget:
//    mode: "align"       → match assignment to uploaded SCOS standards
//    mode: "lesson_plan"  → SCOE CCSS-aligned lesson plan (template-locked)
//    mode: "directions"   → student-facing directions
// ============================================================================
import Anthropic from "@anthropic-ai/sdk";
import {
  FRAMEWORKS,
  PERMISSION_CATEGORIES,
  SCOE_LESSON_PLAN_TEMPLATE,
} from "./_shared/research-base";
import { logUsage, usageFromResponse } from "./_shared/usage";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 27000, maxRetries: 0 });

// Best-effort usage logging shared by every generate mode (never logs content).
async function logGen(body: any, mode: string, response: any) {
  await logUsage({
    event_type: mode,
    user_id: body.user_id ?? null, anon_id: body.anon_id ?? null, request_group: body.request_group ?? null,
    ai_strategy: body.aiStrategy ?? null, subject: body.subject ?? null, grade_level: body.gradeLevel ?? null,
    status: "success", ...usageFromResponse(response?.usage),
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ]);
}

// Repair the most common model-JSON defect: literal control characters
// (raw newlines/tabs) inside string values, which JSON.parse rejects.
function repairJSON(raw: string): string {
  let out = "";
  let inString = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (ch === "\\") { out += ch + (raw[i + 1] ?? ""); i++; continue; }
      if (ch === "\n") { out += "\\n"; continue; }
      if (ch === "\r") continue;
      if (ch === "\t") { out += "\\t"; continue; }
      if (ch === '"') {
        // A quote closes the string only if the next non-space char is a
        // structural delimiter; otherwise it's a stray unescaped quote inside
        // the value (the #1 cause of unrepairable model JSON) — escape it.
        let j = i + 1;
        while (j < raw.length && (raw[j] === " " || raw[j] === "\n" || raw[j] === "\r" || raw[j] === "\t")) j++;
        const next = raw[j];
        if (next === undefined || next === "," || next === "}" || next === "]" || next === ":") {
          inString = false; out += ch; continue;
        }
        out += '\\"'; continue;
      }
      out += ch;
    } else {
      if (ch === '"') inString = true;
      out += ch;
    }
  }
  return out;
}

function extractJSON(text: string): any {
  let raw = text.trim();
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) raw = fenceMatch[1].trim();
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first !== -1 && last !== -1) raw = raw.slice(first, last + 1);
  try {
    return JSON.parse(raw);
  } catch {
    return JSON.parse(repairJSON(raw));
  }
}

// A response cut off by max_tokens is guaranteed-broken JSON — surface a
// clear, retryable message instead of "unexpected format".
function requireComplete(response: any, label: string) {
  if (response.stop_reason === "max_tokens") {
    throw new Error(`The ${label} ran long and was cut off. Please try again.`);
  }
}

// ---------------------------------------------------------------------------
// MODE: align — map assignment to specific standards from the teacher's SCOS
// ---------------------------------------------------------------------------
async function runAlign(body: any) {
  const { assignmentText, standardsText, subject, gradeLevel } = body;
  if (!standardsText?.trim()) throw Object.assign(new Error("No standards document provided. Upload your SCOS first."), { status: 400 });

  const system = `You are Socrates, an expert in standards alignment for grades 6-12.
You map assignments to the SPECIFIC standards in the teacher's uploaded standards
document. You NEVER invent standard codes. Every standard you cite must appear
verbatim in the provided standards text. If you cannot find a genuine match, say so
honestly rather than forcing one.`;

  const userMessage = `STANDARDS DOCUMENT (teacher's uploaded SCOS — the ONLY valid source of standard codes):
"""
${String(standardsText).substring(0, 24000)}
"""

ASSIGNMENT:
"""
${String(assignmentText).substring(0, 6000)}
"""
${subject ? `SUBJECT: ${subject}` : ""}
${gradeLevel ? `GRADE LEVEL: ${gradeLevel}` : ""}

Identify the 2-5 standards from the document above that this assignment MOST directly
addresses. For each: quote the exact standard code and its text from the document, and
explain the connection in one sentence. Also flag (in "gaps") any part of the assignment
that addresses no listed standard, and (in "nearMisses") 0-2 standards the assignment
COULD address with a small modification.

Return ONLY a single valid JSON object, no markdown, no commentary:
{
  "alignedStandards": [ { "code": "exact code from document", "text": "standard text from document", "connection": "one sentence" } ],
  "gaps": "one sentence, or empty string",
  "nearMisses": [ { "code": "...", "text": "...", "suggestion": "small modification that would address it" } ]
}
Do NOT use double-quote characters (") inside any string value — use single quotes (') instead.`;

  const stream = client.messages.stream({
    model: "claude-haiku-4-5",
    max_tokens: 1500,
    system,
    messages: [{ role: "user", content: userMessage }],
  });
  const response = await withTimeout(stream.finalMessage(), 26000, "Alignment request");
  requireComplete(response, "standards alignment");
  await logGen(body, "align", response);
  const textBlock = response.content.find(b => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Empty response from alignment model");
  return extractJSON(textBlock.text);
}

// ---------------------------------------------------------------------------
// MODE: lesson_plan — SCOE CCSS-Aligned template (active since July 12 2026;
// the Section I-VI AI-integrated template it replaced is kept in
// research-base.ts for restorability)
// ---------------------------------------------------------------------------
async function runLessonPlan(body: any) {
  const { assignmentText, alignedStandards, permissionCategory, subject, gradeLevel } = body;

  const standardsBlock = Array.isArray(alignedStandards) && alignedStandards.length > 0
    ? alignedStandards.map((s: any) => `${s.code}: ${s.text}`).join("\n")
    : "No standards alignment provided — write the standards element using clear placeholder language the teacher can fill in (e.g., '[Insert your state standard code]'), and note that uploading a standards document enables automatic alignment.";

  const system = `You are Socrates, an expert lesson planner for grades 6-12.
You generate lesson plans that follow the school's template EXACTLY. You never skip,
rename, merge, or reorder elements.

PEDAGOGICAL FRAMEWORKS (these must visibly shape the plan):
${FRAMEWORKS}

${PERMISSION_CATEGORIES}

${SCOE_LESSON_PLAN_TEMPLATE}`;

  const userMessage = `Generate a complete lesson plan for this assignment.

ASSIGNMENT (this drives Activities/Tasks):
"""
${String(assignmentText).substring(0, 6000)}
"""

ALIGNED STANDARDS (these go in "standards", verbatim):
${standardsBlock}

TEACHER'S CHOSEN AI PERMISSION CATEGORY (weave its rules into Activities/Tasks): ${permissionCategory || "Not specified — default to 'AI as Feedback Partner' and note the teacher can change it."}
${subject ? `SUBJECT: ${subject}` : ""}
${gradeLevel ? `GRADE LEVEL: ${gradeLevel}` : ""}

Requirements:
- Fill EVERY element of the template.
- Activities/Tasks must be built directly from the assignment text above and must
  state plainly how AI may or may not be used per the permission category.
- Modifications/Accommodations must be specific (not "provide support as needed").
- shiftReflection: name ONE CCSS instructional shift this lesson reflects and 1-2
  sentences on how.
- reflectionQuestion: choose the ONE question from the template's reflection list
  that best fits this lesson, copied VERBATIM. reflectionAnswer: 2-3 sentences
  answering it in ANTICIPATED terms (how the lesson is designed to achieve it) —
  it is normally answered after teaching, so write it as expectation, not report.
- BE CONCISE — this matters: 1-3 tight sentences per element (Activities/Tasks may
  use up to 5 short numbered steps). Total under 700 words. Long plans get cut off and fail.
- PLAIN TEXT ONLY — never use markdown syntax (no ** for bold, no #, no * bullets).
  Use plain numbered lists (1. 2. 3.) and dashes (-) only. Asterisks show up as
  garbage characters in the printed document.

Return ONLY a single valid JSON object, no markdown fences, no commentary:
{
  "lessonPlan": {
    "lessonTitle": "short lesson title",
    "subjects": "subject(s), from context",
    "grade": "grade level, from context",
    "standards": "Learning Standard(s) Addressed",
    "targets": "Learning Target(s)",
    "relevance": "Relevance/Rationale",
    "assessment": "Formative Assessment Criteria for Success",
    "activities": "Activities/Tasks (numbered steps, incl. the AI rules)",
    "resources": "Resources/Materials",
    "accessForAll": "Access for All",
    "modifications": "Modifications/Accommodations",
    "shiftReflection": "which CCSS shift this lesson reflects and how",
    "reflectionQuestion": "the one chosen reflection question, verbatim",
    "reflectionAnswer": "2-3 sentence anticipated answer"
  }
}
Use \\n for line breaks inside content strings. Do NOT use double-quote characters (") inside any content value — if you need quotation marks, use single quotes (') instead.`;

  const stream = client.messages.stream({
    model: "claude-haiku-4-5",
    max_tokens: 3000,
    system,
    messages: [{ role: "user", content: userMessage }],
  });
  const response = await withTimeout(stream.finalMessage(), 26000, "Lesson plan request");
  requireComplete(response, "lesson plan");
  await logGen(body, "lesson_plan", response);
  const textBlock = response.content.find(b => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Empty response from lesson plan model");
  return extractJSON(textBlock.text);
}

// ---------------------------------------------------------------------------
// MODE: directions — student-facing directions for the final assignment
// ---------------------------------------------------------------------------
async function runDirections(body: any) {
  const { assignmentText, permissionCategory, gradeLevel } = body;

  const system = `You are Socrates. You write clear, encouraging, student-facing assignment
directions for grades 6-12. You write TO the student, at their reading level, never
about them. You never use teacher jargon (no "formative," "scaffold," "differentiation").

${PERMISSION_CATEGORIES}`;

  const userMessage = `Write student-facing directions for this assignment.

ASSIGNMENT:
"""
${String(assignmentText).substring(0, 6000)}
"""

AI PERMISSION CATEGORY FOR THIS ASSIGNMENT: ${permissionCategory || "AI as Feedback Partner"}
${gradeLevel ? `GRADE LEVEL: ${gradeLevel}` : ""}

Requirements:
- Numbered steps a student can follow without asking the teacher what to do.
- A clearly labeled "Using AI on this assignment" section that translates the
  permission category into plain student language: exactly what IS allowed, what is
  NOT allowed, and how to cite/disclose AI help if the category requires it.
- A short "How you'll be graded" section (plain language, no rubric jargon).
- Reading level appropriate to the grade. Warm but direct tone.
- PLAIN TEXT ONLY — never use markdown syntax (no ** for bold, no #). Plain numbered
  lists and dashes only.

Return ONLY a single valid JSON object:
{
  "studentDirections": {
    "title": "short assignment title",
    "steps": "numbered steps as one string with \\n line breaks",
    "aiRules": "the Using AI section as one string",
    "grading": "the How you'll be graded section as one string"
  }
}
Use \\n for line breaks. Do NOT use double-quote characters (") inside any string value — use single quotes (') instead.`;

  const stream = client.messages.stream({
    model: "claude-haiku-4-5",
    max_tokens: 1200,
    system,
    messages: [{ role: "user", content: userMessage }],
  });
  const response = await withTimeout(stream.finalMessage(), 26000, "Directions request");
  requireComplete(response, "student directions");
  await logGen(body, "directions", response);
  const textBlock = response.content.find(b => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Empty response from directions model");
  return extractJSON(textBlock.text);
}

// ---------------------------------------------------------------------------
// MODE: refine — revise the selected redesign per the teacher's request,
// BEFORE the lesson plan is generated. Small, cheap call: it rewrites one
// assignment, not the whole analysis.
// ---------------------------------------------------------------------------
async function runRefine(body: any) {
  const { assignmentText, instruction, subject, gradeLevel } = body;
  if (!instruction?.trim()) throw Object.assign(new Error("Tell SocratesIQ what you'd like changed."), { status: 400 });

  const system = `You are Socrates, an expert instructional designer. A teacher has a
redesigned assignment and wants a specific change made. Apply EXACTLY the requested
change while preserving everything else: the topic, the learning goal, the
AI-resilience features (personal/local evidence, process steps, in-class components),
the grade-appropriate voice, and roughly the same length. Do not add unrequested
sections. PLAIN TEXT ONLY — no markdown (**, #, * bullets); plain numbered lists and
dashes only.`;

  const userMessage = `CURRENT ASSIGNMENT:
"""
${String(assignmentText).substring(0, 6000)}
"""

TEACHER'S REQUESTED CHANGE: ${String(instruction).substring(0, 500)}
${subject ? `SUBJECT: ${subject}` : ""}
${gradeLevel ? `GRADE LEVEL: ${gradeLevel}` : ""}

Rewrite the assignment with that change applied. Keep it classroom-ready and hand-out
complete. Return ONLY a single valid JSON object, no markdown fences, no commentary:
{ "revisedAssignment": "the full revised assignment text" }
Use \\n for line breaks. Do NOT use double-quote characters (") inside the value — use single quotes (') instead.`;

  const stream = client.messages.stream({
    model: "claude-haiku-4-5",
    max_tokens: 1500,
    system,
    messages: [{ role: "user", content: userMessage }],
  });
  const response = await withTimeout(stream.finalMessage(), 26000, "Revision request");
  requireComplete(response, "revision");
  await logGen(body, "refine", response);
  const textBlock = response.content.find(b => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Empty response from revision model");
  return extractJSON(textBlock.text);
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export default async function handler(req: Request) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") return new Response("", { status: 204, headers });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }), { status: 500, headers });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers });
  }

  const { mode, assignmentText } = body;
  if (!assignmentText || typeof assignmentText !== "string" || !assignmentText.trim()) {
    return new Response(JSON.stringify({ error: "No assignment text provided" }), { status: 400, headers });
  }

  try {
    let result;
    if (mode === "align") result = await runAlign(body);
    else if (mode === "lesson_plan") result = await runLessonPlan(body);
    else if (mode === "directions") result = await runDirections(body);
    else if (mode === "refine") result = await runRefine(body);
    else {
      return new Response(JSON.stringify({ error: `Unknown mode: ${mode}. Use align, lesson_plan, or directions.` }), { status: 400, headers });
    }
    return new Response(JSON.stringify(result), { status: 200, headers });
  } catch (e: any) {
    const detail = e?.error?.error?.message || e?.message || String(e);
    console.error(`generate(${mode}) failed:`, detail);
    if (e?.status === 400) {
      return new Response(JSON.stringify({ error: detail }), { status: 400, headers });
    }
    if (detail.includes("JSON")) {
      return new Response(JSON.stringify({ error: "The result came back in an unexpected format. Please try again." }), { status: 502, headers });
    }
    const isTimeout = e?.name === "APIConnectionTimeoutError" || /timeout|timed out|aborted/i.test(detail);
    const status = isTimeout ? 504 : e?.status === 429 ? 429 : e?.status || 502;
    const message = isTimeout
      ? "This step took too long and timed out. Please try again."
      : e?.status === 429
        ? "The service is busy. Please try again in a moment."
        : `Generation error: ${detail}`;
    return new Response(JSON.stringify({ error: message }), { status, headers });
  }
}
