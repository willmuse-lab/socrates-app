import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import type { Handler, HandlerEvent } from "@netlify/functions";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const RESEARCH = {
  TRIPLE_A: `
Triple-A Framework (Anchor, Audit, Agency):

ANCHOR — Ground assignments in local/temporal context AI cannot replicate.
  · Classroom Anchor: References a specific class discussion, debate, unpublished handout, or classroom artifact.
  · Temporal Anchor: Tied to a current event, real-time data set, or "this week's" news.
  · Geographic/Community Anchor: Requires knowledge of the local school, city, or a named person from the community.

AUDIT — Shift evaluation from final product to visible process.
  · Revision Memo: Student must document why they changed specific sections between drafts.
  · Prompt History: Student submits their actual AI interaction log or search history as an appendix.
  · Failed Logic Reflection: Student explains what approaches did NOT work and why.

AGENCY — Integrate the student's own irreplaceable narrative.
  · Professional Lens: Student analyzes through the lens of their stated career aspiration.
  · Lived Experience: Student connects the topic to something they personally witnessed, believe, or have experienced.
  · Trajectory Synthesis: Student explains how this topic applies to their specific 5-year plan.

PROPRIETARY MATERIAL — Bespoke classroom artifacts (specific teacher handouts, seminar notes, unpublished data) that exist outside AI training sets.
`,

  BLOOMS: `
Bloom's Revised Taxonomy — Cognitive Levels for AI Resilience:
  · Remember (Score: 0-20): Recall facts, name, list, identify. Trivially AI-completable.
  · Understand (Score: 10-30): Summarize, explain, paraphrase. Very easy for AI.
  · Apply (Score: 25-50): Use knowledge in new situations, solve problems. Moderately AI-completable.
  · Analyze (Score: 40-65): Break apart, compare, contrast, distinguish patterns. AI-resistant when personal data required.
  · Evaluate (Score: 55-80): Make judgments using criteria, defend, critique. Strong resistance when student's own stance is required.
  · Create (Score: 65-90): Design, produce, compose, originate. Highly resistant when personal context and process are required.
`,

  SCORING: `
RESILIENCE SCORE RUBRIC (0-100):

0-30 — Fully AI-completable:
  No personalization required. AI answers with a single prompt. No local context, no process documentation.
  Diagnostic signal: Could this assignment appear verbatim on a public exam? If yes, score ≤ 30.

31-50 — Surface friction:
  One element adds minor friction (e.g., "write from a soldier's perspective") but AI can roleplay or approximate.
  Missing at least 2 of the 3 Triple-A elements. A determined student could outsource entirely to AI.

51-70 — Moderate resilience:
  Has 1-2 genuine Triple-A elements. AI could approximate with effort, but output would lack depth.
  A careful teacher could spot AI use. Some process documentation present but insufficient.

71-85 — Strong resilience:
  Multiple Triple-A elements working in combination. AI output would be detectably deficient.
  Process is documented, personal narrative is required, at least one temporal or community anchor present.

86-100 — Exceptional resilience:
  Requires documented process + genuine personal narrative + local/temporal anchoring in combination.
  AI can assist but cannot replace the student. Any AI-only submission would be obviously deficient.
  CALIBRATION NOTE: Fewer than 5% of traditional assignments achieve this range without intentional redesign.
`,

  AIAS: `
AI Assessment Scale (AIAS):
  L1 — No AI: Entirely student-generated in a controlled, monitored environment.
  L2 — AI Planning Only: AI for brainstorming or outlining only. Final submission 100% human.
  L3 — AI Collaboration: AI for editing; student submits Appendix of Original Work.
  L4 — AI Task Completion: AI completes core tasks; human provides critical evaluation.
  L5 — Full Co-design: Full collaboration with documented interaction history submitted alongside work.
`,

  RESEARCH_NOTES: `
Supporting Research:
  [UNESCO, 2023] — AI competency requires: human agency, ethics, inclusion, critical thinking, and creativity.
  [Bearman & Luckin, 2024] — Design for AI-evident tasks where AI use is visible and traceable.
  [Lodge et al., 2023] — Students who reflected on AI use performed significantly better on subsequent unaided tasks.
  [Mollick & Mollick, 2023] — Personal stakes are the single most effective AI-resilience strategy.
  [Cotton et al., 2024] — GPT-4 passes most undergraduate assessments; process-based assessment is the strongest counter.
  [Dehouche, 2021] — AI detection tools have high false-positive rates; design-based prevention is more reliable.
  [Zawacki-Richter et al., 2019] — Authentic assessment tied to lived experience is the most future-proof assessment design.
`,
};

