import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import {
  FRAMEWORKS,
  AIAS_SCALE,
  PERMISSION_CATEGORIES,
  RESEARCH_NOTES,
  STRATEGY_CATALOG,
  SCORING_GUIDANCE,
} from "./_shared/research-base";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 27000, maxRetries: 0 });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;



async function fetchUploadedResearch(): Promise<string> {
  if (!supabase) return "";
  try {
    const { data, error } = await supabase.from("research_papers").select("title, authors, year, content").order("created_at", { ascending: false });
    if (error || !data || data.length === 0) return "";
    return data.map((paper: any) => `RESEARCH PAPER: ${paper.title}\nAuthors: ${paper.authors} (${paper.year})\n${paper.content.substring(0, 8000)}`).join("\n\n");
  } catch (e) {
    console.error("Failed to fetch research papers:", e);
    return "";
  }
}

const PREFERENCE_CONTEXT: Record<string, string> = {
  avoid: "MAXIMIZE AI resilience. Make it nearly impossible to complete without significant personal effort.",
  augment: "Use AI as a TOOL for brainstorming/research. Final output requires human synthesis and reflection.",
  embrace: "EMBRACE AI. Have students critique AI outputs or refine AI drafts. Document the collaboration.",
};

// The three redesigns (Bronze/Silver/Gold) are levels of INTENSITY, but their
// GOAL must follow the teacher's chosen strategy. Without this, every strategy
// produced the same "make it AI-proof" output. Bronze = light, Silver =
// substantial, Gold = transformational — all pursuing the strategy's goal.
const STRATEGY_GUIDANCE: Record<string, string> = {
  avoid:
    "GOAL: make the assignment resistant to AI completion so students must do genuine thinking AI cannot replicate. Bronze = a small practical tweak that closes the easiest AI shortcut. Silver = a substantial restructure that requires personal, local, or in-class evidence. Gold = a transformational redesign where using AI costs more effort than doing the work honestly (process artifacts, oral defense, in-class synthesis).",
  augment:
    "GOAL: openly PERMIT AI as a tool for brainstorming, research, or drafting, while requiring the student's own synthesis, judgment, and reflection for the final product. Do NOT try to block AI. Bronze = allow AI for one early step and require students to document and build on it. Silver = require AI-assisted research plus a human synthesis that clearly goes beyond what AI produced. Gold = a full workflow where students use AI as a thinking partner and are assessed on their reasoning, choices, and written reflection about that collaboration.",
  embrace:
    "GOAL: make AI a central object of study — students critique, fact-check, and improve AI outputs and document the collaboration. Do NOT try to block AI. Bronze = add a step where students evaluate an AI-generated answer for errors or bias. Silver = students iteratively refine an AI draft and justify each change. Gold = students produce and defend a final work that explicitly compares their own thinking to AI's, assessed on AI literacy and critical judgment.",
};

