import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Loader2, AlertCircle, KeyRound } from 'lucide-react';
import { updatePassword } from '@/src/lib/supabase';
import { toast } from 'sonner';

interface ResetPasswordDialogProps {
  isOpen: boolean;
  onDone: () => void;
}

export function ResetPasswordDialog({ isOpen, onDone }: ResetPasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setIsSubmitting(true);
    try {
      const { error: err } = await updatePassword(password);
      if (err) { setError(err.message || 'Could not update your password. Try requesting a new reset link.'); return; }
      toast.success('Password updated! You are now signed in.');
      setPassword(''); setConfirm('');
      onDone();
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[400px] border-border bg-card shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="w-12 h-12 mx-auto bg-accent/10 rounded-xl flex items-center justify-center">
            <KeyRound className="w-6 h-6 text-accent" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-center">Choose a New Password</DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Enter a new password for your SocratesIQ account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input type="password" placeholder="At least 6 characters" className="pl-10 h-10 border-border focus-visible:ring-accent"
                value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input type="password" placeholder="Type it again" className="pl-10 h-10 border-border focus-visible:ring-accent"
                value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{error}
            </div>
          )}
          <Button type="submit" className="w-full h-11 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={isSubmitting || !password || !confirm}>
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : 'Save New Password'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
