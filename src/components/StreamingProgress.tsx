import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface StreamingProgressProps {
  stage: string;
  percent: number;
  isVisible: boolean;
}

const TIPS = [
  "Socrates reads your uploaded research papers before every analysis.",
  "The Triple-A framework is grounded in UNESCO's 2023 AI competency guidelines.",
  "Bronze is achievable today. Gold is transformational.",
  "Mrs. Davis found students knew more about the novel than AI did.",
  "Mr. Muse no longer uses AI as the 'bad guy' — it's a learning tool.",
  "Differentiated versions are generated automatically for IEP, ELL, and gifted learners.",
];

export function StreamingProgress({ stage, percent, isVisible }: StreamingProgressProps) {
  const [tipIndex, setTipIndex] = useState(0);
  const [displayPercent, setDisplayPercent] = useState(0);

  useEffect(() => {
    if (!isVisible) { setDisplayPercent(0); return; }
    const interval = setInterval(() => {
      setTipIndex(i => (i + 1) % TIPS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [isVisible]);

  useEffect(() => {
    if (percent > displayPercent) {
      const step = Math.max(1, Math.floor((percent - displayPercent) / 8));
      const timer = setTimeout(() => setDisplayPercent(p => Math.min(p + step, percent)), 40);
      return () => clearTimeout(timer);
    }
  }, [percent, displayPercent]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
          className="flex flex-col items-center justify-center py-16 px-8 space-y-8 max-w-md mx-auto">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping" />
            <div className="relative w-16 h-16 rounded-full border-2 border-accent/30 flex items-center justify-center bg-card">
              <img src="/logo.png" alt="Socrates" className="w-10 h-10 object-contain" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <AnimatePresence mode="wait">
              <motion.p key={stage} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                className="text-sm font-medium text-foreground">{stage}</motion.p>
            </AnimatePresence>
          </div>
          <div className="w-full space-y-2">
            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
              <motion.div className="h-full bg-accent rounded-full" style={{ width: `${displayPercent}%` }} transition={{ duration: 0.3, ease: "easeOut" }} />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Analyzing</span><span>{displayPercent}%</span>
            </div>
          </div>
          <div className="bg-secondary/40 rounded-xl px-4 py-3 w-full border border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Did you know?</p>
            <AnimatePresence mode="wait">
              <motion.p key={tipIndex} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }} className="text-xs text-muted-foreground leading-relaxed">{TIPS[tipIndex]}</motion.p>
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
