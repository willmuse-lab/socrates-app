import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import type { Handler, HandlerEvent } from "@netlify/functions";

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
  - 71-85: Strong resilience. Multiple a
