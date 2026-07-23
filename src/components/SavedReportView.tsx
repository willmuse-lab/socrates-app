import React from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FileDown, FileText, ExternalLink, RotateCcw, ArrowLeft, Sparkles } from 'lucide-react';
import { AIFailureBreakdown } from './AIFailureBreakdown';
import { LessonPlanPanel } from './LessonPlanPanel';
import { exportToPDF, exportToDocx, downloadSimplePDF, downloadSimpleDocx, exportSimpleDocToGoogle, redesignToBlocks } from '@/src/lib/export';
import { googleConfigured } from '@/src/lib/google';
import { logClientUsage } from '@/src/lib/supabase';
import { SavedAssignment } from '../App';

// Read-only view of a saved library assignment: its redesign report plus the
// lesson plan and student directions that were generated for it. No AI re-run —
// everything is read from the saved snapshot. If the lesson plan/directions were
// never generated, LessonPlanPanel offers to make them (free — same assignment).
export function SavedReportView({ assignment, onBack, onRedesignAgain, userId = '', teacherName = '', schoolName = '' }: {
  assignment: SavedAssignment;
  onBack: () => void;
  onRedesignAgain: () => void;
  userId?: string;
  teacherName?: string;
  schoolName?: string;
}) {
  const report = assignment.report || null;
  const scoreColor = (s: number) => s >= 86 ? 'text-green-600' : s >= 71 ? 'text-lime-600' : s >= 51 ? 'text-amber-500' : s >= 31 ? 'text-orange-500' : 'text-red-500';

  const runExport = async (kind: 'pdf' | 'docx' | 'gdoc', fn: () => any, format: string) => {
    try {
      if (kind === 'gdoc') toast.info('Creating Google Doc…');
      const res = await fn();
      if (kind === 'gdoc') { window.open(res as string, '_blank'); toast.success('Saved to your Google Drive!'); }
      else toast.success(kind === 'pdf' ? 'PDF downloaded!' : 'Word document downloaded!');
      logClientUsage({ event_type: 'download', user_id: userId || null, download_format: format });
    } catch (e: any) { toast.error(e?.message || 'Download failed. Please try again.'); }
  };

  const asgBlocks = () => redesignToBlocks(assignment.fullText);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto p-6 md:p-10 space-y-8">
      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />Back to Library
        </button>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs font-bold uppercase tracking-widest" onClick={onRedesignAgain}>
          <RotateCcw className="w-3.5 h-3.5" />Redesign again
        </Button>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-accent">Saved Assignment Report</p>
        <h1 className="text-2xl md:text-3xl font-bold font-serif italic">{assignment.title}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Saved {assignment.date}</span>
          {assignment.status && <span className="px-2 py-0.5 rounded-full bg-secondary font-bold uppercase tracking-widest text-[10px]">{assignment.status} redesign</span>}
          {assignment.subject && <span>{assignment.subject}</span>}
          {assignment.gradeLevel && <span>{assignment.gradeLevel}</span>}
          <span>AI Resilience Score: <strong className={scoreColor(assignment.resilience)}>{assignment.resilience}</strong>/100</span>
        </div>
      </div>

      {/* Redesigned assignment */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Redesigned assignment</h2>
          <div className="flex items-center gap-3">
            <button onClick={() => runExport('pdf', () => downloadSimplePDF(assignment.title, asgBlocks()), 'pdf')} className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground"><FileDown className="w-3 h-3" />PDF</button>
            <button onClick={() => runExport('docx', () => downloadSimpleDocx(assignment.title, asgBlocks()), 'docx')} className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground"><FileText className="w-3 h-3" />Word</button>
            {googleConfigured && <button onClick={() => runExport('gdoc', () => exportSimpleDocToGoogle(assignment.title, asgBlocks()), 'gdoc')} className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-green-600"><ExternalLink className="w-3 h-3" />Google Doc</button>}
          </div>
        </div>
        <div className="bg-secondary/30 p-6 rounded-xl border border-border/50 text-base leading-relaxed whitespace-pre-wrap text-foreground/80">{assignment.fullText}</div>
      </section>

      {/* Report */}
      {report && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Redesign report</h2>
            <div className="flex items-center gap-3">
              <button onClick={() => runExport('pdf', () => exportToPDF(report, assignment.fullText), 'pdf')} className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground"><FileDown className="w-3 h-3" />PDF</button>
              <button onClick={() => runExport('docx', () => exportToDocx(report, assignment.fullText), 'docx')} className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground"><FileText className="w-3 h-3" />Word</button>
            </div>
          </div>
          {report.summary && <p className="text-sm text-muted-foreground leading-relaxed">{report.summary}</p>}
          {report.aiFailureBreakdown && (
            <AIFailureBreakdown headline={report.aiFailureBreakdown.headline} failures={report.aiFailureBreakdown.failures} />
          )}
          {report.dimensions?.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-3">
              {report.dimensions.map((d, i) => (
                <div key={i} className="p-4 rounded-xl border border-border bg-card">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold">{d.name}</span>
                    <span className={`text-sm font-bold ${scoreColor(d.score)}`}>{d.score}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{d.explanation}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Lesson plan + student directions (hydrated from the snapshot, or
          generated on demand for free — it's the same assignment). */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Lesson plan & student directions</h2>
        </div>
        <div className="p-5 rounded-2xl border border-border bg-card">
          <LessonPlanPanel
            assignmentText={assignment.fullText}
            standardsDoc={null}
            subject={assignment.subject}
            gradeLevel={assignment.gradeLevel}
            aiStrategy={(assignment.aiStrategy as any) || 'avoid'}
            teacherName={teacherName}
            schoolName={schoolName}
            initialPlan={assignment.lessonPlan || null}
            initialDirections={assignment.directions || null}
          />
        </div>
      </section>
    </motion.div>
  );
}
