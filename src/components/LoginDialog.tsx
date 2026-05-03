import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, Lock, User, Mail, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabaseEnabled, signInWithEmail, signUpWithEmail } from '@/src/lib/supabase';
import { toast } from 'sonner';

interface LoginDialogProps {
  isOpen: boolean;
  onLogin: (name: string, email: string) => void;
}

type Mode = 'login' | 'signup';

export function LoginDialog({ isOpen, onLogin }: LoginDialogProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!supabaseEnabled) {
      if (!name || !password) return;
      setIsSubmitting(true);
      setTimeout(() => {
        const demoEmail = `${name.toLowerCase().replace(/\s+/g, '.')}@demo.local`;
        onLogin(name, demoEmail);
        setIsSubmitting(false);
      }, 800);
      return;
    }
    if (!email || !password || (mode === 'signup' && !name)) return;
    setIsSubmitting(true);
    try {
      if (mode === 'signup') {
        const { data, error: err } = await signUpWithEmail(email, password, name);
        if (err) { setError(err.message); return; }
        if (data?.user) { onLogin(name, email); }
        else { toast.info('Check your email to confirm your account, then log in.'); }
      } else {
        const { data, error: err } = await signInWithEmail(email, password);
        if (err) { setError('Invalid email or password.'); return; }
        const displayName = data?.user?.user_metadata?.name || email.split('@')[0];
        onLogin(displayName, email);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDemo = !supabaseEnabled;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden border-border bg-card shadow-2xl">
        <div className="relative h-32 bg-primary flex items-center justify-center overflow-hidden">
          <div className="relative flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <GraduationCap className="w-7 h-7 text-primary" />
            </div>
            <span className="text-white font-serif italic text-xl font-bold tracking-tight">Socrates Studio</span>
          </div>
        </div>
        <div className="p-8 space-y-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-bold tracking-tight text-center">
              {isDemo ? 'Demo Gateway' : mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              {isDemo ? 'Enter any name and password to access the studio.'
                : mode === 'login' ? 'Sign in to access your assignments and settings.'
                : 'Create an account to save your work across devices.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {(isDemo || mode === 'signup') && (
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="e.g. Ms. Johnson" className="pl-10 h-10 border-border focus-visible:ring-accent"
                    value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
              </div>
            )}
            {!isDemo && (
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input type="email" placeholder="you@school.edu" className="pl-10 h-10 border-border focus-visible:ring-accent"
                    value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input type="password" placeholder="••••••••" className="pl-10 h-10 border-border focus-visible:ring-accent"
                  value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </div>
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{error}
                </motion.div>
              )}
            </AnimatePresence>
            <Button type="submit" className="w-full h-11 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isSubmitting || (isDemo ? !name || !password : !email || !password || (mode === 'signup' && !name))}>
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Authenticating...</> : 'Access Studio'}
            </Button>
            {!isDemo && (
              <p className="text-xs text-center text-muted-foreground">
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
                  className="text-accent font-bold hover:underline">
                  {mode === 'login' ? 'Sign up' : 'Log in'}
                </button>
              </p>
            )}
            {isDemo && (
              <p className="text-[10px] text-center text-muted-foreground italic">
                Demo mode: any name + password will work. Add Supabase credentials for real accounts.
              </p>
            )}
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
