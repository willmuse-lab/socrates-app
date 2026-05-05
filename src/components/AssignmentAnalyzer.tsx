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
                  { key: 'augment' as const, Icon: Zap, label: 'Augment with AI', desc: 'Use AI for brainstorming and research.' },
                  { key: 'embrace' as const, Icon: Sparkles, label: 'Embrace AI', desc: 'Integrate AI literacy and critical critique.' },
                ]).map(({ key, Icon, label, desc }) => (
                  <button key={key} onClick={() => setAiPreference(key)}
                    className={`p-4 rounded-xl border-2 transition-all text-left flex flex-col gap-2 ${aiPreference === key ? 'border-accent bg-accent/5 ring-2 ring-accent/20' : 'border-border hover:border-accent/30'}`}>
                    <Icon className={`w-5 h-5 ${aiPreference === key ? 'text-accent' : 'text-muted-foreground'}`} />
                    <div><div className="font-bold text-sm">{label}</div><div className="text-[11px] text-muted-foreground leading-tight">{desc}</div></div>
                  </button>
                ))}
              </div>
            </div>
            <div className="text-center">
              <button onClick={() => setShowTemplates(!showTemplates)}
                className="text-xs font-bold uppercase tracking-widest text-accent hover:text-accent/80 transition-colors flex items-center gap-2 mx-auto">
                <span>📋</span> {showTemplates ? 'Hide templates' : 'Start from a template'}
              </button>
              {showTemplates && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-left max-h-80 overflow-y-auto">
                  {getTemplatesBySubject(subject).map(t => (
                    <button key={t.id} onClick={() => { setText(t.text); setShowTemplates(false); }}
                      className="p-3 border border-border rounded-xl text-left hover:border-accent/40 hover:bg-secondary/30 transition-all space-y-1.5 bg-card">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold leading-tight">{t.title}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${t.vulnerability.startsWith('High') ? 'bg-red-100 text-red-600' : t.vulnerability.startsWith('Medium') ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                          {t.vulnerability.split(' — ')[0]}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{t.type} · {t.gradeLevel.split('(')[0].trim()}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">{t.text.substring(0, 90)}…</p>
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="border border-border shadow-sm">
                <CardHeader><CardTitle className="text-lg font-serif italic">Upload Document</CardTitle><CardDescription>PDF, DOCX, or TXT files.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <FileUploader onTextExtracted={setText} />
                  <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or</span></div></div>
                  <GoogleDrivePicker onFileSelected={setText} />
                </CardContent>
              </Card>
              <Card className="border border-border shadow-sm flex flex-col">
                <CardHeader><CardTitle className="text-lg font-serif italic">Paste Text</CardTitle><CardDescription>Directly input your prompt.</CardDescription></CardHeader>
                <CardContent className="space-y-4 flex-1 flex flex-col">
                  <Textarea placeholder="Paste your assignment here..." className="flex-1 min-h-[150px] resize-none border-border focus-visible:ring-accent" value={text} onChange={(e) => setText(e.target.value)} />
                  <Button className="w-full h-12 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md" onClick={handleAnalyze} disabled={isAnalyzing || !text.trim()}>
                    {isAnalyzing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : 'Analyze Assignment'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      ) : isAnalyzing ? (
        <div className="flex-1 flex items-center justify-center">
          <StreamingProgress stage={progressStage} percent={progressPercent} isVisible={isAnalyzing} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:grid md:grid-cols-[1fr_340px] overflow-hidden">
          <div className="p-6 md:p-10 flex flex-col gap-6 overflow-y-auto order-2 md:order-1">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[11px] uppercase tracking-wider px-2.5 py-1 bg-secondary rounded-sm text-muted-foreground font-semibold">Analysis</span>
              <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-bold border-accent/30 text-accent">{aiPreference}</Badge>
              <div className="ml-auto flex items-center gap-1 flex-wrap">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-accent gap-1.5 text-xs" onClick={handleExportPDF}><FileDown className="w-3.5 h-3.5" />PDF</Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-accent gap-1.5 text-xs" onClick={handleExportDocx}><FileText className="w-3.5 h-3.5" />DOCX</Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-green-600 gap-1.5 text-xs" onClick={handleExportGoogleDocs}><ExternalLink className="w-3.5 h-3.5" />Google Doc</Button>
                <div className="w-px h-4 bg-border mx-1" />
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-accent gap-1.5 text-xs" onClick={handleShare}><Share2 className="w-3.5 h-3.5" />Share</Button>
              </div>
            </div>
            {result.aiFailureBreakdown && <AIFailureBreakdown headline={result.aiFailureBreakdown.headline} failures={result.aiFailureBreakdown.failures} />}
            <Card ref={suggestionsRef} className="p-6 md:p-8 border border-border shadow-sm bg-card rounded-xl flex-1">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Redesign Suggestions</h2>
                <button onClick={() => setShowComparison(!showComparison)}
                  className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${showComparison ? 'bg-accent text-white border-accent' : 'border-border text-muted-foreground hover:border-accent/40'}`}>
                  {showComparison ? '✕ Hide comparison' : '⇄ Compare levels'}
                </button>
              </div>
              {showComparison && (
                <div className="mb-8 space-y-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">What changes at each level</p>
                  <div className="grid md:grid-cols-3 gap-4">
                    {result.suggestions.map((sug, i) => {
                      const changes = getChangeSummary(text, sug.modifiedAssignment);
                      const colors = ['border-orange-200 bg-orange-50', 'border-slate-200 bg-slate-50', 'border-amber-200 bg-amber-50'];
                      const badges = ['bg-orange-100 text-orange-700', 'bg-slate-100 text-slate-600', 'bg-amber-100 text-amber-700'];
                      const medals = ['🥉', '🥈', '🥇'];
                      return (
                        <div key={i} className={`p-4 rounded-xl border-2 ${colors[i]} space-y-3`}>
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${badges[i]}`}>{medals[i]} {sug.level}</div>
                          <p className="text-xs font-bold">{sug.title}</p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed italic">{sug.description}</p>
                          {changes.length > 0 && (
                            <div className="space-y-1.5 pt-1 border-t border-black/10">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Key additions:</p>
                              {changes.map((change, j) => (
                                <div key={j} className="flex items-start gap-1.5">
                                  <span className="text-green-600 font-bold text-xs flex-shrink-0">+</span>
                                  <p className="text-[10px] leading-relaxed text-foreground/70">{change.trim().substring(0, 120)}{change.length > 120 ? '...' : ''}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          <button onClick={() => { setActiveLevel(sug.level as any); setShowComparison(false); }} className="text-[10px] font-bold uppercase tracking-wider text-accent hover:underline">View full version →</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <Tabs value={activeLevel} onValueChange={(v) => setActiveLevel(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-10 bg-secondary rounded-md p-1">
                  <TabsTrigger value="Bronze" className="text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">🥉 Bronze</TabsTrigger>
                  <TabsTrigger value="Silver" className="text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">🥈 Silver</TabsTrigger>
                  <TabsTrigger value="Gold" className="text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">🥇 Gold</TabsTrigger>
                </TabsList>
                {result.suggestions.map((suggestion, i) => (
                  <TabsContent key={i} value={suggestion.level} className="mt-6 space-y-6">
                    <div className="space-y-1">
                      <h3 className="text-2xl font-serif italic text-accent">{suggestion.title}</h3>
                      <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                    </div>
                    <div className="bg-secondary/30 p-6 md:p-8 rounded-xl font-sans text-base leading-relaxed whitespace-pre-wrap border border-border/50 max-h-[400px] overflow-y-auto text-foreground/80">{suggestion.modifiedAssignment}</div>
                    {editingIndex === i && (
                      <div className="space-y-2">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Edit directly:</p>
                        <textarea className="w-full min-h-[180px] text-sm leading-relaxed p-4 border border-accent/30 rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-accent resize-y"
                          value={editedTexts[i] ?? suggestion.modifiedAssignment}
                          onChange={e => setEditedTexts(prev => ({ ...prev, [i]: e.target.value }))} />
                      </div>
                    )}
                    {suggestion.differentiatedVersions && (
                      <div className="pt-2 border-t border-border/50">
                        <DifferentiationPanel versions={suggestion.differentiatedVersions} level={suggestion.level} />
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-3">
                      <Button variant="outline" size="sm" className="h-9 text-xs font-bold uppercase tracking-wider gap-1.5" onClick={() => copyToClipboard(suggestion.modifiedAssignment, i)}>
                        {copiedIndex === i ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}{copiedIndex === i ? 'Copied' : 'Copy'}
                      </Button>
                      <Button variant="default" size="sm" className="h-9 text-xs font-bold uppercase tracking-wider gap-1.5 bg-accent text-white hover:bg-accent/90" onClick={() => applyVersion(editedTexts[i] ?? suggestion.modifiedAssignment, i)}>
                        <Replace className="w-3.5 h-3.5" />Apply This Version
                      </Button>
                      <Button variant="ghost" size="sm" className="h-9 text-xs gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => setEditingIndex(editingIndex === i ? null : i)}>
                        ✏️ {editingIndex === i ? 'Done' : 'Edit inline'}
                      </Button>
                      <div className="ml-auto flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-1">Helpful?</span>
                        <button onClick={() => handleFeedback(i, 'up')} className={`p-1.5 rounded-md transition-all ${feedback[i] === 'up' ? 'bg-green-100 text-green-600' : 'text-muted-foreground hover:text-green-500 hover:bg-green-50'}`}><ThumbsUp className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleFeedback(i, 'down')} className={`p-1.5 rounded-md transition-all ${feedback[i] === 'down' ? 'bg-red-100 text-red-500' : 'text-muted-foreground hover:text-red-400 hover:bg-red-50'}`}><ThumbsDown className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </Card>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-10 text-xs font-bold uppercase tracking-widest border-border hover:bg-secondary gap-2" onClick={handleNewAssignment}><RotateCcw className="w-3.5 h-3.5" />New Assignment</Button>
              <Button className="flex-1 h-10 text-xs font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 gap-2" onClick={handleSaveToLibrary}><Save className="w-3.5 h-3.5" />Save to Library</Button>
            </div>
          </div>
          <aside className="bg-card border-b md:border-b-0 md:border-l border-border p-6 md:p-10 flex flex-col gap-8 overflow-y-auto order-1 md:order-2">
            <div className="text-center space-y-3">
              <div className="score-circle mx-auto">
                <span className={`text-3xl font-bold ${scoreColor}`}>{result.resilienceScore}</span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Resilience</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{result.summary}</p>
            </div>
            {applied !== null && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 px-4 py-3 rounded-lg bg-accent/10 border border-accent/20 text-xs text-accent font-medium">
                <BookOpen className="w-4 h-4 flex-shrink-0" />Version applied — re-analyze to see updated score.
              </motion.div>
            )}
            <div className="space-y-4">
              <h4 className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Analysis Dimensions</h4>
              <div className="space-y-3">
                {result.dimensions.map((dim, i) => (
                  <div key={i} className="p-4 border border-border rounded-lg bg-secondary/20 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${dim.score > 70 ? 'bg-[#708D81]' : dim.score > 40 ? 'bg-[#D4A373]' : 'bg-red-400'}`} />{dim.name}
                      </span>
                      <span className="text-xs font-bold">{dim.score}%</span>
                    </div>
                    <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${dim.score}%` }} transition={{ duration: 0.6, delay: i * 0.1 }}
                        className={`h-full rounded-full ${dim.score > 70 ? 'bg-[#708D81]' : dim.score > 40 ? 'bg-[#D4A373]' : 'bg-red-400'}`} />
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{dim.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Framework Reference</h4>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="framework" className="border-border">
                  <AccordionTrigger className="text-[11px] font-bold uppercase py-2 hover:no-underline">{activeFramework === 'blooms' ? `Bloom's: ${bloomsLevel}` : 'Custom Framework'}</AccordionTrigger>
                  <AccordionContent className="text-[11px] text-muted-foreground space-y-2">
                    {activeFramework === 'blooms' ? <p>Targeting the <strong className="text-foreground">{bloomsLevel}</strong> level.</p>
                      : dimensions.map((dim, i) => <p key={i}><strong className="text-foreground">{dim.name}:</strong> {dim.description}</p>)}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="aias" className="border-border">
                  <AccordionTrigger className="text-[11px] font-bold uppercase py-2 hover:no-underline">AI Assessment Scale</AccordionTrigger>
                  <AccordionContent className="text-[11px] text-muted-foreground space-y-2">
                    {[['L1','No AI assistance.'],['L2','AI for planning only.'],['L3','AI for editing (with appendix).'],['L4','AI for completion (with critique).'],['L5','Full human-AI co-design.']].map(([k,v]) => (
                      <p key={k}><strong className="text-foreground">{k}:</strong> {v}</p>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
            <Button className="w-full h-12 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 mt-auto" onClick={handleStrengthen}>Strengthen Assignment</Button>
          </aside>
        </div>
      )}
    </div>
  );
}
