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
  These are summarized findings from researchers and bodies working on AI and assessment.
  (To add a source: copy a line below, paste it, and edit the bracket and the takeaway.)

  [UNESCO, 2023] — AI competency requires: human agency, ethics, inclusion, critical thinking, and creativity.
  [Bearman & Luckin, 2024] — Design for AI-evident tasks where AI use is visible and traceable.
  [Lodge et al., 2023] — Students who reflected on AI use performed significantly better on subsequent unaided tasks.
  [Mollick & Mollick, 2023] — Personal stakes are the single most effective AI-resilience strategy.
  [Dawson, 2021 — Defending Assessment Security] — Security comes from authentic conditions and verification, not surveillance; design for "programmatic" assessment across a course, not one locked-down task.
  [TEQSA / Lodge, 2024 — Two-Lane approach] — Use a mix: Lane 1 secures judgement of learning under controlled conditions (oral, in-class, supervised); Lane 2 openly integrates AI with documented process.
  [Sarah Elaine Eaton, 2023 — postplagiarism] — In a hybrid human-AI writing world, shift from catching misuse to teaching transparent attribution and disclosure of AI use.
  [Liu & others, Univ. Sydney, 2023] — Move assessment along a continuum from "AI-proof" secured tasks to "AI-assisted" tasks; match the security to the stakes.
  [Bearman, Boud & Dawson — CRADLE] — Authentic assessment ties tasks to real-world performance, professional standards, and contexts a generic AI answer cannot satisfy.
  [Bloom's Revised Taxonomy — Anderson & Krathwohl] — Push tasks up the cognitive ladder: evaluate, create, and critique rather than remember and summarize.
  [Universal Design for Learning — CAST] — Offer multiple means of expression (audio, video, demonstration, build) so the deliverable itself resists text generation.
  [Self-regulated learning — Zimmerman] — Require planning, monitoring, and reflection artifacts; the learning lives in the visible process.
  [Ethics of care / student trust — research consensus] — Punitive AI detection erodes trust and is unreliable; redesign beats policing.
  [Sperber, MacArthur, Minnillo, Stillman & Whithaus, 2025 — PAIRR, Computers and Composition 76, 102921] — Peer and AI Review + Reflection: students get formative feedback from BOTH a peer and an AI on a draft, then write a reflection comparing and reconciling the two. Keeps revision human-centered, treats AI as one voice among many rather than the author, and makes the student's judgement (which feedback to accept and why) the assessed artifact.

  ADD NEW RESEARCH BELOW THIS LINE:
  `,
  STRATEGY_CATALOG: `
  A palette of DISTINCT redesign moves. Draw from ACROSS these categories so suggestions vary —
  do not default to the same two or three moves on every assignment.

  A. LOCALIZE & ANCHOR
     - Tie the task to this week's class discussion, a specific lecture, or a shared classroom text/handout.
     - Require current/local data (this semester's, this town's, this year's) that postdates or sits outside training data.
     - Reference a guest speaker, field trip, lab result, or in-class experiment.

  B. SURFACE THE PROCESS
     - Require a revision history, draft timeline, or version comparison.
     - Ask for a "prompt log" + reflection on where AI was wrong or unhelpful.
     - Require annotated sources or a research trail showing how conclusions were reached.

  C. MAKE IT PERSONAL & APPLIED
     - Connect to the student's own life, goals, community, or chosen career lens.
     - Require an interview, primary observation, or original data the student collected.
     - Ask students to apply a concept to a situation only they have access to.

  D. CHANGE THE MEDIUM (UDL)
     - Replace or supplement the essay with an oral defense, recorded explanation, build, demo, or visual.
     - Require an in-class or live component (Socratic seminar, whiteboard work, peer teaching).
     - Use a portfolio assembled over time rather than a single submission.

  E. CRITIQUE & EVALUATE AI (embrace lane)
     - Have students generate an AI draft, then critique, fact-check, and correct it with citations.
     - Compare two AI outputs and argue which is stronger and why.
     - Require students to find and document the AI's errors or blind spots on the topic.
     - PAIRR (Peer + AI Review + Reflection): students get feedback on a draft from BOTH a peer and an AI, then write a reflection reconciling the two and justifying which revisions they accepted — the reflection is the graded artifact.

  F. RAISE THE COGNITIVE BAR (Bloom's)
     - Shift from summary/recall to synthesis, evaluation, design, or argument under constraints.
     - Add a counter-argument, trade-off analysis, or "defend the weaker position" requirement.
     - Require transfer: apply the idea to a novel, unfamiliar context.

  G. COLLABORATIVE & ITERATIVE
     - Build in peer review with documented feedback the student must respond to.
     - Stage the assignment across checkpoints with instructor touchpoints.
     - Require a group artifact plus an individual reflection on their specific contribution.
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

REDESIGN STRATEGY CATALOG:
${RESEARCH_BASE.STRATEGY_CATALOG}

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

VARIETY REQUIREMENTS (important):
- The three redesigns must each use a DIFFERENT strategy from the catalog — do not anchor all three on the same idea (e.g. do not make every tier "add personal reflection"). Pick from different lettered categories (A–G).
- Tailor moves to THIS subject and grade level. A math task, a lab report, and an essay should get visibly different suggestions — not the same generic advice.
- Favor strategies that fit the specific assignment over the most common ones. If you reach for a personal-narrative or local-context move, make sure it genuinely fits; otherwise choose another category.
- In each redesign's description, name which strategy category (A–G) it draws on so the variety is visible.

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
