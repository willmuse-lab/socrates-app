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

// SCOE CCSS-Aligned template (active since July 12 2026). Elements 2-4 carry a
// student-friendly translation, matching the school template's second column.
export interface LessonPlan {
  lessonTitle?: string;
  subjects?: string;
  grade?: string;
  standards: string;
  targets: string;
  targetsStudent?: string;
  relevance: string;
  relevanceStudent?: string;
  assessment: string;
  assessmentStudent?: string;
  activities: string;
  resources: string;
  accessForAll: string;
  modifications: string;
  shiftReflection?: string;
}

export interface StudentDirections {
  title: string;
  steps: string;
  aiRules: string;
  grading: string;
}

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
  permissionCategory: PermissionCategory,
  subject?: string,
  gradeLevel?: string
): Promise<LessonPlan> {
  const r = await callGenerate({ mode: 'lesson_plan', assignmentText, alignedStandards, permissionCategory, subject, gradeLevel });
  if (!r.lessonPlan?.targets || !r.lessonPlan?.activities) throw new Error('Unexpected lesson plan response shape.');
  return r.lessonPlan as LessonPlan;
}

export async function generateStudentDirections(
  assignmentText: string,
  permissionCategory: PermissionCategory,
  gradeLevel?: string
): Promise<StudentDirections> {
  const r = await callGenerate({ mode: 'directions', assignmentText, permissionCategory, gradeLevel });
  if (!r.studentDirections?.steps) throw new Error('Unexpected directions response shape.');
  return r.studentDirections as StudentDirections;
}

// Convenience: turn a LessonPlan into clean plain text (for copy / export).
// Mirrors the SCOE template's element order and labels.
export function lessonPlanToText(plan: LessonPlan): string {
  const sf = (t?: string) => (t ? `\nStudent-friendly translation: ${t}` : '');
  return [
    `${plan.lessonTitle || 'Lesson Plan'}`,
    `Subject(s): ${plan.subjects || '________'}    Grade: ${plan.grade || '________'}\nTeacher(s): ________    School: ________`,
    `Learning Standard(s) Addressed:\n${plan.standards}`,
    `Learning Target(s):\n${plan.targets}${sf(plan.targetsStudent)}`,
    `Relevance/Rationale:\n${plan.relevance}${sf(plan.relevanceStudent)}`,
    `Formative Assessment Criteria for Success:\n${plan.assessment}${sf(plan.assessmentStudent)}`,
    `Activities/Tasks:\n${plan.activities}`,
    `Resources/Materials:\n${plan.resources}`,
    `Access for All:\n${plan.accessForAll}`,
    `Modifications/Accommodations:\n${plan.modifications}`,
    `Common Core Aligned Lesson: Reflection\n${plan.shiftReflection || ''}`,
  ].join('\n\n');
}

export function directionsToText(d: StudentDirections): string {
  return `${d.title}\n\nSTEPS\n${d.steps}\n\nUSING AI ON THIS ASSIGNMENT\n${d.aiRules}\n\nHOW YOU'LL BE GRADED\n${d.grading}`;
}
