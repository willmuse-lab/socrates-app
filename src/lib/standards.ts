// ============================================================================
//  standards.ts — client-side types + Supabase CRUD for SCOS documents, and
//  the three-step generation API (align → lesson plan → student directions).
// ============================================================================
import { supabaseEnabled } from './supabase';

// The supabase.ts module keeps its client private, so we create our own the
// same lazy way. (If you later export getClient from supabase.ts, use that.)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
let _sb: any = null;
async function getClient() {
  if (!supabaseEnabled) return null;
  if (_sb) return _sb;
  const { createClient } = await import('@supabase/supabase-js');
  _sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _sb;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface StandardsDocument {
  id: string;
  title: string;
  state: string;
  subject: string;
  grade_level: string;
  filename: string;
  content: string;
  created_at: string;
}

export interface AlignedStandard {
  code: string;
  text: string;
  connection: string;
}

export interface AlignmentResult {
  alignedStandards: AlignedStandard[];
  gaps: string;
  nearMisses: { code: string; text: string; suggestion: string }[];
}

// SocratesIQ lesson plan (CCSS-aligned template, corrected version July 12
// 2026): eight elements + a blank "Notes" column in the exports.
export interface LessonPlan {
  lessonTitle?: string;
  subjects?: string;
  grade?: string;
  /** Filled CLIENT-SIDE from the teacher's profile — never sent to the model. */
  teacher?: string;
  school?: string;
  standards: string;
  targets: string;
  relevance: string;
  assessment: string;
  activities: string;
  resources: string;
  accessForAll: string;
  modifications: string;
  shiftReflection?: string;
  /** The ONE template reflection question the model chose, and its anticipated answer. */
  reflectionQuestion?: string;
  reflectionAnswer?: string;
}

export interface StudentDirections {
  title: string;
  steps: string;
  aiRules: string;
  grading: string;
}

// The teacher's single AI choice, made once at the start (keys unchanged for
// backward compatibility). Since July 13 2026 this ONE choice drives the whole
// workflow — analysis, redesigns, lesson plan, and student directions —
// replacing the old six permission categories (kept below, dormant).
export type AIStrategyKey = 'avoid' | 'augment' | 'embrace';

export const AI_STRATEGY_RULES: Record<AIStrategyKey, { label: string; rule: string }> = {
  avoid: {
    label: 'AI-Free Learning',
    rule: 'AI-Free Learning: students complete this work entirely on their own, with NO AI at any point. The lesson and directions must emphasize independent reasoning, in-class process, and human-only evidence of thinking. Student directions must state clearly that AI use is not permitted for this assignment.',
  },
  augment: {
    label: 'AI-Assisted Learning',
    rule: 'AI-Assisted Learning: students MAY use AI as a support tool for brainstorming, feedback, and research, but they own and produce the final thinking themselves. The lesson should build AI in as a helper and assess the student\'s own synthesis and reflection. Student directions must explain what AI may be used for, that the final work must be the student\'s own, and that AI help must be briefly disclosed.',
  },
  embrace: {
    label: 'AI-Integrated Learning',
    rule: 'AI-Integrated Learning: students use AI as a tool they analyze, critique, and improve, and they document the collaboration. The lesson should have students evaluate, fact-check, or strengthen AI output and reflect on it. Student directions must explain how to use AI, how to critique its output, and how to document and disclose the collaboration.',
  },
};

// --- RETIRED July 13 2026 (kept for restorability): the six AI permission
// categories, replaced by the three AI strategies above. ---
export type PermissionCategory =
  | 'No Use'
  | 'AI as Tutor or Coach'
  | 'Brainstorming Buddy'
  | 'AI as Feedback Partner'
  | 'AI as Analyst'
  | 'AI as Co-Pilot';

export const PERMISSION_CATEGORIES: { value: PermissionCategory; description: string }[] = [
  { value: 'No Use', description: '100% student work, no AI at any point.' },
  { value: 'AI as Tutor or Coach', description: 'AI explains concepts only — never touches the assignment.' },
  { value: 'Brainstorming Buddy', description: 'AI helps explore ideas; the student creates the final product.' },
  { value: 'AI as Feedback Partner', description: 'Student creates first; AI gives feedback only.' },
  { value: 'AI as Analyst', description: 'AI summarizes and analyzes; the student verifies everything.' },
  { value: 'AI as Co-Pilot', description: 'AI collaborates throughout; the student remains the decision-maker.' },
];

// ---------------------------------------------------------------------------
// Supabase CRUD
// ---------------------------------------------------------------------------
export async function fetchStandardsDocuments(userId: string): Promise<StandardsDocument[]> {
  const sb = await getClient();
  if (!sb) return [];
  const { data, error } = await sb.from('standards_documents').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) { console.error('Fetch standards error:', error); return []; }
  return data || [];
}

export async function saveStandardsDocument(userId: string, doc: Omit<StandardsDocument, 'id' | 'created_at'>): Promise<StandardsDocument | null> {
  const sb = await getClient();
  if (!sb) return null;
  const { data, error } = await sb.from('standards_documents').insert({ ...doc, user_id: userId }).select().single();
  if (error) { console.error('Save standards error:', error); return null; }
  return data;
}