interface Dimension {
  name: string;
  description: string;
}

interface AnalysisParams {
  text: string;
  aiPreference: string;
  dimensions: Dimension[];
  activeFramework: string;
  bloomsLevel: string;
  subject: string;
  gradeLevel: string;
  curriculumFramework: string;
}

function buildPrompt(params: AnalysisParams): string {
  const { text, aiPreference, dimensions, activeFramework, bloomsLevel, subject, gradeLevel, curriculumFramework } = params;

  const frameworkContent = activeFramework === "blooms"
    ? `ACTIVE FRAMEWORK: Bloom's Revised Taxonomy — target cognitive level: ${bloomsLevel}\n${RESEARCH.BLOOMS}`
    : `ACTIVE FRAMEWORK: Triple-A Framework\n${RESEARCH.TRIPLE_A}`;

  const dimensionList = activeFramework === "blooms"
    ? [
        { name: "Cognitive Level Alignment", description: `Does the assignment genuinely target ${bloomsLevel} or higher, or does it only appear to?` },
        { name: "AI Resistance at Level", description: `How easily can AI complete tasks at the ${bloomsLevel} cognitive level for this specific assignment?` },
        { name: "Higher-Order Scaffolding", description: "Are there explicit elements that push students beyond surface-level cognition?" },
        { name: "Evidence of Thinking", description: "Does the assignment require students to make their thinking process visible?" },
      ]
    : dimensions;

  const dimensionsText = dimensionList.map(d => `  · ${d.name}: ${d.description}`).join("\n");

  const preferenceLabel = aiPreference === "avoid"
    ? "Avoid AI — maximize human-only resilience. Suggest elements that make AI completion impossible."
    : aiPreference === "augment"
    ? "Augment with AI — structured AI use for brainstorming or research. Redesigns should channel AI use productively."
    : "Embrace AI — full AI literacy integration. Redesigns should require documented, critically-evaluated AI co-design.";

  const contextLines = [
    subject ? `Subject/Course: ${subject}` : null,
    gradeLevel ? `Grade Level: ${gradeLevel}` : null,
    `AI Strategy: ${preferenceLabel}`,
    curriculumFramework
      ? `\nTeacher's Curriculum Framework (use this to make suggestions curriculum-specific):\n${curriculumFramework.substring(0, 3000)}`
      : null,
  ].filter(Boolean).join("\n");

  return `${frameworkContent}

${RESEARCH.SCORING}

${RESEARCH.AIAS}

${RESEARCH.RESEARCH_NOTES}

ANALYSIS DIMENSIONS — score each on a 0-100 scale:
${dimensionsText}

TEACHER CONTEXT:
${contextLines || "No subject or grade level specified — provide general analysis."}

ASSIGNMENT TO ANALYZE:
"""
${text}
"""

INSTRUCTIONS:
1. Be honest and rigorous. Most traditional assignments score 10-40. Do not inflate scores.
2. Be specific to THIS assignment — reference the actual wording, not generic advice.
3. Generate three redesigns that progressively increase resilience:
   · Bronze: 1-2 targeted modifications implementable today, minimal prep time.
   · Silver: Meaningful restructuring adding process documentation and personal anchoring.
   · Gold (Socratic Transformation): Full redesign making AI-only completion impossible. Target 80+ resilience.
4. Each redesign must include complete assignment text (not just bullet points about changes).
5. Generate differentiated versions for each redesign level:
   · IEP: Same resilience goals with modified scaffolding and reduced cognitive load.
   · ELL: Language supports added (sentence starters, key vocabulary glossary, bilingual options if relevant).
   · Gifted: Extended complexity with additional challenge layers maintaining the resilience floor.
${curriculumFramework ? "6. Align suggestions to the teacher's curriculum framework above." : ""}

Return ONLY valid JSON — no markdown code fences, no explanation text, no commentary before or after. Exact schema:
{
  "resilienceScore": <integer 0-100>,
  "summary": "<2-3 sentences: what makes this assignment vulnerable, what it does well if anything, one high-priority action>",
  "aiFailureBreakdown": {
    "headline": "<one specific sentence about what AI fundamentally cannot do with this exact assignment>",
    "failures": [
      {
        "type": "<category name: e.g., 'No Local Anchoring', 'Missing Process Trail', 'Replaceable Perspective', 'Generic Prompt Susceptibility'>",
        "severity": "High" | "Medium" | "Low",
        "explanation": "<1-2 sentences specific to this assignment's wording — not generic advice>",
        "fix": "<one concrete, implementable modification with specific language to add>"
      }
    ]
  },
  "dimensions": [
    {
      "name": "<dimension name>",
      "score": <integer 0-100>,
      "explanation": "<2 sentences grounded in the specific assignment text>"
    }
  ],
  "suggestions": [
    {
      "level": "Bronze",
      "title": "<evocative 3-6 word title for this redesign strategy>",
      "description": "<1-2 sentences describing the core strategy and why it increases resilience>",
      "modifiedAssignment": "<complete assignment text — preserve original format and intent, add specific resilience elements inline>",
      "differentiatedVersions": {
        "iep": "<complete adapted assignment for IEP students>",
        "ell": "<complete adapted assignment for ELL students>",
        "gifted": "<complete extended assignment for gifted students>"
      }
    },
    {
      "level": "Silver",
      "title": "<title>",
      "description": "<description>",
      "modifiedAssignment": "<complete text>",
      "differentiatedVersions": { "iep": "<text>", "ell": "<text>", "gifted": "<text>" }
    },
    {
      "level": "Gold",
      "title": "<title>",
      "description": "<description>",
      "modifiedAssignment": "<complete text>",
      "differentiatedVersions": { "iep": "<text>", "ell": "<text>", "gifted": "<text>" }
    }
  ]
}`;
}

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let body: any;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const {
    text,
    aiPreference = "avoid",
    dimensions = [],
    activeFramework = "triple-a",
    bloomsLevel = "Analyze",
    subject = "",
    gradeLevel = "",
    curriculumFramework = "",
    userId,
  } = body;

  if (!text || typeof text !== "string" || text.trim().length < 20) {
    return { statusCode: 400, body: JSON.stringify({ error: "Assignment text is required (minimum 20 characters)." }) };
  }

  try {
    const prompt = buildPrompt({ text, aiPreference, dimensions, activeFramework, bloomsLevel, subject, gradeLevel, curriculumFramework });

    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 8192,
      system: `You are Socrates, an expert educational assessment analyst specializing in AI-resilient assignment design. Your role is to help teachers understand exactly how AI can complete their assignments and how to redesign them to prioritize genuine human learning, critical thinking, and personal narrative. You are rigorous, research-backed, and specific — you always reference the actual assignment text in your analysis. You respond ONLY with valid JSON, never with markdown code blocks or explanatory prose outside the JSON structure.`,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "";

    // Strip any accidental markdown code fences
    const jsonText = rawText
      .replace(/^```(?:json)?\s*/im, "")
      .replace(/\s*```\s*$/im, "")
      .trim();

    let result: any;
    try {
      result = JSON.parse(jsonText);
    } catch (parseErr) {
      console.error("JSON parse failed. Raw response start:", rawText.substring(0, 300));
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Analysis produced an unreadable response. Please try again." }),
      };
    }

    if (
      typeof result.resilienceScore !== "number" ||
      !Array.isArray(result.dimensions) ||
      !Array.isArray(result.suggestions) ||
      result.suggestions.length < 3
    ) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Analysis response is missing required fields. Please try again." }),
      };
    }

    // Clamp score to valid range
    result.resilienceScore = Math.max(0, Math.min(100, Math.round(result.resilienceScore)));

    // Optionally log to Supabase for research analytics
    if (supabase && userId) {
      supabase.from("analyses").insert({
        user_id: userId,
        subject: subject || null,
        grade_level: gradeLevel || null,
        framework: activeFramework,
        resilience_score: result.resilienceScore,
        ai_preference: aiPreference,
        created_at: new Date().toISOString(),
      }).then(() => {}); // Non-blocking
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    };
  } catch (err: any) {
    console.error("Analysis handler error:", err);
    const status = err?.status || 500;
    const msg = err?.message || "Internal server error";
    return { statusCode: status, body: JSON.stringify({ error: msg }) };
  }
};
