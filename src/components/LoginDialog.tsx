import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, Lock, User, Mail, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabaseEnabled, signInWithEmail, signUpWithEmail, signInWithProvider, requestPasswordReset } from '@/src/lib/supabase';
import { toast } from 'sonner';

// Brand marks kept inline as SVG so they render without external assets.
function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 23 23" aria-hidden="true">
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#7FBA00" d="M12 1h10v10H12z" />
      <path fill="#00A4EF" d="M1 12h10v10H1z" />
      <path fill="#FFB900" d="M12 12h10v10H12z" />
    </svg>
  );
}

interface LoginDialogProps {
  isOpen: boolean;
  onLogin: (name: string, email: string, id?: string) => void;
}

type Mode = 'login' | 'signup' | 'forgot';

export function LoginDialog({ isOpen, onLogin }: LoginDialogProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

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
    if (mode === 'forgot') {
      if (!email) return;
      setIsSubmitting(true);
      try {
        const { error: err } = await requestPasswordReset(email);
        if (err) { setError(err.message || 'Could not send the reset email. Please try again.'); return; }
        setResetSent(true);
      } catch (err: any) {
        setError(err.message || 'Something went wrong.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
    if (!email || !password || (mode === 'signup' && !name)) return;
    setIsSubmitting(true);
    try {
      if (mode === 'signup') {
        const { data, error: err } = await signUpWithEmail(email, password, name);
        if (err) { setError(err.message); return; }
        if (data?.user) { onLogin(name, email, data.user.id); }
        else { toast.info('Check your email to confirm your account, then log in.'); }
      } else {
        const { data, error: err } = await signInWithEmail(email, password);
        if (err) { setError('Invalid email or password.'); return; }
        const displayName = data?.user?.user_metadata?.name || email.split('@')[0];
        onLogin(displayName, email, data?.user?.id);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProvider = async (provider: 'google' | 'azure') => {
    setError('');
    setIsSubmitting(true);
    try {
      // Redirects the whole page to the provider; on return, App's auth
      // listener picks up the session and completes the login.
      const { error: err } = await signInWithProvider(provider);
      if (err) { setError(err.message); setIsSubmitting(false); }
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
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
            <span className="text-white font-serif italic text-xl font-bold tracking-tight">SocratesIQ</span>
          </div>
        </div>
        <div className="p-8 space-y-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-bold tracking-tight text-center">
              {isDemo ? 'Demo Gateway' : mode === 'login' ? 'Welcome Back' : mode === 'forgot' ? 'Reset Password' : 'Create Account'}
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              {isDemo ? 'Enter any name and password to access the studio.'
                : mode === 'login' ? 'Sign in to access your assignments and settings.'
                : mode === 'forgot' ? "Enter your email and we'll send you a link to reset your password."
                : 'Create an account to save your work across devices.'}
            </DialogDescription>
          </DialogHeader>
          {!isDemo && mode !== 'forgot' && (
            <div className="space-y-3">
              <Button type="button" variant="outline" onClick={() => handleProvider('google')} disabled={isSubmitting}
                className="w-full h-11 gap-2.5 text-sm font-semibold border-border hover:bg-secondary">
                <GoogleIcon />Continue with Google
              </Button>
              {/* Microsoft login hidden (Will, July 12 2026) — the Azure
                  provider was never enabled in Supabase, so the button only
                  produced errors. Restore once Azure is set up (see HANDOFF).
              <Button type="button" variant="outline" onClick={() => handleProvider('azure')} disabled={isSubmitting}
                className="w-full h-11 gap-2.5 text-sm font-semibold border-border hover:bg-secondary">
                <MicrosoftIcon />Continue with Microsoft
              </Button> */}
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or</span></div>
              </div>
            </div>
          )}
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
            {mode !== 'forgot' && (
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input type="password" placeholder="••••••••" className="pl-10 h-10 border-border focus-visible:ring-accent"
                    value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
              </div>
            )}
            {!isDemo && mode === 'login' && (
              <div className="text-right -mt-1">
                <button type="button" onClick={() => { setMode('forgot'); setError(''); setResetSent(false); }}
                  className="text-xs text-accent font-semibold hover:underline">
                  Forgot password?
                </button>
              </div>
            )}
            {mode === 'forgot' && resetSent && (
              <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                Check your email — if an account exists for that address, a reset link is on its way. It expires in about an hour. (Signed up with Google? Use the 'Continue with Google' button instead.)
              </div>
            )}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{error}
                </motion.div>
              )}
            </AnimatePresence>
            <Button type="submit" className="w-full h-11 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isSubmitting || (isDemo ? !name || !password : mode === 'forgot' ? !email || resetSent : !email || !password || (mode === 'signup' && !name))}>
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />{mode === 'forgot' ? 'Sending...' : 'Authenticating...'}</>
                : mode === 'forgot' ? (resetSent ? 'Link Sent' : 'Send Reset Link') : 'Access Studio'}
            </Button>
            {!isDemo && (
              <p className="text-xs text-center text-muted-foreground">
                {mode === 'login' ? "Don't have an account? " : mode === 'forgot' ? 'Remembered your password? ' : 'Already have an account? '}
                <button type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setResetSent(false); }}
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
