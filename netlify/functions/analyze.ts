import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const RESEARCH_BASE = {
  FRAMEWORKS: `
1. Triple-A Framework (Anchor, Audit, Agency)
   - Anchor: Ground assignments in local/temporal context AI cannot replicate.
   - Audit: Shift focus from final product to process — require revision memos, prompt histories, or failed logic reflections.
   - Agency: Integrate the student's own narrative — professional lens, lived experience, or personal trajectory that is impossible to fake.

2. Proprietary Material Principle
   - Assignments referencing bespoke classroom artifacts exist outside AI training data and cannot be completed by AI alone.

3. Process-Product Assessment
   - Evaluate the steps taken, not just the final output.
  `,
  AIAS_SCALE: `
   Level 1 — No AI: Entirely student-generated in a controlled environment.
   Level 2 — AI Planning Only: AI for brainstorming/outlining only. Final submission 100% human.
   Level 3 — AI Collaboration: AI for editing; students submit Appendix of Original Work.
   Level 4 — AI Task Completion: AI completes core tasks; human provides critical evaluation.
   Level 5 — Full Human-AI Co-design: Full collaboration with documented interaction history.
  `,
  RESEARCH_NOTES: `
  [UNESCO, 2023] — AI competency requires: human agency, ethics, inclusion, critical thinking, and creativity.
  [Bearman & Luckin, 2024] — Design for AI-evident tasks where AI use is visible and traceable.
  [Lodge et al., 2023] — Students who reflected on AI use performed significantly better on subsequent unaided tasks.
  [Mollick & Mollick, 2023] — Personal stakes are the single most effective AI-resilience strategy.

  ADD NEW RESEARCH BELOW THIS LINE:
  `,
  SCORING_GUIDANCE: `
  - 0-30: Completable by AI with a single prompt.
  - 31-50: Some friction but still largely AI-completable.
  - 51-70: Moderate resilience. Has 1-2 Triple-A elements but gaps remain.
  - 71-85: Strong resilience. Multiple anchors, process requirement, personal element.
  - 86-100: Exceptional. AI can assist but cannot replace the student.
  `,
};

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
          differentiatedVersions: {
            type: "object",
            properties: {
              iep: { type: "string", description: "IEP/504 version: scaffolded, sentence starters, simplified structure" },
              ell: { type: "string", description: "ELL version: defined terms, reduced idioms, added context" },
              gifted: { type: "string", description: "Gifted/advanced version: extended complexity, higher-order thinking" },
            },
            required: ["iep", "ell", "gifted"],
            additionalProperties: false,
          },
        },
        required: ["level", "title", "description", "modifiedAssignment", "differentiatedVersions"],
        additionalProperties: false,
      },
    },
  },
  required: ["resilienceScore", "summary", "aiFailureBreakdown", "dimensions", "suggestions"],
  additionalProperties: false,
} as const;

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

  const uploadedResearch = await fetchUploadedResearch();

  const dimensionList = (dimensions as { name: string; description: string }[])
    .map(d => `- ${d.name}: ${d.description}`)
    .join("\n");

  const frameworkContext = activeFramework === "blooms"
    ? `Use Bloom's Revised Taxonomy as the analysis framework. Target cognitive level: ${bloomsLevel}. Score how well the assignment demands genuine cognition at or above that level despite AI availability.`
    : `Use the Triple-A Framework (Anchor, Audit, Agency) as the analysis framework.`;

  const system = `You are Socrates, an expert in AI-resilient assignment design for K-12 and college educators. You analyze assignments for vulnerability to AI completion and redesign them so AI cannot replace genuine student thinking.

PEDAGOGICAL FRAMEWORKS:
${RESEARCH_BASE.FRAMEWORKS}

AI ASSESSMENT SCALE (AIAS):
${RESEARCH_BASE.AIAS_SCALE}

RESEARCH BASE:
${RESEARCH_BASE.RESEARCH_NOTES}
${uploadedResearch ? `\nADDITIONAL UPLOADED RESEARCH:\n${uploadedResearch}\n` : ""}
SCORING GUIDANCE:
${RESEARCH_BASE.SCORING_GUIDANCE}

Ground every suggestion in the research above. Be concrete and classroom-ready: the modifiedAssignment text must be complete enough for a teacher to hand out as-is.`;

  const userMessage = `${frameworkContext}

SCORING DIMENSIONS (score each one individually):
${dimensionList || "- Anchor\n- Proprietary\n- Audit\n- Agency"}

TEACHER'S AI STRATEGY: ${PREFERENCE_CONTEXT[aiPreference] || PREFERENCE_CONTEXT.avoid}
${subject ? `SUBJECT: ${subject}` : ""}
${gradeLevel ? `GRADE LEVEL: ${gradeLevel}` : ""}

Analyze this assignment and produce:
1. resilienceScore (0-100) and a summary
2. aiFailureBreakdown: 3-5 specific ways a student could use AI to shortcut this assignment
3. A score and explanation for each scoring dimension
4. Exactly three redesigns — Bronze (small practical tweak), Silver (substantial restructure), Gold (transformational redesign) — each with a complete rewritten assignment and IEP/ELL/gifted differentiated versions tailored to the subject and grade level

ASSIGNMENT TEXT:
"""
${text.substring(0, 24000)}
"""`;

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 16000,
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: ANALYSIS_SCHEMA },
      },
      system,
      messages: [{ role: "user", content: userMessage }],
    });

    if (response.stop_reason === "refusal") {
      return new Response(JSON.stringify({ error: "The analysis was declined. Please check the assignment text and try again." }), { status: 422, headers });
    }

    const textBlock = response.content.find(b => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return new Response(JSON.stringify({ error: "Empty response from analysis model" }), { status: 502, headers });
    }

    const result = JSON.parse(textBlock.text);
    return new Response(JSON.stringify(result), { status: 200, headers });
  } catch (e: any) {
    console.error("Analysis failed:", e);
    const status = e?.status === 429 ? 429 : 502;
    const message = e?.status === 429
      ? "The analysis service is busy. Please try again in a moment."
      : "Analysis failed. Please try again.";
    return new Response(JSON.stringify({ error: message }), { status, headers });
  }
}
