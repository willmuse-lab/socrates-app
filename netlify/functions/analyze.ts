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
- Bronze redesigns primarily strengthen ONE Triple-A pillar (usually Anchor). Silver redesigns strengthen TWO pillars (typically Anchor + Audit). Gold redesigns engage all THREE pillars (Anchor + Audit + Agency) and should raise the Ai-RACE cost of using AI above the cost of doing the work.
- Every aiFailureBreakdown fix must map to a named strategy category (A-G).

Ground every suggestion in the research above. Be concrete and classroom-ready: the modifiedAssignment text must be complete enough for a teacher to hand out as-is.`;

  const userMessage = `${frameworkContext}

SCORING DIMENSIONS (score each one individually):
${dimensionList || "- Anchor\n- Proprietary\n- Audit\n- Agency"}

TEACHER'S AI STRATEGY: ${PREFERENCE_CONTEXT[aiPreference] || PREFERENCE_CONTEXT.avoid}
${subject ? `SUBJECT: ${subject}` : ""}
${gradeLevel ? `GRADE LEVEL: ${gradeLevel}` : ""}

Analyze this assignment and produce a CONCISE result — brevity matters, long outputs time out:
1. resilienceScore (0-100) and a 1-2 sentence summary
2. aiFailureBreakdown: exactly 3 specific ways a student could shortcut this with AI (1-2 sentences each)
3. A score and a one-sentence explanation for each scoring dimension
4. Exactly three redesigns — Bronze (small practical tweak), Silver (substantial restructure), Gold (transformational) — each with a SHORT rewritten assignment (a redesigned prompt of roughly 3-6 sentences, NOT a long document) and a 1-2 sentence description. Each redesign must use a DIFFERENT strategy from the catalog and fit this subject and grade level; name the strategy category (A-G) in the description.

ASSIGNMENT TEXT:
"""
${text.substring(0, 8000)}
"""

OUTPUT FORMAT — return ONLY a single valid JSON object, no markdown, no code fences, no commentary before or after. Use exactly this shape:
{
  "resilienceScore": 0,
  "summary": "2-3 sentence overview",
  "aiFailureBreakdown": { "headline": "one sentence", "failures": [ { "type": "short name", "severity": "High|Medium|Low", "explanation": "what a student could do", "fix": "how to close the gap" } ] },
  "dimensions": [ { "name": "dimension name", "score": 0, "explanation": "why" } ],
  "suggestions": [ { "level": "Bronze|Silver|Gold", "title": "title", "description": "why it improves resilience", "modifiedAssignment": "the full rewritten assignment, ready to hand out" } ]
}
Include exactly 3 failures, one entry per scoring dimension, and exactly three suggestions (one Bronze, one Silver, one Gold). Keep every field concise.`;

  try {
    console.log("analyze v3: calling model");
    const stream = client.messages.stream({
      model: "claude-haiku-4-5",
      max_tokens: 2500,
      system,
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
      console.error("analyze v3: JSON parse failed");
      return new Response(JSON.stringify({ error: "The analysis came back in an unexpected format. Please try again." }), { status: 502, headers });
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
