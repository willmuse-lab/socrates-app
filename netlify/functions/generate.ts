// ============================================================================
//  generate.ts — Socrates second-stage generation engine.
//  Three fast modes, called in sequence by the frontend so each stays well
//  inside the 26s function budget:
//    mode: "align"       → match assignment to uploaded SCOS standards
//    mode: "lesson_plan"  → Section I-VI lesson plan (template-locked)
//    mode: "directions"   → student-facing directions
// ============================================================================
import Anthropic from "@anthropic-ai/sdk";
import {
  FRAMEWORKS,
  AIAS_SCALE,
  PERMISSION_CATEGORIES,
  LESSON_PLAN_TEMPLATE,
} from "./_shared/research-base";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 27000, maxRetries: 0 });

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ]);
}

function extractJSON(text: string): any {
  let raw = text.trim();
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) raw = fenceMatch[1].trim();
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first !== -1 && last !== -1) raw = raw.slice(first, last + 1);
  return JSON.parse(raw);
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
}`;

  const stream = client.messages.stream({
    model: "claude-haiku-4-5",
    max_tokens: 1500,
    system,
    messages: [{ role: "user", content: userMessage }],
  });
  const response = await withTimeout(stream.finalMessage(), 24000, "Alignment request");
  const textBlock = response.content.find(b => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Empty response from alignment model");
  return extractJSON(textBlock.text);
}

// ---------------------------------------------------------------------------
// MODE: lesson_plan — Section I-VI template-locked lesson plan
// ---------------------------------------------------------------------------
async function runLessonPlan(body: any) {
  const { assignmentText, alignedStandards, permissionCategory, subject, gradeLevel } = body;

  const standardsBlock = Array.isArray(alignedStandards) && alignedStandards.length > 0
    ? alignedStandards.map((s: any) => `${s.code}: ${s.text}`).join("\n")
    : "No SCOS alignment provided — write Section I using clear placeholder language the teacher can fill in (e.g., '[Insert your state standard code]'), and note that uploading a standards document enables automatic alignment.";

  const system = `You are Socrates, an expert in AI-integrated lesson planning for grades 6-12.
You generate lesson plans that follow the research-locked template EXACTLY. You never
skip, rename, merge, or reorder sections.

PEDAGOGICAL FRAMEWORKS (these must visibly shape the plan):
${FRAMEWORKS}

${AIAS_SCALE}

${PERMISSION_CATEGORIES}

${LESSON_PLAN_TEMPLATE}`;

  const userMessage = `Generate a complete lesson plan for this redesigned assignment.

REDESIGNED ASSIGNMENT (this drives Section IV):
"""
${String(assignmentText).substring(0, 6000)}
"""

ALIGNED STANDARDS (these go in Section I, verbatim):
${standardsBlock}

TEACHER'S CHOSEN AI PERMISSION CATEGORY (this drives Section III): ${permissionCategory || "Not specified — default to 'AI as Feedback Partner' and note the teacher can change it."}
${subject ? `SUBJECT: ${subject}` : ""}
${gradeLevel ? `GRADE LEVEL: ${gradeLevel}` : ""}

Requirements:
- Follow the Section I-VI template EXACTLY, including the closing Teacher Reflection.
- Section III must name the chosen permission category and state the student's
  responsibility under it, per the framework definitions.
- Section V must apply the tiered AI disclosure framework (Baule Shift 5).
- Section VI formative check must cover BOTH subject AND AI-tool understanding.
- Keep each section concise and classroom-ready. Total length: what fits on ~2 pages.

Return ONLY a single valid JSON object, no markdown fences, no commentary:
{
  "lessonPlan": {
    "sectionI":  { "title": "Standards Alignment", "content": "..." },
    "sectionII": { "title": "Learning Objectives", "content": "..." },
    "sectionIII":{ "title": "AI Tool Integration", "content": "..." },
    "sectionIV": { "title": "Instructional Procedure", "content": "..." },
    "sectionV":  { "title": "Ethics & Integrity", "content": "..." },
    "sectionVI": { "title": "Assessment", "content": "..." },
    "teacherReflection": "..."
  }
}
Use \\n for line breaks inside content strings.`;

  const stream = client.messages.stream({
    model: "claude-haiku-4-5",
    max_tokens: 2200,
    system,
    messages: [{ role: "user", content: userMessage }],
  });
  const response = await withTimeout(stream.finalMessage(), 24000, "Lesson plan request");
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

Return ONLY a single valid JSON object:
{
  "studentDirections": {
    "title": "short assignment title",
    "steps": "numbered steps as one string with \\n line breaks",
    "aiRules": "the Using AI section as one string",
    "grading": "the How you'll be graded section as one string"
  }
}`;

  const stream = client.messages.stream({
    model: "claude-haiku-4-5",
    max_tokens: 1200,
    system,
    messages: [{ role: "user", content: userMessage }],
  });
  const response = await withTimeout(stream.finalMessage(), 24000, "Directions request");
  const textBlock = response.content.find(b => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Empty response from directions model");
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
