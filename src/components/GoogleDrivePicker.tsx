import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Cloud, FileText, Search, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface GoogleFile { id: string; name: string; modifiedTime: string; }
interface GoogleDrivePickerProps { onFileSelected: (content: string) => void; }

export function GoogleDrivePicker({ onFileSelected }: GoogleDrivePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<GoogleFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFetchingContent, setIsFetchingContent] = useState<string | null>(null);

  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/google/files');
      if (response.status === 401) { handleConnect(); return; }
      if (!response.ok) throw new Error('Failed to fetch files');
      setFiles(await response.json());
    } catch (error) {
      toast.error('Failed to load Google Drive files');
    } finally { setIsLoading(false); }
  };

  const handleConnect = async () => {
    try {
      const response = await fetch('/api/auth/google/url');
      const { url } = await response.json();
      const authWindow = window.open(url, 'google_oauth', 'width=600,height=700');
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
          toast.success('Connected to Google Drive!');
          fetchFiles();
          window.removeEventListener('message', handleMessage);
        }
      };
      window.addEventListener('message', handleMessage);
    } catch (error) { toast.error('Failed to connect to Google'); }
  };

  const handleSelectFile = async (file: GoogleFile) => {
    setIsFetchingContent(file.id);
    try {
      const response = await fetch(`/api/google/file/${file.id}`);
      if (!response.ok) throw new Error('Failed to fetch file content');
      const { content } = await response.json();
      onFileSelected(content); setIsOpen(false);
      toast.success(`Loaded: ${file.name}`);
    } catch (error) { toast.error('Failed to load file content'); }
    finally { setIsFetchingContent(null); }
  };

  useEffect(() => { if (isOpen) fetchFiles(); }, [isOpen]);

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <>
      <Button variant="outline" className="w-full h-12 flex items-center gap-2 border-border hover:bg-secondary" onClick={() => setIsOpen(true)}>
        <Cloud className="w-5 h-5 text-accent" />Select from Google Drive
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden gap-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="flex items-center gap-2"><Cloud className="w-5 h-5 text-accent" />Google Drive</DialogTitle>
            <DialogDescription>Select a Google Doc to analyze.</DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search your docs..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>
          <ScrollArea className="h-[350px] border-t border-border">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full py-20 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <p className="text-sm text-muted-foreground">Loading your docs...</p>
              </div>
            ) : filteredFiles.length > 0 ? (
              <div className="divide-y divide-border">
                {filteredFiles.map((file) => (
                  <button key={file.id} className="w-full p-4 flex items-center gap-4 hover:bg-secondary/50 transition-colors text-left group"
                    onClick={() => handleSelectFile(file)} disabled={!!isFetchingContent}>
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate group-hover:text-accent transition-colors">{file.name}</p>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                        <Clock className="w-3 h-3" />{new Date(file.modifiedTime).toLocaleDateString()}
                      </div>
                    </div>
                    {isFetchingContent === file.id && <Loader2 className="w-4 h-4 animate-spin text-accent" />}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-20 gap-3 text-center px-10">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                  <Search className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No Google Docs found</p>
                <p className="text-xs text-muted-foreground">{searchQuery ? 'Try a different search term.' : 'Make sure you have Google Docs in your Drive.'}</p>
              </div>
            )}
          </ScrollArea>
          <div className="p-4 bg-secondary/30 border-t border-border flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
