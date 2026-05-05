import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, Check, Users } from 'lucide-react';
import { DifferentiatedVersions } from '@/src/lib/gemini';
import { toast } from 'sonner';

interface DifferentiationPanelProps {
  versions: DifferentiatedVersions;
  level: string;
}

const VARIANTS = [
  { key: 'iep' as const, label: 'IEP / 504', emoji: '🤝', color: 'border-purple-200 bg-purple-50', activeColor: 'border-purple-400 bg-purple-100', badge: 'bg-purple-100 text-purple-700', desc: 'Scaffolded version with sentence starters, simplified language, and step-by-step structure.' },
  { key: 'ell' as const, label: 'ELL Support', emoji: '🌍', color: 'border-blue-200 bg-blue-50', activeColor: 'border-blue-400 bg-blue-100', badge: 'bg-blue-100 text-blue-700', desc: 'Adapted for English Language Learners — key terms defined, reduced idioms, added context.' },
  { key: 'gifted' as const, label: 'Gifted / Advanced', emoji: '🚀', color: 'border-amber-200 bg-amber-50', activeColor: 'border-amber-400 bg-amber-100', badge: 'bg-amber-100 text-amber-700', desc: 'Extended version with deeper complexity, additional challenge, and higher-order thinking.' },
];

export function DifferentiationPanel({ versions, level }: DifferentiationPanelProps) {
  const [active, setActive] = useState<'iep' | 'ell' | 'gifted' | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-muted-foreground" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Differentiated versions — {level}</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {VARIANTS.map(v => (
          <button key={v.key} onClick={() => setActive(active === v.key ? null : v.key)}
            className={`p-3 rounded-xl border-2 text-left transition-all ${active === v.key ? v.activeColor : v.color} hover:opacity-90`}>
            <div className="text-lg mb-1">{v.emoji}</div>
            <div className="text-xs font-bold leading-tight">{v.label}</div>
          </button>
        ))}
      </div>
      <AnimatePresence>
        {active && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            {VARIANTS.filter(v => v.key === active).map(v => (
              <div key={v.key} className={`border-2 rounded-xl overflow-hidden ${v.activeColor}`}>
                <div className="flex items-center justify-between px-4 py-2 border-b border-black/10">
                  <div className="flex items-center gap-2">
                    <span>{v.emoji}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${v.badge}`}>{v.label}</span>
                  </div>
                  <button onClick={() => handleCopy(versions[v.key])}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors">
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="p-4">
                  <p className="text-[10px] text-muted-foreground italic mb-3">{v.desc}</p>
                  <div className="text-xs leading-relaxed whitespace-pre-wrap text-foreground/80 bg-white/60 rounded-lg p-3 border border-black/10 max-h-48 overflow-y-auto">
                    {versions[v.key]}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
