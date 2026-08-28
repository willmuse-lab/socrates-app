import React from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { ArrowRight, ShieldOff, EyeOff, Sparkles, Search, Wand2, GraduationCap, Check } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onNavigate: (view: string) => void;
}

// Public marketing homepage shown to logged-OUT visitors (so marketers,
// prospects, press and search engines can see what SocratesIQ is without an
// account). Login only gates the actual tool. Copy is deliberately honest —
// no fabricated stats; the one research figure (Furze et al. 2024) is real and
// attributed. Uses the reskin design tokens (.section-ink / .eyebrow / .ink-card).
export function LandingPage({ onGetStarted, onNavigate }: LandingPageProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1">

      {/* HERO (dark) */}
      <section className="section-ink px-6 md:px-10 py-20 md:py-28">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <p className="eyebrow">For middle school, high school &amp; college teachers</p>
            <h1 className="text-4xl md:text-6xl font-semibold leading-[1.05]">The AI-resilient assignment redesign platform</h1>
            <p className="on-ink-muted text-lg leading-relaxed max-w-xl">Your assignments stopped working. Students aren't struggling anymore. They're outsourcing. SocratesIQ redesigns the assignments you already use so the human thinking becomes unavoidable.</p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button onClick={onGetStarted} size="lg" className="gap-2 bg-on-ink text-ink hover:bg-on-ink/90">
                Redesign an assignment free <ArrowRight className="w-4 h-4" />
              </Button>
              <a href="#how" className="inline-flex items-center justify-center h-10 px-8 rounded-full border border-white/25 text-on-ink text-sm font-medium hover:bg-white/10 transition-colors">
                See how it works
              </a>
            </div>
            <p className="text-xs on-ink-muted">Your first 2 redesigns are free. No credit card.</p>
          </div>
          {/* Product peek — a real before→after score */}
          <div className="ink-card p-6 md:p-8 space-y-5">
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.2em] on-ink-accent">AI Resilience Score</p>
            <div className="flex items-center justify-around">
              <div className="text-center">
                <div className="text-5xl font-semibold text-on-ink">24</div>
                <p className="text-xs on-ink-muted mt-1">Original</p>
              </div>
              <ArrowRight className="w-6 h-6 on-ink-muted" />
              <div className="text-center">
                <div className="text-5xl font-semibold on-ink-accent">87</div>
                <p className="text-xs on-ink-muted mt-1">Redesigned</p>
              </div>
            </div>
            <div className="border-t border-white/10 pt-4 space-y-2">
              {["Anchored to this week's class discussion", "Requires the student's own evidence", 'Grades the process, not just the product'].map(t => (
                <div key={t} className="flex items-start gap-2 text-sm on-ink-muted"><Check className="w-4 h-4 on-ink-accent mt-0.5 shrink-0" />{t}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* THE PROBLEM (paper) */}
      <section className="px-6 md:px-10 py-20 md:py-24">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <p className="eyebrow">The assignment problem</p>
            <h2 className="text-3xl md:text-4xl font-semibold">Most schools are fighting AI the wrong way</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { Icon: ShieldOff, title: 'Ban it', body: 'Block AI and police every submission. But your students graduate into a world where every employer expects them to work alongside it.' },
              { Icon: EyeOff, title: 'Ignore it', body: "Students hand in polished work that isn't theirs. You grade thinking you never actually saw." },
              { Icon: Sparkles, title: 'Redesign it', body: 'Rebuild the assignment so AI can assist but cannot replace the student. The thinking stays human, and the work gets better.', highlight: true },
            ].map(({ Icon, title, body, highlight }) => (
              <div key={title} className={`rounded-2xl border p-7 space-y-3 ${highlight ? 'border-accent bg-accent/5' : 'border-border bg-card'}`}>
                <Icon className={`w-6 h-6 ${highlight ? 'text-accent' : 'text-muted-foreground'}`} />
                <h3 className="font-serif text-xl font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS (dark) */}
      <section id="how" className="section-ink px-6 md:px-10 py-20 md:py-24">
        <div className="max-w-5xl mx-auto space-y-14">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <p className="eyebrow">How it works</p>
            <h2 className="text-3xl md:text-5xl font-semibold">Three steps, about five minutes</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { num: '1', title: 'Analyze', body: 'Paste or upload an assignment you already use. Get a 0–100 AI Resilience Score and exactly where AI can replace student thinking.' },
              { num: '2', title: 'Transform', body: 'Choose a redesign (Quick Fix, Rebuild, or Reinvent) tuned to your AI strategy. Each one is rewritten and ready to hand out.' },
              { num: '3', title: 'Teach', body: 'Generate a full lesson plan and student directions, aligned to your standards. Download as PDF, Word, or Google Doc.' },
            ].map(s => (
              <div key={s.num} className="ink-card p-7 space-y-4">
                <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center on-ink-accent font-serif text-lg font-semibold">{s.num}</div>
                <h3 className="font-serif text-2xl font-semibold text-on-ink">{s.title}</h3>
                <p className="text-sm on-ink-muted leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY IT WORKS / research (paper) */}
      <section id="research" className="px-6 md:px-10 py-20 md:py-24">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-start">
          <div className="space-y-5">
            <p className="eyebrow">Why it works</p>
            <h2 className="text-3xl md:text-4xl font-semibold">Informed by research, not guesswork</h2>
            <p className="text-muted-foreground leading-relaxed">SocratesIQ's methodology is informed by published work on AI and assessment. The idea is simple: detection is a losing game. Redesign the task instead, so the cost of using AI exceeds the cost of doing the work honestly.</p>
            <p className="text-muted-foreground leading-relaxed">In a published university pilot (Furze et al., 2024), redesigning assignments this way (with no bans and no detection software) brought AI-related misconduct cases down to zero.</p>
            <button onClick={() => onNavigate('scoring')} className="text-sm font-bold uppercase tracking-wider text-accent hover:underline">How the score works →</button>
          </div>
          <div className="bg-card rounded-2xl border border-border p-7 space-y-4">
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.2em] text-muted-foreground">The four dimensions it scores</p>
            {[
              ['Anchor', "Tied to your class, this week, this town: context AI can't know."],
              ['Proprietary', 'Built on your own classroom materials, not the open web.'],
              ['Audit', 'Grades the process and the thinking, not just the final product.'],
              ['Agency', "Requires the student's own voice, choices, and experience."],
            ].map(([name, desc]) => (
              <div key={name} className="border-t border-border pt-4 first:border-t-0 first:pt-0">
                <p className="font-serif text-lg font-semibold">{name}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TEACHER-BUILT trust (dark) */}
      <section className="section-ink px-6 md:px-10 py-16 md:py-20">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <p className="eyebrow">Built by a teacher</p>
          <h2 className="text-2xl md:text-4xl font-semibold">Your expertise comes first</h2>
          <p className="on-ink-muted text-lg leading-relaxed">SocratesIQ doesn't replace your teaching. It helps you redesign the assignments you've refined for years, preserving your goals, your voice, and your judgment. Built by a teacher, not a tech company.</p>
        </div>
      </section>

      {/* PRICING teaser (paper) */}
      <section id="pricing" className="px-6 md:px-10 py-20 md:py-24">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <p className="eyebrow">Pricing</p>
          <h2 className="text-3xl md:text-4xl font-semibold">Start free. Upgrade when it earns its keep.</h2>
          <p className="text-muted-foreground text-lg">Your first <strong>2 assignment redesigns are free</strong>. No credit card. After that, an individual teacher plan is <strong>$9.99/month</strong> (or $99.99/year) for 15 redesigns a month, with every follow-up free.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={onGetStarted} size="lg" className="gap-2">Get started free <ArrowRight className="w-4 h-4" /></Button>
            <Button onClick={() => onNavigate('pricing')} variant="outline" size="lg">See full pricing</Button>
          </div>
          <p className="text-xs text-muted-foreground">Schools &amp; districts: <button onClick={() => onNavigate('pricing')} className="text-accent font-semibold hover:underline">custom pricing</button>.</p>
        </div>
      </section>

      {/* FAQ (dark) */}
      <section id="faq" className="section-ink px-6 md:px-10 py-20 md:py-24">
        <div className="max-w-3xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <p className="eyebrow">FAQ</p>
            <h2 className="text-3xl md:text-4xl font-semibold">Common questions</h2>
          </div>
          <div className="space-y-4">
            {[
              ['I already use AI detection tools. Isn’t that enough?', 'Detection is unreliable and punishes honest students. Redesigning the assignment makes detection irrelevant. The task itself can’t be outsourced.'],
              ['Doesn’t this make teaching harder?', 'The opposite. You bring an assignment you already use; SocratesIQ does the redesign, the lesson plan, and the student directions. You keep what works.'],
              ['What grades and subjects does it fit?', 'It tailors every redesign to your subject and grade level, from middle school through college, across subjects.'],
              ['Do you store student data?', 'No. SocratesIQ is for teachers analyzing their own assignment prompts. Please don’t submit student names or work. See the Privacy page.'],
            ].map(([q, a]) => (
              <div key={q} className="ink-card p-6 space-y-2">
                <p className="font-serif text-lg font-semibold text-on-ink">{q}</p>
                <p className="text-sm on-ink-muted leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA (paper) */}
      <section className="px-6 md:px-10 py-20 md:py-28">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-4xl md:text-5xl font-semibold">Let's redesign your first assignment</h2>
          <p className="text-muted-foreground text-lg">Take the free trial. Bring one assignment. See what happens. No credit card, no commitment.</p>
          <Button onClick={onGetStarted} size="lg" className="gap-2">Get started free <ArrowRight className="w-4 h-4" /></Button>
          <p className="text-xs text-muted-foreground">Your first 2 redesigns are on us.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 md:px-10 py-10 border-t border-border">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} SocratesIQ · Built for educators</p>
          <div className="flex flex-wrap gap-4">
            {[['How scoring works', 'scoring'], ['Pricing', 'pricing'], ['About', 'about'], ['Help', 'help'], ['Privacy', 'privacy'], ['Terms', 'terms']].map(([l, v]) => (
              <button key={v} onClick={() => onNavigate(v)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{l}</button>
            ))}
          </div>
        </div>
      </footer>
    </motion.div>
  );
}
