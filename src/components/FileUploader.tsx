import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Loader2 } from 'lucide-react';
import mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface FileUploaderProps {
  onTextExtracted: (text: string) => void;
}

export function FileUploader({ onTextExtracted }: FileUploaderProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setIsExtracting(true); setError(null);
    try {
      let text = '';
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText += content.items.map((item: any) => item.str).join(' ') + '\n';
        }
        text = fullText;
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else {
        text = await file.text();
      }
      if (text.trim()) { onTextExtracted(text); }
      else { setError('Could not extract text from this file.'); }
    } catch (err) {
      console.error('Extraction error:', err);
      setError('Failed to read file. Please try another format.');
    } finally { setIsExtracting(false); }
  }, [onTextExtracted]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/plain': ['.txt'], 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
    multiple: false,
  } as any);

  return (
    <div className="w-full">
      <div {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 ${isDragActive ? 'border-accent bg-accent/5' : 'border-muted-foreground/20 hover:border-accent/50 hover:bg-muted/50'}`}>
        <input {...getInputProps()} />
        <div className="p-4 rounded-full bg-accent/10 text-accent">
          {isExtracting ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
        </div>
        <div className="text-center">
          <p className="text-lg font-medium">{isDragActive ? 'Drop the assignment here' : 'Upload your assignment'}</p>
          <p className="text-sm text-muted-foreground mt-1">Drag & drop or click to browse (PDF, DOCX, TXT)</p>
        </div>
      </div>
      {error && <p className="text-sm text-destructive mt-2 flex items-center gap-2"><X className="w-4 h-4" />{error}</p>}
    </div>
  );
}