const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    resilienceScore: { type: "integer", description: "0-100 AI-resilience score per the scoring guidance" },
    summary: { type: "string", description: "2-3 sentence overview of the assignment's AI resilience" },
    aiFailureBreakdown: {
      type: "object",
      properties: {
        headline: { type: "string", description: "One-sentence headline summarizing how AI could shortcut this assignment" },
        failures: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", description: "Short name of the vulnerability, e.g. 'Generic prompt completion'" },
              severity: { type: "string", enum: ["High", "Medium", "Low"] },
              explanation: { type: "string", description: "What a student could do with AI" },
              fix: { type: "string", description: "How the teacher can close this gap" },
            },
            required: ["type", "severity", "explanation", "fix"],
            additionalProperties: false,
          },
        },
      },
      required: ["headline", "failures"],
      additionalProperties: false,
    },
    dimensions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Dimension name, matching the requested framework dimensions" },
          score: { type: "integer", description: "0-100 score for this dimension" },
          explanation: { type: "string" },
        },
        required: ["name", "score", "explanation"],
        additionalProperties: false,
      },
    },
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          level: { type: "string", enum: ["Bronze", "Silver", "Gold"] },
          title: { type: "string" },
          description: { type: "string", description: "Why this redesign improves resilience" },
          modifiedAssignment: { type: "string", description: "The complete rewritten assignment text, ready to hand to students" },
        },
        required: ["level", "title", "description", "modifiedAssignment"],
        additionalProperties: false,
      },
    },
  },
  required: ["resilienceScore", "summary", "aiFailureBreakdown", "dimensions", "suggestions"],
  additionalProperties: false,
} as const;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ]);
}

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

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers });
  }

  const { text, aiPreference = "avoid", dimensions = [], activeFramework = "triple-a", bloomsLevel = "Analyze", subject = "", gradeLevel = "" } = body;
  // The client splits one analysis into two parallel halves so each stays far
  // below the function time limit: "diagnosis" (score/failures/dimensions) and
  // "redesigns" (the three suggestions). Absent/unknown = full (backward compat).
  const part = body.part === "diagnosis" || body.part === "redesigns" ? body.part : "full";
  const wantDiagnosis = part !== "redesigns";
  const wantRedesigns = part !== "diagnosis";
  if (!text || typeof text !== "string" || !text.trim()) {
    return new Response(JSON.stringify({ error: "No assignment text provided" }), { status: 400, headers });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }), { status: 500, headers });
  }

  console.log("analyze v3: start");
  let uploadedResearch = "";
  try {
    uploadedResearch = await withTimeout(fetchUploadedResearch(), 6000, "Research lookup");
    console.log("analyze v3: research ok");
  } catch (e: any) {
    console.warn("analyze v3: research lookup skipped:", e?.message || e);
  }

  const dimensionList = (dimensions as { name: string; description: string }[])
    .map(d => `- ${d.name}: ${d.description}`)
    .join("\n");

  const frameworkContext = activeFramework === "blooms"
    ? `Use Bloom's Revised Taxonomy as the analysis framework. Target cognitive level: ${bloomsLevel}. Score how well the assignment demands genuine cognition at or above that level despite AI availability.`
    : `Use the Triple-A Framework (Anchor, Audit, Agency) as the analysis framework.`;

  const system = `You are Socrates, an expert in AI-resilient assignment design for K-12 and college educators. You analyze assignments for vulnerability to AI completion and redesign them so AI cannot replace genuine student thinking.

PEDAGOGICAL FRAMEWORKS:
${FRAMEWORKS}

AI ASSESSMENT SCALE (AIAS):
${AIAS_SCALE}

RESEARCH BASE:
${RESEARCH_NOTES}
${uploadedResearch ? `\nADDITIONAL UPLOADED RESEARCH:\n${uploadedResearch}\n` : ""}
SCORING GUIDANCE:
${SCORING_GUIDANCE}

REDESIGN STRATEGY CATALOG:
${STRATEGY_CATALOG}

${PERMISSION_CATEGORIES}

FRAMEWORK LOCKING RULES — these are requirements, not suggestions:
- Every dimension score's explanation must reference the specific framework criterion it measures (Triple-A pillar, Ai-RACE component, or Bloom's level) by name.
- The overall resilienceScore must be consistent with the scoring guidance bands, and the summary must state which framework elements are present or missing.
- Bronze, Silver, and Gold are levels of INTENSITY (light tweak, substantial restructure, transformational), and every redesign must pursue the TEACHER'S AI STRATEGY stated in the user message — do NOT default to maximizing AI-resistance unless the strategy is "Avoid". Bronze engages roughly ONE framework dimension, Silver about TWO, and Gold engages all THREE at the strategy's fullest expression.
- Every aiFailureBreakdown fix must map to a named strategy category (A-G).

Ground every suggestion in the research above. Be concrete and classroom-ready: the modifiedAssignment text must be complete enough for a teacher to hand out as-is.`;

  const userMessage = `${frameworkContext}

SCORING DIMENSIONS (score each one individually):
${dimensionList || "- Anchor\n- Proprietary\n- Audit\n- Agency"}

TEACHER'S AI STRATEGY — "${aiPreference}": ${PREFERENCE_CONTEXT[aiPreference] || PREFERENCE_CONTEXT.avoid}
HOW THE THREE REDESIGNS MUST APPLY THIS STRATEGY: ${STRATEGY_GUIDANCE[aiPreference] || STRATEGY_GUIDANCE.avoid}
${subject ? `SUBJECT: ${subject}` : ""}
${gradeLevel ? `GRADE LEVEL: ${gradeLevel}` : ""}

Analyze this assignment and produce a CONCISE result — brevity matters, long outputs time out:
${wantDiagnosis ? `1. resilienceScore (0-100) and a 1-2 sentence summary
2. aiFailureBreakdown: exactly 3 specific ways a student could shortcut this with AI (1-2 sentences each)
3. A score and a one-sentence explanation for each scoring dimension` : ""}
${wantRedesigns ? `${wantDiagnosis ? "4" : "1"}. Exactly three redesigns — Bronze (small practical tweak), Silver (substantial restructure), Gold (transformational) — each a rewritten assignment a teacher could hand out tomorrow.
   QUALITY BAR — this is what makes the redesign worth paying for. Each rewritten assignment MUST:
   - Be CONCRETE, not abstract. Specify the actual activity, the timing/structure (e.g. "a 15-minute in-class debate", "a 3-round peer exchange"), and the exact deliverable the student turns in. NEVER use vague verbs like "incorporate discussion", "add reflection", or "encourage critical thinking" without saying precisely how.
   - Be grounded in THIS classroom: require at least one thing that can only come from the student's own class, week, life, or self-found evidence (a named classmate, an in-class artifact, a screenshot they captured, a specific local example) — something that cannot be produced by a chatbot alone.
   - Fit the SUBJECT and GRADE LEVEL${subject ? ` (${subject})` : ""}${gradeLevel ? ` at ${gradeLevel}` : ""} in vocabulary, complexity, and expectations — a redesign for young students must read differently from one for advanced students.
   - Preserve the teacher's original topic and learning goal — improve HOW it's done, don't replace WHAT it teaches.
   - Be realistically SHORT to complete: the whole redesigned assignment must fit within ONE class period (Gold may use at most two). NEVER spread the work across days or weeks, and never write a multi-week or "Week 1 / Week 2 / Day 1" timeline. Keep it to what a student can finish in a class or two.
   Length: Bronze ~3-4 sentences, Silver ~4-6, Gold ~5-7 — specific and usable but TIGHT; every sentence must add a concrete detail, no filler. Give a 1-sentence description of the concrete change.
   Every redesign MUST pursue the teacher's AI strategy and its per-level guidance above (a "${aiPreference}" assignment, not a generic AI-proof one). Each redesign must use a DIFFERENT strategy from the catalog; name the strategy category (A-G) in the description.` : ""}

