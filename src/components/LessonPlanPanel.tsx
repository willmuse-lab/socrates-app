import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Copy, Check, Loader2, GraduationCap, ClipboardList, Target, AlertCircle, Sparkles, FileDown, FileText, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { downloadSimplePDF, downloadSimpleDocx, exportSimpleDocToGoogle, directionsToBlocks, exportLessonPlanDocx, exportLessonPlanToGoogle, exportLessonPlanPDF } from '@/src/lib/export';
import { googleConfigured } from '@/src/lib/google';
import {
  AlignmentResult,
  LessonPlan,
  StudentDirections,
  AIStrategyKey,
  AI_STRATEGY_RULES,
  alignToStandards,
  generateLessonPlan,
  generateStudentDirections,
  lessonPlanToText,
  directionsToText,
  StandardsDocument,
} from '@/src/lib/standards';

interface LessonPlanPanelProps {
  /** The final assignment text (the redesign the teacher selected, or the original). */
  assignmentText: string;
  /** Selected standards document, or null if the teacher hasn't uploaded/selected one. */
  standardsDoc: StandardsDocument | null;
  subject?: string;
  gradeLevel?: string;
  /** The teacher's single AI choice, made at the start — drives the whole flow. */
  aiStrategy: AIStrategyKey;
  /** From the teacher's profile — stamped into the plan header CLIENT-SIDE only. */
  teacherName?: string;
  schoolName?: string;
  /** Pre-generated plan/directions to hydrate from (a saved library report). */
  initialPlan?: LessonPlan | null;
  initialDirections?: StudentDirections | null;
  /** Fired whenever the plan/directions change, so the parent can save them. */
  onGenerated?: (plan: LessonPlan | null, directions: StudentDirections | null) => void;
}

type Step = 'idle' | 'aligning' | 'planning' | 'directions' | 'done' | 'error';

// The model occasionally slips markdown syntax (**bold**, # headings) into its
// text despite instructions; printed documents must never show those characters.
function scrubMarkdown(obj: Record<string, any>) {
  for (const k of Object.keys(obj)) {
    if (typeof obj[k] === 'string') {
      obj[k] = obj[k]
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*\*/g, '')
        .replace(/^#+\s*/gm, '');
    }
  }
}