export async function deleteStandardsDocument(id: string) {
  const sb = await getClient();
  if (!sb) return;
  await sb.from('standards_documents').delete().eq('id', id);
}

// ---------------------------------------------------------------------------
// Generation API — three sequential calls, each fast enough for the
// function timeout. Call them in order; each later step consumes the
// earlier step's output.
// ---------------------------------------------------------------------------
async function callGenerate(payload: Record<string, unknown>) {
  // Same transient-status retry as gemini.ts, with longer backoffs: these
  // calls often run right after an analysis, so a per-minute rate limit may
  // need several seconds to clear. Each attempt is a fresh function
  // invocation with its own time budget; the step spinner stays up meanwhile.
  const RETRYABLE = new Set([429, 502, 503, 529]);
  const backoffsMs = [2000, 6000, 15000];
  let detail = '';
  for (let attempt = 0; attempt <= backoffsMs.length; attempt++) {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (response.ok) return response.json();
    detail = `Server error: ${response.status}`;
    try { const err = await response.json(); if (err?.error) detail = err.error; } catch {}
    if (RETRYABLE.has(response.status) && attempt < backoffsMs.length) {
      await new Promise(r => setTimeout(r, backoffsMs[attempt]));
      continue;
    }
    throw new Error(detail);
  }
  throw new Error(detail);
}

export async function alignToStandards(
  assignmentText: string,
  standardsText: string,
  subject?: string,
  gradeLevel?: string
): Promise<AlignmentResult> {
  const r = await callGenerate({ mode: 'align', assignmentText, standardsText, subject, gradeLevel });
  if (!Array.isArray(r.alignedStandards)) throw new Error('Unexpected alignment response shape.');
  return r as AlignmentResult;
}

export async function generateLessonPlan(
  assignmentText: string,
  alignedStandards: AlignedStandard[] | null,
  aiStrategy: AIStrategyKey,
  subject?: string,
  gradeLevel?: string
): Promise<LessonPlan> {
  // The chosen strategy's full rule text is what drives the plan's AI guidance.
  const permissionCategory = AI_STRATEGY_RULES[aiStrategy].rule;
  const r = await callGenerate({ mode: 'lesson_plan', assignmentText, alignedStandards, permissionCategory, subject, gradeLevel });
  if (!r.lessonPlan?.targets || !r.lessonPlan?.activities) throw new Error('Unexpected lesson plan response shape.');
  return r.lessonPlan as LessonPlan;
}

/** Revise the selected redesign per the teacher's request (pre-lesson-plan). */
export async function refineAssignment(
  assignmentText: string,
  instruction: string,
  subject?: string,
  gradeLevel?: string
): Promise<string> {
  const r = await callGenerate({ mode: 'refine', assignmentText, instruction, subject, gradeLevel });
  if (typeof r.revisedAssignment !== 'string' || !r.revisedAssignment.trim()) throw new Error('Unexpected revision response shape.');
  // Defensive markdown scrub — printed/exported documents must never show **.
  return r.revisedAssignment.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*\*/g, '');
}

export async function generateStudentDirections(
  assignmentText: string,
  aiStrategy: AIStrategyKey,
  gradeLevel?: string
): Promise<StudentDirections> {
  const permissionCategory = AI_STRATEGY_RULES[aiStrategy].rule;
  const r = await callGenerate({ mode: 'directions', assignmentText, permissionCategory, gradeLevel });
  if (!r.studentDirections?.steps) throw new Error('Unexpected directions response shape.');
  return r.studentDirections as StudentDirections;
}

// Convenience: turn a LessonPlan into clean plain text (for copy / export).
// Mirrors the SCOE template's element order and labels.
export function lessonPlanToText(plan: LessonPlan): string {
  return [
    `${plan.lessonTitle || 'Lesson Plan'}`,
    `Subject(s): ${plan.subjects || '________'}    Grade: ${plan.grade || '________'}\nTeacher(s): ${plan.teacher || '________'}    School: ${plan.school || '________'}`,
    `Learning Standard(s) Addressed:\n${plan.standards}`,
    `Learning Target(s):\n${plan.targets}`,
    `Relevance/Rationale:\n${plan.relevance}`,
    `Formative Assessment Criteria for Success:\n${plan.assessment}`,
    `Activities/Tasks:\n${plan.activities}`,
    `Resources/Materials:\n${plan.resources}`,
    `Access for All:\n${plan.accessForAll}`,
    `Modifications/Accommodations:\n${plan.modifications}`,
    `Common Core Aligned Lesson: Reflection\n${plan.shiftReflection || ''}${plan.reflectionQuestion ? `\n\n${plan.reflectionQuestion}\n${plan.reflectionAnswer || ''}` : ''}`,
  ].join('\n\n');
}

export function directionsToText(d: StudentDirections): string {
  return `${d.title}\n\nSTEPS\n${d.steps}\n\nUSING AI ON THIS ASSIGNMENT\n${d.aiRules}\n\nHOW YOU'LL BE GRADED\n${d.grading}`;
}
