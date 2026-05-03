import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TeacherProfile, SUBJECTS, GRADE_LEVELS, saveProfile } from '@/src/lib/profile';
import { ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface OnboardingProps {
  userName: string;
  userEmail: string;
  onComplete: (profile: TeacherProfile) => void;
}

const STEPS = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'profile', title: 'Your Profile' },
  { id: 'framework', title: 'The Framework' },
  { id: 'demo', title: 'Quick Demo' },
  { id: 'ready', title: "You're Ready" },
];

export function Onboarding({ userName, userEmail, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [subject, setSubject] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [schoolType, setSchoolType] = useState<TeacherProfile['schoolType']>('');

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  const handleComplete = () => {
    const profile: TeacherProfile = { name: userName, email: userEmail, subject, gradeLevel, schoolName, schoolType, country: '', onboardingComplete: true };
    saveProfile(profile);
    onComplete(profile);
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg">
        <div className="flex justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-accent' : i < step ? 'w-4 bg-accent/40' : 'w-4 bg-border'}`} />
          ))}
        </div>
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="welcome" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="bg-card border border-border rounded-2xl p-8 space-y-6 text-center">
              <div className="w-20 h-20 mx-auto"><img src="/logo.png" alt="Socrates" className="w-full h-full object-contain" /></div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold font-serif italic">Welcome, {userName.split(' ')[0]}.</h1>
                <p className="text-muted-foreground leading-relaxed">Socrates helps you design assignments that <strong>AI cannot shortcut</strong>. This takes 90 seconds to set up.</p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-left">
                {[{ icon: '🎯', label: 'Analyze', desc: 'Score any assignment for AI resilience' }, { icon: '✏️', label: 'Redesign', desc: 'Get three improved versions instantly' }, { icon: '📚', label: 'Research', desc: 'Backed by the latest pedagogy research' }].map(item => (
                  <div key={item.label} className="bg-secondary/40 rounded-xl p-3 space-y-1">
                    <div className="text-xl">{item.icon}</div>
                    <div className="text-xs font-bold">{item.label}</div>
                    <div className="text-[10px] text-muted-foreground leading-tight">{item.desc}</div>
                  </div>
                ))}
              </div>
              <Button className="w-full h-12 text-sm font-bold" onClick={next}>Get started <ArrowRight className="w-4 h-4 ml-2" /></Button>
            </motion.div>
          )}
          {step === 1 && (
            <motion.div key="profile" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="bg-card border border-border rounded-2xl p-8 space-y-6">
              <div><h2 className="text-2xl font-bold font-serif italic">Tell us about your teaching</h2>
                <p className="text-sm text-muted-foreground">Socrates tailors every suggestion to your subject and students.</p></div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">What subject do you teach?</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {SUBJECTS.map(s => (
                      <button key={s} onClick={() => setSubject(s)}
                        className={`text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${subject === s ? 'border-accent bg-accent/10 text-accent' : 'border-border hover:border-accent/40'}`}>{s}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">What grade level?</Label>
                  <div className="flex flex-wrap gap-2">
                    {GRADE_LEVELS.map(g => (
                      <button key={g} onClick={() => setGradeLevel(g)}
                        className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${gradeLevel === g ? 'border-accent bg-accent/10 text-accent' : 'border-border hover:border-accent/40'}`}>{g}</button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">School name (optional)</Label>
                    <Input placeholder="e.g. Lincoln High School" value={schoolName} onChange={e => setSchoolName(e.target.value)} className="border-border focus-visible:ring-accent text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">School type (optional)</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {(['public','private','charter','higher-ed'] as const).map(t => (
                        <button key={t} onClick={() => setSchoolType(t)}
                          className={`px-2 py-1 rounded border text-[10px] font-bold uppercase tracking-wider transition-all ${schoolType === t ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted-foreground hover:border-accent/40'}`}>{t}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={back} className="gap-2"><ArrowLeft className="w-4 h-4" />Back</Button>
                <Button className="flex-1 h-11 font-bold" onClick={next} disabled={!subject || !gradeLevel}>Continue <ArrowRight className="w-4 h-4 ml-1" /></Button>
              </div>
            </motion.div>
          )}
          {step === 2 && (
            <motion.div key="framework" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="bg-card border border-border rounded-2xl p-8 space-y-6">
              <div><h2 className="text-2xl font-bold font-serif italic">The Triple-A Framework</h2>
                <p className="text-sm text-muted-foreground">The three principles behind every Socrates suggestion.</p></div>
              <div className="space-y-3">
                {[
                  { color: 'bg-accent', label: 'Anchor', icon: '⚓', desc: "Ground assignments in local, personal, or current context that AI cannot access — your classroom, this week's news, your students' own community." },
                  { color: 'bg-green-600', label: 'Audit', icon: '🔍', desc: 'Assess the process, not just the product. Require draft histories, revision memos, or what I tried and why it failed reflections.' },
                  { color: 'bg-amber-600', label: 'Agency', icon: '🎯', desc: "Make the student's own voice, experience, and stakes central. Personal perspective is the one thing AI genuinely cannot replicate." },
                ].map((item, i) => (
                  <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }}
                    className="flex gap-4 p-4 bg-secondary/30 rounded-xl border border-border">
                    <div className={`w-10 h-10 ${item.color} rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>{item.icon}</div>
                    <div><div className="font-bold text-sm mb-1">{item.label}</div><div className="text-xs text-muted-foreground leading-relaxed">{item.desc}</div></div>
                  </motion.div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={back} className="gap-2"><ArrowLeft className="w-4 h-4" />Back</Button>
                <Button className="flex-1 h-11 font-bold" onClick={next}>I understand <ArrowRight className="w-4 h-4 ml-1" /></Button>
              </div>
            </motion.div>
          )}
          {step === 3 && (
            <motion.div key="demo" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="bg-card border border-border rounded-2xl p-8 space-y-6">
              <div><h2 className="text-2xl font-bold font-serif italic">See it in action</h2>
                <p className="text-sm text-muted-foreground">How a typical {subject || 'assignment'} improves at each level.</p></div>
              <div className="space-y-3">
                {[
                  { medal: '🥉', level: 'Bronze', color: 'border-orange-200 bg-orange-50', badge: 'bg-orange-100 text-orange-700', label: 'Quick fix — 5 minutes', after: 'Write a 500-word essay referencing a news article from this week and one change you\'ve personally observed in your local environment.' },
                  { medal: '🥈', level: 'Silver', color: 'border-slate-200 bg-slate-50', badge: 'bg-slate-100 text-slate-700', label: 'Deeper redesign — 15 minutes', after: 'Submit your essay AND a 200-word process note: what you tried first, why you changed direction, and one thing you\'d do differently.' },
                  { medal: '🥇', level: 'Gold', color: 'border-amber-200 bg-amber-50', badge: 'bg-amber-100 text-amber-700', label: 'Full transformation', after: 'Interview a family member about climate change they\'ve witnessed. Your essay must centre their voice and connect it to your own.' },
                ].map(item => (
                  <div key={item.level} className={`p-4 border rounded-xl ${item.color} space-y-2`}>
                    <div className="flex items-center gap-2">
                      <span>{item.medal}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${item.badge}`}>{item.level}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{item.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground italic">{item.after}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={back} className="gap-2"><ArrowLeft className="w-4 h-4" />Back</Button>
                <Button className="flex-1 h-11 font-bold" onClick={next}>Let's go <ArrowRight className="w-4 h-4 ml-1" /></Button>
              </div>
            </motion.div>
          )}
          {step === 4 && (
            <motion.div key="ready" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-8 space-y-6 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}
                className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </motion.div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold font-serif italic">You're all set!</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">Socrates will now tailor every analysis for <strong>{subject}</strong> at the <strong>{gradeLevel}</strong> level.</p>
              </div>
              <div className="bg-secondary/40 rounded-xl p-4 text-left space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Your profile</p>
                <p className="text-sm"><span className="font-medium">Subject:</span> {subject}</p>
                <p className="text-sm"><span className="font-medium">Level:</span> {gradeLevel}</p>
                {schoolName && <p className="text-sm"><span className="font-medium">School:</span> {schoolName}</p>}
              </div>
              <Button className="w-full h-12 text-sm font-bold bg-accent hover:bg-accent/90" onClick={handleComplete}>
                Open the Studio <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <button onClick={handleComplete} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Skip for now — I'll set this up later in Settings
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