export function LessonPlanPanel({ assignmentText, standardsDoc, subject, gradeLevel, aiStrategy, teacherName, schoolName, initialPlan = null, initialDirections = null, onGenerated }: LessonPlanPanelProps) {
  const [step, setStep] = useState<Step>(initialPlan || initialDirections ? 'done' : 'idle');
  const [error, setError] = useState('');
  const [alignment, setAlignment] = useState<AlignmentResult | null>(null);
  const [plan, setPlan] = useState<LessonPlan | null>(initialPlan);
  const [directions, setDirections] = useState<StudentDirections | null>(initialDirections);
  const [copied, setCopied] = useState<'plan' | 'directions' | null>(null);

  // Let the parent (analyzer) capture the generated plan/directions so they can
  // be saved to the library alongside the report.
  React.useEffect(() => { onGenerated?.(plan, directions); }, [plan, directions]);

  const run = async () => {
    setError(''); setAlignment(null); setPlan(null); setDirections(null);
    try {
      let alignResult: AlignmentResult | null = null;

      // Step 1 — SCOS alignment (only if a standards doc is selected)
      if (standardsDoc) {
        setStep('aligning');
        alignResult = await alignToStandards(assignmentText, standardsDoc.content, subject, gradeLevel);
        setAlignment(alignResult);
      }

      // Step 2 — Lesson plan (grounded in alignment when available)
      setStep('planning');
      const lp = await generateLessonPlan(
        assignmentText,
        alignResult?.alignedStandards ?? null,
        aiStrategy,
        subject,
        gradeLevel
      );
      // Stamp the header from the teacher's profile ON-DEVICE (name/school are
      // never sent to the model). Profile wins over model guesses; empty
      // profile fields stay blank lines in the exports (Will's decision).
      lp.subjects = subject || lp.subjects || '';
      lp.grade = gradeLevel || lp.grade || '';
      lp.teacher = teacherName || '';
      lp.school = schoolName || '';
      scrubMarkdown(lp);
      setPlan(lp);

      // Step 3 — Student directions
      setStep('directions');
      const dir = await generateStudentDirections(assignmentText, aiStrategy, gradeLevel);
      scrubMarkdown(dir);
      setDirections(dir);

      setStep('done');
      toast.success('Lesson plan package ready');
    } catch (e: any) {
      setError(e?.message || 'Generation failed. Please try again.');
      setStep('error');
    }
  };

  const copy = (text: string, which: 'plan' | 'directions') => {
    navigator.clipboard.writeText(text);
    setCopied(which);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  };

  // Run one export action (PDF / Word / Google Doc) with consistent toasts.
  const runExport = async (format: 'pdf' | 'docx' | 'gdoc', fn: () => any) => {
    try {
      if (format === 'gdoc') toast.info('Creating Google Doc…');
      const result = await fn();
      if (format === 'pdf') toast.success('PDF downloaded!');
      else if (format === 'docx') toast.success('Word document downloaded!');
      else { window.open(result as string, '_blank'); toast.success('Saved to your Google Drive!'); }
    } catch (e: any) { toast.error(e?.message || 'Download failed. Please try again.'); }
  };

  const ExportButtons = ({ pdf, docx, gdoc }: { pdf: () => any; docx: () => any; gdoc: () => any }) => (
    <div className="flex items-center gap-2.5">
      <button onClick={() => runExport('pdf', pdf)} className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors" title="Download PDF">
        <FileDown className="w-3 h-3" />PDF
      </button>
      <button onClick={() => runExport('docx', docx)} className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors" title="Download Word document">
        <FileText className="w-3 h-3" />Word
      </button>
      {googleConfigured && (
        <button onClick={() => runExport('gdoc', gdoc)} className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-green-600 transition-colors" title="Save as Google Doc">
          <ExternalLink className="w-3 h-3" />Google Doc
        </button>
      )}
    </div>
  );

  const busy = step === 'aligning' || step === 'planning' || step === 'directions';
  const stepLabel =
    step === 'aligning' ? 'Aligning to your standards…' :
    step === 'planning' ? 'Building the lesson plan…' :
    step === 'directions' ? 'Writing student directions…' : '';

  // Template rows (labels match the corrected SocratesIQ .docx verbatim).
  const planRows = plan ? [
    { label: 'Learning Standard(s) Addressed', content: plan.standards },
    { label: 'Learning Target(s)', content: plan.targets },
    { label: 'Relevance/Rationale', content: plan.relevance },
    { label: 'Formative Assessment Criteria for Success', content: plan.assessment },
    { label: 'Activities/Tasks', content: plan.activities },
    { label: 'Resources/Materials', content: plan.resources },
    { label: 'Access for All', content: plan.accessForAll },
    { label: 'Modifications/Accommodations', content: plan.modifications },
  ] : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <GraduationCap className="w-4 h-4 text-muted-foreground" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Lesson Plan Package</p>
      </div>

      {/* The AI strategy was chosen once at the start; it drives the lesson
          plan's AI guidance and the student directions. Shown read-only here. */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-teal-50 border border-teal-200">
        <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0 text-teal-600" />
        <div className="text-[11px] text-teal-800">
          <span className="font-bold">{AI_STRATEGY_RULES[aiStrategy].label}</span> — this is the AI approach you chose for this assignment, and it shapes the lesson plan and student directions. To change it, pick a different AI strategy at the top and re-analyze.
        </div>
      </div>

      {!standardsDoc && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>No standards document selected. The lesson plan will use placeholder standards — upload your SCOS above to enable automatic alignment.</span>
        </div>
      )}

      <Button onClick={run} disabled={busy || !assignmentText?.trim()} className="w-full">
        {busy
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {stepLabel}</>
          : <><Sparkles className="w-4 h-4 mr-2" /> Generate lesson plan + student directions</>}
      </Button>

      {step === 'error' && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-[11px] text-red-700">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <AnimatePresence>
        {/* SCOS alignment result */}
        {alignment && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-teal-600" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Standards addressed</p>
            </div>
            {alignment.alignedStandards.map((s, i) => (
              <div key={i} className="p-3 rounded-xl border border-teal-200 bg-teal-50/50">
                <div className="text-[11px] font-bold text-teal-800">{s.code}</div>
                <div className="text-[10px] text-foreground/70 mt-0.5">{s.text}</div>
                <div className="text-[10px] text-muted-foreground italic mt-1">{s.connection}</div>
              </div>
            ))}
            {alignment.gaps && <p className="text-[10px] text-muted-foreground italic">Note: {alignment.gaps}</p>}
          </motion.div>
        )}

        {/* Lesson plan */}
        {plan && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-3.5 h-3.5 text-teal-600" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Lesson plan</p>
              </div>
              <div className="flex items-center gap-2.5">
                <button onClick={() => copy(lessonPlanToText(plan), 'plan')} className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors">
                  {copied === 'plan' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied === 'plan' ? 'Copied' : 'Copy all'}
                </button>
                <ExportButtons
                  pdf={() => exportLessonPlanPDF(plan)}
                  docx={() => exportLessonPlanDocx(plan)}
                  gdoc={() => exportLessonPlanToGoogle(plan)}
                />
              </div>
            </div>
            {/* Document-style preview mirroring the printable template (the
                Word download is the exact file; this matches its layout). */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="text-center text-sm font-bold">{plan.lessonTitle || 'Lesson Plan'}</div>
              <div className="text-[11px]">Subject(s): <span className="font-semibold">{plan.subjects || '______________'}</span>&emsp;Grade: <span className="font-semibold">{plan.grade || '______'}</span></div>
              <div className="text-[11px]">Teacher(s): <span className="font-semibold">{plan.teacher || '______________'}</span>&emsp;School: <span className="font-semibold">{plan.school || '______________'}</span></div>
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr>
                    <th className="border border-foreground/30 p-2 text-left font-bold w-[88%]">LESSON ELEMENT</th>
                    <th className="border border-foreground/30 p-2 text-left font-bold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {planRows.map(row => (
                    <tr key={row.label}>
                      <td className="border border-foreground/30 p-2 align-top">
                        <div className="font-bold">{row.label}:</div>
                        <div className="leading-relaxed whitespace-pre-wrap text-foreground/80 mt-1">{row.content}</div>
                      </td>
                      <td className="border border-foreground/30 p-2 align-top" />
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-[11px] font-bold pt-1">Common Core Aligned Lesson:&nbsp; Reflection</div>
              <div className="text-[11px] leading-relaxed whitespace-pre-wrap text-foreground/80">{plan.shiftReflection}</div>
              {plan.reflectionQuestion && (
                <div>
                  <div className="text-[11px] font-bold italic">{plan.reflectionQuestion}</div>
                  <div className="text-[11px] leading-relaxed whitespace-pre-wrap text-foreground/80 mt-0.5">{plan.reflectionAnswer}</div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Student directions */}
        {directions && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-3.5 h-3.5 text-teal-600" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Student directions</p>
              </div>
              <div className="flex items-center gap-2.5">
                <button onClick={() => copy(directionsToText(directions), 'directions')} className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors">
                  {copied === 'directions' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied === 'directions' ? 'Copied' : 'Copy all'}
                </button>
                <ExportButtons
                  pdf={() => downloadSimplePDF(directions.title || 'Student Directions', directionsToBlocks(directions))}
                  docx={() => downloadSimpleDocx(directions.title || 'Student Directions', directionsToBlocks(directions))}
                  gdoc={() => exportSimpleDocToGoogle(directions.title || 'Student Directions', directionsToBlocks(directions))}
                />
              </div>
            </div>
            <div className="rounded-xl border border-border p-3 bg-card space-y-3">
              <div className="text-xs font-bold">{directions.title}</div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Steps</div>
                <div className="text-[11px] leading-relaxed whitespace-pre-wrap text-foreground/80 mt-1">{directions.steps}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Using AI on this assignment</div>
                <div className="text-[11px] leading-relaxed whitespace-pre-wrap text-foreground/80 mt-1">{directions.aiRules}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">How you'll be graded</div>
                <div className="text-[11px] leading-relaxed whitespace-pre-wrap text-foreground/80 mt-1">{directions.grading}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
