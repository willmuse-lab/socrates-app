import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Copy, Check, Loader2, GraduationCap, ClipboardList, Target, AlertCircle, Sparkles, FileDown, FileText, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { downloadSimplePDF, downloadSimpleDocx, exportSimpleDocToGoogle, lessonPlanToBlocks, directionsToBlocks, exportLessonPlanDocx, exportLessonPlanToGoogle, DocBlock } from '@/src/lib/export';
import { googleConfigured } from '@/src/lib/google';
import {
  AlignmentResult,
  LessonPlan,
  StudentDirections,
  PermissionCategory,
  PERMISSION_CATEGORIES,
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
}

type Step = 'idle' | 'aligning' | 'planning' | 'directions' | 'done' | 'error';

export function LessonPlanPanel({ assignmentText, standardsDoc, subject, gradeLevel }: LessonPlanPanelProps) {
  const [permission, setPermission] = useState<PermissionCategory>('AI as Feedback Partner');
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState('');
  const [alignment, setAlignment] = useState<AlignmentResult | null>(null);
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [directions, setDirections] = useState<StudentDirections | null>(null);
  const [copied, setCopied] = useState<'plan' | 'directions' | null>(null);

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
        permission,
        subject,
        gradeLevel
      );
      setPlan(lp);

      // Step 3 — Student directions
      setStep('directions');
      const dir = await generateStudentDirections(assignmentText, permission, gradeLevel);
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

      {/* Permission category picker — drives Section III and the AI rules in directions */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">AI permission for this assignment</p>
        <div className="grid grid-cols-2 gap-2">
          {PERMISSION_CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setPermission(cat.value)}
              disabled={busy}
              className={`p-2.5 rounded-xl border-2 text-left transition-all ${
                permission === cat.value ? 'border-teal-400 bg-teal-50' : 'border-border bg-card hover:border-teal-200'
              }`}
            >
              <div className="text-[11px] font-bold leading-tight">{cat.value}</div>
              <div className="text-[9px] text-muted-foreground leading-snug mt-0.5">{cat.description}</div>
            </button>
          ))}
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
                  pdf={() => downloadSimplePDF(plan.lessonTitle || 'Lesson Plan', lessonPlanToBlocks(plan))}
                  docx={() => exportLessonPlanDocx(plan)}
                  gdoc={() => exportLessonPlanToGoogle(plan)}
                />
              </div>
            </div>
            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
              <div className="p-3 bg-teal-50/50">
                <div className="text-xs font-bold">{plan.lessonTitle || 'Lesson Plan'}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Subject(s): {plan.subjects || '—'} · Grade: {plan.grade || '—'}
                </div>
              </div>
              {planRows.map(row => (
                <div key={row.label} className="p-3 bg-card">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-teal-700">{row.label}</div>
                  <div className="text-[11px] leading-relaxed whitespace-pre-wrap text-foreground/80 mt-1">{row.content}</div>
                </div>
              ))}
              <div className="p-3 bg-muted/30">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Common Core Aligned Lesson: Reflection</div>
                <div className="text-[11px] leading-relaxed whitespace-pre-wrap text-foreground/70 mt-1">{plan.shiftReflection}</div>
              </div>
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
