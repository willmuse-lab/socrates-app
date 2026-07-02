import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as pdfjs from 'pdfjs-dist';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Trash2, BookMarked, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  StandardsDocument,
  fetchStandardsDocuments,
  saveStandardsDocument,
  deleteStandardsDocument,
} from '@/src/lib/standards';
import { supabaseEnabled } from '@/src/lib/supabase';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface StandardsManagerProps {
  userId: string;
  /** Called whenever the selected standards document changes (or null). */
  onSelect: (doc: StandardsDocument | null) => void;
  selectedId?: string | null;
}

export function StandardsManager({ userId, onSelect, selectedId }: StandardsManagerProps) {
  const [docs, setDocs] = useState<StandardsDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [extractedFilename, setExtractedFilename] = useState('');
  const [form, setForm] = useState({ title: '', state: '', subject: '', grade_level: '' });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const data = await fetchStandardsDocuments(userId);
      setDocs(data);
      setLoading(false);
    })();
  }, [userId]);

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
      if (!text || text.length < 200) {
        toast.error('Could not extract readable text — this PDF may be a scanned image. Try a text-based version of your standards document.');
        return;
      }
      setExtractedText(text); setExtractedFilename(file.name);
      const autoTitle = file.name.replace('.pdf', '').replace(/[_-]/g, ' ');
      setForm(f => ({ ...f, title: f.title || autoTitle }));
      toast.success(`Extracted ${text.length.toLocaleString()} characters of standards text`);
    } catch {
      toast.error('Failed to read this PDF.');
    } finally {
      setExtracting(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/pdf': ['.pdf'] }, multiple: false } as any);

  const handleSave = async () => {
    if (!extractedText || !form.title) { toast.error('Upload a PDF and give it a title.'); return; }
    if (!supabaseEnabled) { toast.error('Supabase is not configured.'); return; }
    setSaving(true);
    try {
      const saved = await saveStandardsDocument(userId, {
        title: form.title, state: form.state, subject: form.subject,
        grade_level: form.grade_level, filename: extractedFilename, content: extractedText,
      });
      if (saved) {
        toast.success(`"${form.title}" saved to your standards library`);
        setDocs(prev => [saved, ...prev]);
        onSelect(saved);
        setExtractedText(''); setExtractedFilename('');
        setForm({ title: '', state: '', subject: '', grade_level: '' });
      } else {
        toast.error('Failed to save. Did you run the standards migration in Supabase?');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDelete === id) {
      await deleteStandardsDocument(id);
      setDocs(prev => prev.filter(d => d.id !== id));
      if (selectedId === id) onSelect(null);
      setConfirmDelete(null);
      toast.info('Standards document removed.');
    } else {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookMarked className="w-4 h-4 text-muted-foreground" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Your Standards (SCOS)</p>
      </div>

      {/* Existing documents */}
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Loading standards…</div>
      ) : docs.length > 0 && (
        <div className="space-y-2">
          {docs.map(doc => (
            <button
              key={doc.id}
              onClick={() => onSelect(selectedId === doc.id ? null : doc)}
              className={`w-full flex items-center justify-between p-3 rounded-xl border-2 text-left transition-all ${
                selectedId === doc.id ? 'border-teal-400 bg-teal-50' : 'border-border bg-card hover:border-teal-200'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {selectedId === doc.id
                  ? <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  : <FileText className="w-4 h-4 text-muted-foreground shrink-0" />}
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{doc.title}</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {[doc.state, doc.subject, doc.grade_level && `Grade ${doc.grade_level}`].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </div>
              <span
                role="button"
                onClick={(e) => handleDelete(doc.id, e)}
                className={`shrink-0 p-1.5 rounded-lg transition-colors ${confirmDelete === doc.id ? 'bg-red-100 text-red-600' : 'text-muted-foreground hover:text-red-500'}`}
                title={confirmDelete === doc.id ? 'Click again to confirm' : 'Delete'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Upload zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-teal-400 bg-teal-50' : 'border-border hover:border-teal-300'
        }`}
      >
        <input {...getInputProps()} />
        {extracting ? (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Reading PDF…
          </div>
        ) : extractedText ? (
          <div className="flex items-center justify-center gap-2 text-xs text-teal-700 font-medium">
            <CheckCircle2 className="w-4 h-4" /> {extractedFilename} ready — fill in details below
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <Upload className="w-5 h-5" />
            <p className="text-xs font-medium">Drop your SCOS / standards PDF here</p>
            <p className="text-[10px]">Your state's Standard Course of Study document (text-based PDF)</p>
          </div>
        )}
      </div>

      {/* Metadata form, shown after extraction */}
      <AnimatePresence>
        {extractedText && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Label className="text-[10px] uppercase tracking-wider">Title</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="NC SCOS — 7th Grade ELA" className="h-9 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider">State</Label>
                <Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="NC" className="h-9 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider">Grade</Label>
                <Input value={form.grade_level} onChange={e => setForm(f => ({ ...f, grade_level: e.target.value }))} placeholder="7" className="h-9 text-xs" />
              </div>
              <div className="col-span-2">
                <Label className="text-[10px] uppercase tracking-wider">Subject</Label>
                <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="English Language Arts" className="h-9 text-xs" />
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full h-9 text-xs">
              {saving ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Saving…</> : 'Save to my standards library'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
