import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Check, X, ArrowRight, Zap, Mail } from 'lucide-react';

interface PricingProps { onBack: () => void; }

export function Pricing({ onBack }: PricingProps) {
  const [billing, setBilling] = useState<'annual' | 'monthly'>('annual');
  const [staffCount, setStaffCount] = useState(25);
  const [schoolCount, setSchoolCount] = useState(5);

  const schoolPricePerStaff = (count: number) => {
    if (count <= 10) return 6.99;
    if (count <= 25) return 5.99;
    if (count <= 50) return 4.99;
    if (count <= 100) return 3.99;
    return 2.99;
  };

  const districtPricePerSchool = (count: number) => {
    if (count <= 3) return 899;
    if (count <= 10) return 799;
    if (count <= 25) return 699;
    if (count <= 50) return 599;
    return 499;
  };

  const teacherMonthly = 9.99;
  const teacherAnnual = 79.99;
  const teacherPerMonth = billing === 'annual' ? (teacherAnnual / 12).toFixed(2) : teacherMonthly.toFixed(2);
  const teacherSaving = Math.round((1 - teacherAnnual / (teacherMonthly * 12)) * 100);
  const schoolRate = schoolPricePerStaff(staffCount);
  const schoolTotal = billing === 'annual' ? (staffCount * schoolRate).toFixed(0) : (staffCount * schoolRate / 12).toFixed(0);
  const districtRate = districtPricePerSchool(schoolCount);
  const districtTotal = billing === 'annual' ? (schoolCount * districtRate).toFixed(0) : (schoolCount * districtRate / 12).toFixed(0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto p-6 md:p-10 space-y-12">
      <div className="text-center space-y-4">
        <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Back to Studio</button>
        <h1 className="text-4xl font-bold font-serif italic">Pricing that scales with you</h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">Pay for what you use. Individual teachers, whole schools, or entire districts — everyone gets full access.</p>
        <div className="inline-flex items-center gap-1 bg-secondary rounded-full p-1">
          <button onClick={() => setBilling('annual')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${billing === 'annual' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}>
            Annual <span className="text-green-600 ml-1">Save {teacherSaving}%</span>
          </button>
          <button onClick={() => setBilling('monthly')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${billing === 'monthly' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}>Monthly</button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 items-start">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border-2 border-border rounded-2xl p-6 space-y-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Individual</p>
            <h3 className="text-xl font-bold">Teacher</h3>
            <div className="flex items-end gap-1 mt-2"><span className="text-4xl font-bold">${teacherPerMonth}</span><span className="text-muted-foreground text-sm mb-1">/month</span></div>
            {billing === 'annual' && <p className="text-xs text-green-600 font-medium">Billed as ${teacherAnnual}/year</p>}
            <p className="text-sm text-muted-foreground pt-1">Everything you need, for one teacher.</p>
          </div>
          <Button variant="outline" className="w-full gap-2 font-bold">Get started <ArrowRight className="w-4 h-4" /></Button>
          <div className="space-y-2.5">
            {['Unlimited assignment analyses','Bronze, Silver & Gold redesigns','IEP/ELL/Gifted differentiation','Personal assignment library','PDF, DOCX & Google Docs export','Google Drive import','Research-backed suggestions'].map(f => (
              <div key={f} className="flex items-start gap-2.5 text-xs"><Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />{f}</div>
            ))}
            {['School admin dashboard','Teacher management','LMS integration'].map(f => (
              <div key={f} className="flex items-start gap-2.5 text-xs text-muted-foreground/50"><X className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{f}</div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card border-2 border-accent ring-2 ring-accent/20 rounded-2xl p-6 space-y-6 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-accent text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1"><Zap className="w-3 h-3" />Most popular</span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Whole school</p>
            <h3 className="text-xl font-bold">School</h3>
            <div className="flex items-end gap-1 mt-2"><span className="text-4xl font-bold">${schoolTotal}</span><span className="text-muted-foreground text-sm mb-1">/{billing === 'annual' ? 'year' : 'month'}</span></div>
            <p className="text-xs text-accent font-medium">${schoolRate.toFixed(2)}/staff · {staffCount} teachers</p>
            <p className="text-sm text-muted-foreground pt-1">Unlimited teachers at one school.</p>
          </div>
          <div className="space-y-2 bg-secondary/40 rounded-xl p-4">
            <div className="flex justify-between text-xs"><span className="font-bold text-muted-foreground uppercase tracking-wider">Staff using Socrates</span><span className="font-bold text-accent">{staffCount} teachers</span></div>
            <input type="range" min={5} max={200} step={5} value={staffCount} onChange={e => setStaffCount(Number(e.target.value))} className="w-full accent-accent" />
            <p className="text-[10px] text-muted-foreground">1-10: $6.99 · 11-25: $5.99 · 26-50: $4.99 · 51-100: $3.99 · 100+: $2.99</p>
          </div>
          <Button className="w-full gap-2 font-bold bg-accent hover:bg-accent/90">Get school plan <ArrowRight className="w-4 h-4" /></Button>
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
            <div className="flex items-end gap-1 mt-2"><span className="text-4xl font-bold">${districtTotal}</span><span className="text-muted-foreground text-sm mb-1">/{billing === 'annual' ? 'year' : 'month'}</span></div>
            <p className="text-xs text-purple-600 font-medium">${districtRate.toLocaleString()}/school · {schoolCount} schools</p>
            <p className="text-sm text-muted-foreground pt-1">Unlimited teachers across all schools.</p>
          </div>
          <div className="space-y-2 bg-secondary/40 rounded-xl p-4">
            <div className="flex justify-between text-xs"><span className="font-bold text-muted-foreground uppercase tracking-wider">Schools in district</span><span className="font-bold text-purple-600">{schoolCount} schools</span></div>
            <input type="range" min={2} max={100} step={1} value={schoolCount} onChange={e => setSchoolCount(Number(e.target.value))} className="w-full accent-purple-500" />
            <p className="text-[10px] text-muted-foreground">2-3: $899 · 4-10: $799 · 11-25: $699 · 26-50: $599 · 50+: $499</p>
          </div>
          <Button variant="outline" className="w-full gap-2 font-bold" onClick={() => window.location.href = 'mailto:hello@socratesmuse.com'}>
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
          { q: 'Is there a free trial?', a: 'Yes — sign up and use Socrates free for 14 days with no credit card required.' },
          { q: 'How does school pricing work?', a: 'You pay per staff member using Socrates, billed annually. The more teachers you add, the lower the per-person rate.' },
          { q: 'Is student work sent to AI companies?', a: "Assignment text is sent to Anthropic's Claude API for analysis only — it is not stored or used for training. We never collect student PII." },
          { q: 'Do you offer discounts for Title I schools?', a: 'Yes. Email hello@socratesmuse.com and we\'ll work something out.' },
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
