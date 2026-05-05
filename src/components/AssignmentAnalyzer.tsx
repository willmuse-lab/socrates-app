import React, { useState, useCallback } from 'react';
import { analyzeAssignment, AnalysisResult, AIPreference, FrameworkDimension, DEFAULT_DIMENSIONS, BloomsLevel } from '@/src/lib/gemini';
import { SavedAssignment } from '../App';
import { FileUploader } from './FileUploader';
import { GoogleDrivePicker } from './GoogleDrivePicker';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, Shield, Zap, Sparkles, Share2, FileText, FileDown, Copy, Check, ThumbsUp, ThumbsDown, Replace, BookOpen, RotateCcw, Save, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { exportToPDF, exportToDocx, exportToGoogleDocs } from '@/src/lib/export';
import { AIFailureBreakdown } from './AIFailureBreakdown';
import { StreamingProgress } from './StreamingProgress';
import { DifferentiationPanel } from './DifferentiationPanel';
import { getTemplatesBySubject } from '@/src/lib/templates';

type FeedbackMap = Record<number, 'up' | 'down' | null>;

export function AssignmentAnalyzer({
  defaultPreference = 'avoid', dimensions = DEFAULT_DIMENSIONS, activeFramework = 'triple-a',
  bloomsLevel = 'Analyze', subject = '', gradeLevel = '', onSave, onReset, initialText = ''
}: {
  defaultPreference?: AIPreference, dimensions?: FrameworkDimension[], activeFramework?: 'triple-a' | 'blooms',
  bloomsLevel?: BloomsLevel, subject?: string, gradeLevel?: string,
  onSave?: (assignment: Omit<SavedAssignment, 'id' | 'date'>) => void, onReset?: () => void, initialText?: string
}) {
  const [text, setText] = useState(initialText);
  const [aiPreference, setAiPreference] = useState<AIPreference>(defaultPreference);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeLevel, setActiveLevel] = useState<'Bronze' | 'Silver' | 'Gold'>('Bronze');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<FeedbackMap>({});
  const [applied, setApplied] = useState<number | null>(null);
  const [progressStage, setProgressStage] = useState('Reading your assignment...');
  const [progressPercent, setProgressPercent] = useState(0);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showDifferentiation, setShowDifferentiation] = useState<number | null>(null);
  const [editedTexts, setEditedTexts] = useState<Record<number, string>>({});
  const suggestionsRef = React.useRef<HTMLDivElement>(null);

  const getChangeSummary = (original: string, modified: string): string[] => {
    const origSentences = original.match(/[^.!?]+[.!?]+/g) || original.split('\n').filter(Boolean);
    const modSentences = modified.match(/[^.!?]+[.!?]+/g) || modified.split('\n').filter(Boolean);
    const added = modSentences.filter(s => !origSentences.some(o => o.trim() === s.trim() || o.includes(s.trim().substring(0, 30))));
    return added.slice(0, 4);
  };

  React.useEffect(() => { if (!text && !result) setAiPreference(defaultPreference); }, [defaultPreference]);
  React.useEffect(() => { if (initialText) { setText(initialText); setResult(null); } }, [initialText]);

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setIsAnalyzing(true); setFeedback({}); setApplied(null);
    try {
      setProgressStage('Reading your assignment...'); setProgressPercent(5);
      const analysis = await analyzeAssignment(text, aiPreference, dimensions, activeFramework, bloomsLevel, subject, gradeLevel,
        (stage, pct) => { setProgressStage(stage); setProgressPercent(pct); });
      setResult(analysis); setActiveLevel('Bronze');
    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error('Failed to analyze assignment. Please try again.');
    } finally { setIsAnalyzing(false); }
  };

  const copyToClipboard = (content: string, index: number) => {
    navigator.clipboard.writeText(content); setCopiedIndex(index);
    toast.success('Copied to clipboard!'); setTimeout(() => setCopiedIndex(null), 2000);
  };

  const applyVersion = (content: string, index: number) => {
    setText(content); setApplied(index); setResult(null);
    toast.success('Version applied! Re-analyze to see the new score.', { action: { label: 'Analyze Now', onClick: () => handleAnalyze() } });
  };

  const handleFeedback = (index: number, vote: 'up' | 'down') => {
    setFeedback(prev => ({ ...prev, [index]: prev[index] === vote ? null : vote }));
    if (feedback[index] !== vote) toast.success(vote === 'up' ? 'Thanks! Marked as helpful.' : 'Thanks for the feedback!');
  };

  const handleShare = async () => {
    if (!result) return;
    try {
      const payload = { text: text.substring(0, 500), score: result.resilienceScore, level: activeLevel, strategy: aiPreference };
      const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));
      await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#share=${encoded}`);
      toast.success('Share link copied!');
    } catch { toast.error('Could not generate share link.'); }
  };

  const handleExportPDF = async () => { if (!result) return; try { await exportToPDF(result, text); toast.success('PDF exported!'); } catch { toast.error('Failed to export PDF.'); } };
  const handleExportDocx = async () => { if (!result) return; try { await exportToDocx(result, text); toast.success('DOCX exported!'); } catch { toast.error('Failed to export DOCX.'); } };
  const handleExportGoogleDocs = async () => {
    if (!result) return;
    const title = `Socrates Analysis — ${text.trim().split('\n')[0].substring(0, 40)}`;
    try {
      const res = await exportToGoogleDocs(result, text, title);
      if (res?.docUrl) { window.open(res.docUrl, '_blank'); toast.success('Opened in Google Docs!'); }
    } catch (err: any) {
      if (err.message === 'NOT_AUTHENTICATED') toast.error('Connect Google Drive first.');
      else toast.error('Google Docs export failed.');
    }
  };

  const handleStrengthen = () => { setActiveLevel('Gold'); suggestionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); toast.info('Showing Socratic Transformation (Gold Level)'); };
  const handleSaveToLibrary = () => {
    if (!result || !onSave) return;
    const firstLine = text.trim().split('\n')[0];
    const displayTitle = firstLine.length > 50 ? firstLine.substring(0, 47) + '...' : (firstLine || 'Untitled Assignment');
    onSave({ title: displayTitle, fullText: text, resilience: result.resilienceScore, status: activeLevel });
    toast.success('Assignment saved to your library!');
  };
  const handleNewAssignment = () => { setResult(null); setText(''); setFeedback({}); setApplied(null); onReset?.(); };
  const scoreColor = result ? result.resilienceScore >= 70 ? 'text-[#708D81]' : result.resilienceScore >= 40 ? 'text-[#D4A373]' : 'text-red-400' : '';

  return (
    <div className="flex-1 flex flex-col">
      {!result ? (
        <div className="flex-1 flex items-center justify-center p-6 md:p-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl w-full space-y-10">
            <div className="grid md:grid-cols-[1fr_2fr] gap-10 items-center">
              <div className="relative group hidden md:flex">
                <div className="relative w-full aspect-square flex items-center justify-center rounded-full border-8 border-white shadow-2xl bg-white overflow-hidden">
                  <img src="/logo.png" alt="Socrates Logo" className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Badge className="bg-accent text-white border-none px-3 py-1">AI-Resilient Assignment Architect</Badge>
                  <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">Wisdom in the Age of <span className="text-accent">Artificial Intelligence.</span></h1>
                </div>
                <p className="text-muted-foreground text-lg md:text-xl leading-relaxed">Transform traditional assignments into learning experiences that prioritize critical thinking.</p>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-center text-muted-foreground">Select Your AI Strategy</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
                {([
                  { key: 'avoid' as const, Icon: Shield, label: 'Avoid AI', desc: 'Maximize resilience and human-only output.' },
                  { key: 'augment' as const, Icon: Zap, label: 'Augment with AI', desc: 'Use AI for brains
