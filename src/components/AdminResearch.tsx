import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as pdfjs from 'pdfjs-dist';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Trash2, BookOpen, Loader2, ShieldCheck, AlertCircle, CheckCircle2, ArrowLeft, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { fetchResearchPapers, saveResearchPaper, deleteResearchPaper, ResearchPaper, supabaseEnabled } from '@/src/lib/supabase';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'socrates2025';

interface AdminResearchProps { onBack: () => void; }

export function AdminResearch({ onBack }: AdminResearchProps) {
  const [authed, setAuthed] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [extractedFilename, setExtractedFilename] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [form, setForm] = useState({ title: '', authors: '', year: '' });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => { if (authed) loadPapers(); }, [authed]);

  const loadPapers = async () => {
    setLoading(true);
    const data = await fetchResearchPapers();
    setPapers(data);
    setLoading(false);
  };

  const handlePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) { setAuthed(true); }
    else { setPasswordError('Incorrect password.'); setPasswordInput(''); }
  };

  const extractPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map((item: any) => item.str).join(' ') + '\n';
    }
    return fullText.trim();
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file || file.type !== 'application/pdf') { toast.error('Only PDF files are supported.'); return; }
    setExtracting(true); setExtractedText(''); setExtractedFilename('');
    try {
      const text = await extractPDF(file);
      if (!text) { toast.error('Could not extract text from this PDF.'); return; }
      setExtractedText(text); setExtractedFilename(file.name);
      const autoTitle = file.name.replace('.pdf', '').replace(/_/g, ' ').replace(/-/g, ' ');
      setForm(f => ({ ...f, title: f.title || autoTitle }));
      toast.success(`Extracted ${text.length.toLocaleString()} characters`);
    } catch (err) { toast.error('Failed to extract PDF.'); }
    finally { setExtracting(false); }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/pdf': ['.pdf'] }, multiple: false } as any);

  const handleUpload = async () => {
    if (!extractedText || !form.title || !form.authors || !form.year) { toast.error('Please fill in all fields and upload a PDF.'); return; }
    if (!supabaseEnabled) { toast.error('Supabase is not configured.'); return; }
    setUploading(true);
    try {
      const saved = await saveResearchPaper({ title: form.title, authors: form.authors, year: form.year, filename: extractedFilename, content: extractedText });
      if (saved) {
        toast.success(`"${form.title}" added to the research library!`);
        setExtractedText(''); setExtractedFilename(''); setForm({ title: '', authors: '', year: '' });
        loadPapers();
      } else { toast.error('Failed to save.'); }
    } finally { setUploading(false); }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDelete === id) {
      await deleteResearchPaper(id);
      setPapers(prev => prev.filter(p => p.id !== id));
      setConfirmDelete(null); toast.info('Paper removed.');
    } else { setConfirmDelete(id); setTimeout(() => setConfirmDelete(null), 3000); }
  };

  if (!authed) return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-sm p-8 space-y-6 border border-border">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mx-auto"><ShieldCheck className="w-6 h-6 text-accent" /></div>
          <h2 className="text-xl font-bold font-serif italic">Admin Access</h2>
          <p className="text-sm text-muted-foreground">Research library management is restricted.</p>
        </div>
        <form onSubmit={handlePassword} className="space-y-4">
          <input type="password" placeholder="••••••••" value={passwordInput}
            onChange={e => { setPasswordInput(e.target.value); setPasswordError(''); }}
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent" autoFocus />
          {passwordError && <p className="text-xs text-destructive flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{passwordError}</p>}
          <Button type="submit" className="w-full">Enter</Button>
        </form>
        <button onClick={onBack} className="w-full text-xs text-muted-foreground hover:text-foreground text-center">← Back to Studio</button>
      </Card>
    </motion.div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto w-full p-6 md:p-10 space-y-8">
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3"><BookOpen className="w-6 h-6 text-accent" /><h1 className="text-3xl font-bold font-serif italic">Research Library</h1></div>
          <p className="text-muted-foreground text-sm mt-1">Upload research PDFs here. Claude reads them automatically when analyzing assignments.</p>
        </div>
        <Button variant="outline" onClick={onBack} className="gap-2"><ArrowLeft className="w-4 h-4" />Back</Button>
      </div>
      {!supabaseEnabled && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div><strong>Supabase not configured.</strong> Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your Netlify environment variables.</div>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-5">
          <h2 className="text-lg font-bold">Upload New Paper</h2>
          <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all flex flex-col items-center gap-3 text-center ${isDragActive ? 'border-accent bg-accent/5' : extractedText ? 'border-green-400 bg-green-50' : 'border-border hover:border-accent/50'}`}>
            <input {...getInputProps()} />
            {extracting ? <><Loader2 className="w-8 h-8 animate-spin text-accent" /><p className="text-sm font-medium">Extracting text...</p></>
              : extractedText ? <><CheckCircle2 className="w-8 h-8 text-green-500" /><p className="text-sm font-bold text-green-700">{extractedFilename}</p><p className="text-xs text-green-600">{extractedText.length.toLocaleString()} characters extracted</p><button onClick={e => { e.stopPropagation(); setExtractedText(''); setExtractedFilename(''); }} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 mt-1"><X className="w-3 h-3" />Remove</button></>
              : <><Upload className="w-8 h-8 text-muted-foreground" /><div><p className="text-sm font-medium">{isDragActive ? 'Drop PDF here' : 'Drag & drop a research PDF'}</p><p className="text-xs text-muted-foreground mt-1">or click to browse</p></div></>}
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Paper Title</Label>
              <Input placeholder="e.g. AI Resilience in Higher Education" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Authors</Label>
                <Input placeholder="e.g. Smith & Jones" value={form.authors} onChange={e => setForm(f => ({ ...f, authors: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Year</Label>
                <Input placeholder="e.g. 2024" value={form.year} maxLength={4} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} />
              </div>
            </div>
          </div>
          <Button className="w-full h-11 font-bold gap-2" onClick={handleUpload} disabled={uploading || !extractedText || !form.title || !form.authors || !form.year}>
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><FileText className="w-4 h-4" />Add to Research Library</>}
          </Button>
        </div>
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Active Research</h2>
            <span className="text-xs text-muted-foreground border border-border rounded-full px-3 py-1">{papers.length} paper{papers.length !== 1 ? 's' : ''} · auto-injected</span>
          </div>
          {loading ? <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            : papers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 border-2 border-dashed border-border rounded-xl">
                <BookOpen className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm font-medium">No research papers yet</p>
                <p className="text-xs text-muted-foreground">Upload your first paper to get started.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                <AnimatePresence>
                  {papers.map(paper => (
                    <motion.div key={paper.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                      <Card className="p-4 border border-border group relative hover:border-accent/30 transition-all">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0"><FileText className="w-4 h-4 text-accent" /></div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold leading-snug truncate">{paper.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{paper.authors}, {paper.year}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">{paper.content.length.toLocaleString()} chars</p>
                            </div>
                          </div>
                          <button onClick={e => handleDelete(paper.id, e)}
                            className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${confirmDelete === paper.id ? 'bg-destructive/10 text-destructive' : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive'}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {confirmDelete === paper.id && <p className="text-[10px] text-destructive mt-2 text-right font-bold uppercase tracking-wider">Click again to confirm</p>}
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
        </div>
      </div>
    </motion.div>
  );
}
