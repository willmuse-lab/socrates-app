import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Check, X, ArrowRight, Zap, Mail } from 'lucide-react';

interface PricingProps { onBack: () => void; }

const CONTACT_MAILTO = 'mailto:socratesiqed@gmail.com?subject=SocratesIQ%20school%20%2F%20district%20pricing';

export function Pricing({ onBack }: PricingProps) {
  const [billing, setBilling] = useState<'annual' | 'monthly'>('annual');

  const teacherMonthly = 9.99;
  const teacherAnnual = 99.99;
  const teacherPerMonth = billing === 'annual' ? (teacherAnnual / 12).toFixed(2) : teacherMonthly.toFixed(2);
  const teacherSaving = Math.round((1 - teacherAnnual / (teacherMonthly * 12)) * 100);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto p-6 md:p-10 space-y-12">
      <div className="text-center space-y-4">
        <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Back to Studio</button>
        <h1 className="text-4xl font-bold font-serif italic">Pricing that scales with you</h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">Simple pricing for individual teachers. Schools and districts: let's talk.</p>
        <div className="inline-flex items-center gap-1 bg-secondary rounded-full p-1">
          <button onClick={() => setBilling('annual')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${billing === 'annual' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}>
            Annual <span className="text-green-600 ml-1">Save {teacherSaving}%</span>
          </button>
          <button onClick={() => setBilling('monthly')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${billing === 'monthly' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}>Monthly</button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 items-start">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card border-2 border-accent ring-2 ring-accent/20 rounded-2xl p-6 space-y-6 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-accent text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1"><Zap className="w-3 h-3" />For teachers</span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Individual</p>
            <h3 className="text-xl font-bold">Teacher</h3>
            <div className="flex items-end gap-1 mt-2"><span className="text-4xl font-bold">${teacherPerMonth}</span><span className="text-muted-foreground text-sm mb-1">/month</span></div>
            {billing === 'annual' && <p className="text-xs text-green-600 font-medium">Billed as ${teacherAnnual}/year</p>}
            <p className="text-sm text-muted-foreground pt-1">Everything you need, for one teacher.</p>
          </div>
          <Button className="w-full gap-2 font-bold bg-accent hover:bg-accent/90">Get started <ArrowRight className="w-4 h-4" /></Button>
          <div className="space-y-2.5">
            {['Unlimited assignment analyses','Bronze, Silver & Gold redesigns','Personal assignment library','PDF & Word export','Research-backed suggestions'].map(f => (
              <div key={f} className="flex items-start gap-2.5 text-xs"><Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />{f}</div>
            ))}
            {['School admin dashboard','Teacher management','LMS integration'].map(f => (
              <div key={f} className="flex items-start gap-2.5 text-xs text-muted-foreground/50"><X className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{f}</div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card border-2 border-border rounded-2xl p-6 space-y-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Whole school</p>
            <h3 className="text-xl font-bold">School</h3>
            <div className="flex items-end gap-1 mt-2"><span className="text-3xl font-bold font-serif italic">Call for pricing</span></div>
            <p className="text-sm text-muted-foreground pt-2">Every teacher in your building, priced for your school's size and needs.</p>
          </div>
          <Button variant="outline" className="w-full gap-2 font-bold" onClick={() => window.location.href = CONTACT_MAILTO}>
            <Mail className="w-4 h-4" />Contact us
          </Button>
          <div className="space-y-2.5">
            {['Everything in Teacher plan','School admin dashboard','Teacher management & invites','Usage analytics by department','Priority support','Data processing agreement (FERPA)'].map(f => (
              <div key={f} className="flex items-start gap-2.5 text-xs"><Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />{f}</div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card border-2 border-border rounded-2xl p-6 space-y-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Whole district</p>
            <h3 className="text-xl font-bold">District</h3>
            <div className="flex items-end gap-1 mt-2"><span className="text-3xl font-bold font-serif italic">Call for pricing</span></div>
            <p className="text-sm text-muted-foreground pt-2">Unlimited teachers across all your schools, with district-level rollout support.</p>
          </div>
          <Button variant="outline" className="w-full gap-2 font-bold" onClick={() => window.location.href = CONTACT_MAILTO}>
            <Mail className="w-4 h-4" />Contact us
          </Button>
          <div className="space-y-2.5">
            {['Everything in School plan','Unlimited schools in district','District-wide analytics','SSO / Google Workspace login','LMS integration (Canvas & Classroom)','Dedicated onboarding call','Custom data processing agreement'].map(f => (
              <div key={f} className="flex items-start gap-2.5 text-xs"><Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />{f}</div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="max-w-2xl mx-auto space-y-4">
        <h2 className="text-xl font-bold text-center font-serif italic">Common questions</h2>
        {[
          { q: 'Is there a free trial?', a: 'Yes — sign up and use SocratesIQ free for 14 days with no credit card required.' },
          { q: 'How does school and district pricing work?', a: "Every school is different, so we price school and district plans individually. Email socratesiqed@gmail.com and we'll put together a quote for your size and needs." },
          { q: 'Is student work sent to AI companies?', a: "Assignment text is sent to Anthropic's Claude API for analysis only — it is not stored or used for training. We never collect student PII." },
          { q: 'Do you offer discounts for Title I schools?', a: 'Yes. Email socratesiqed@gmail.com and we\'ll work something out.' },
        ].map(({ q, a }) => (
          <div key={q} className="bg-secondary/30 rounded-xl p-4 space-y-1 border border-border">
            <p className="text-sm font-bold">{q}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{a}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
