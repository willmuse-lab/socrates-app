// ============================================================================
//  GoogleDrivePicker — "Select from Google Drive" button. Opens Google's own
//  Picker window (drive.file scope: per-file access, no Google app review),
//  reads the chosen Google Doc / PDF / Word / text file, and hands the
//  extracted text to the caller. Renders nothing until the Google env vars
//  are configured (see src/lib/google.ts).
// ============================================================================
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Cloud } from 'lucide-react';
import { toast } from 'sonner';
import { googleConfigured, pickDriveFile, readDriveFile } from '@/src/lib/google';

interface GoogleDrivePickerProps { onFileSelected: (content: string) => void; }

export function GoogleDrivePicker({ onFileSelected }: GoogleDrivePickerProps) {
  const [busy, setBusy] = useState(false);
  if (!googleConfigured) return null;

  const handleClick = async () => {
    setBusy(true);
    try {
      const file = await pickDriveFile();
      if (!file) return; // teacher closed the picker — not an error
      const text = await readDriveFile(file);
      if (!text.trim()) { toast.error('That file appears to be empty or unreadable.'); return; }
      onFileSelected(text);
      toast.success(`Loaded: ${file.name}`);
    } catch (err: any) {
      toast.error(err?.message || 'Google Drive import failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" className="w-full h-12 flex items-center gap-2 border-border hover:bg-secondary" onClick={handleClick} disabled={busy}>
      {busy ? <Loader2 className="w-5 h-5 animate-spin text-accent" /> : <Cloud className="w-5 h-5 text-accent" />}
      {busy ? 'Loading from Google Drive…' : 'Select from Google Drive'}
    </Button>
  );
}