ASSIGNMENT TEXT:
"""
${text.substring(0, 8000)}
"""

OUTPUT FORMAT — return ONLY a single valid JSON object, no markdown, no code fences, no commentary before or after. Use exactly this shape:
{
${wantDiagnosis ? `  "resilienceScore": 0,
  "summary": "2-3 sentence overview",
  "aiFailureBreakdown": { "headline": "one sentence", "failures": [ { "type": "short name", "severity": "High|Medium|Low", "explanation": "what a student could do", "fix": "how to close the gap" } ] },
  "dimensions": [ { "name": "dimension name", "score": 0, "explanation": "why" } ]${wantRedesigns ? "," : ""}` : ""}
${wantRedesigns ? `  "suggestions": [ { "level": "Bronze|Silver|Gold", "title": "title", "description": "how it applies the teacher's chosen AI strategy", "modifiedAssignment": "the full rewritten assignment, ready to hand out" } ]` : ""}
}
${wantDiagnosis ? "Include exactly 3 failures and one entry per scoring dimension. " : ""}${wantRedesigns ? "Include exactly three suggestions (one Bronze, one Silver, one Gold). " : ""}Keep every field concise. Do NOT use double-quote characters (") inside any string value — use single quotes (') instead.`;

  try {
    console.log("analyze v3: calling model");
    const stream = client.messages.stream({
      model: "claude-haiku-4-5",
      max_tokens: part === "diagnosis" ? 1100 : part === "redesigns" ? 1800 : 2500,
      // Cache the large, identical system prompt (research base + catalog) so
      // repeat/re-analyses reuse it at ~0.1x cost instead of re-sending it every
      // time — cuts token load and eases rate-limit pressure from the two-call split.
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userMessage }],
    });
    const response = await withTimeout(stream.finalMessage(), 26000, "Model request");
    console.log("analyze v3: model returned");

    if (response.stop_reason === "refusal") {
      return new Response(JSON.stringify({ error: "The analysis was declined. Please check the assignment text and try again." }), { status: 422, headers });
    }

    const textBlock = response.content.find(b => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return new Response(JSON.stringify({ error: "Empty response from analysis model" }), { status: 502, headers });
    }

    // The model returns JSON as text; strip any code fences and isolate the object.
    let raw = textBlock.text.trim();
    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch) raw = fenceMatch[1].trim();
    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    if (first !== -1 && last !== -1) raw = raw.slice(first, last + 1);

    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      try {
        // Repair literal control characters inside string values, the most
        // common cause of model-JSON parse failures.
        let repaired = "", inString = false;
        for (let i = 0; i < raw.length; i++) {
          const ch = raw[i];
          if (inString) {
            if (ch === "\\") { repaired += ch + (raw[i + 1] ?? ""); i++; continue; }
            if (ch === "\n") { repaired += "\\n"; continue; }
            if (ch === "\r") continue;
            if (ch === "\t") { repaired += "\\t"; continue; }
            if (ch === '"') {
              // Close the string only if the next non-space char is a
              // structural delimiter; otherwise escape a stray inner quote.
              let j = i + 1;
              while (j < raw.length && (raw[j] === " " || raw[j] === "\n" || raw[j] === "\r" || raw[j] === "\t")) j++;
              const next = raw[j];
              if (next === undefined || next === "," || next === "}" || next === "]" || next === ":") {
                inString = false; repaired += ch; continue;
              }
              repaired += '\\"'; continue;
            }
            repaired += ch;
          } else {
            if (ch === '"') inString = true;
            repaired += ch;
          }
        }
        result = JSON.parse(repaired);
      } catch {
        console.error("analyze v3: JSON parse failed");
        return new Response(JSON.stringify({ error: "The analysis came back in an unexpected format. Please try again." }), { status: 502, headers });
      }
    }
    console.log("analyze v3: done");
    return new Response(JSON.stringify(result), { status: 200, headers });
  } catch (e: any) {
    const detail = e?.error?.error?.message || e?.message || String(e);
    console.error("Analysis failed:", detail);
    const isTimeout = e?.name === "APIConnectionTimeoutError" || /timeout|timed out|aborted/i.test(detail);
    const status = isTimeout ? 504 : e?.status === 429 ? 429 : e?.status || 502;
    const message = isTimeout
      ? "The analysis took too long and timed out. Please try again, or with a shorter assignment."
      : e?.status === 429
        ? "The analysis service is busy. Please try again in a moment."
        : `Analysis error: ${detail}`;
    return new Response(JSON.stringify({ error: message }), { status, headers });
  }
}
