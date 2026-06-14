import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Quote } from 'lucide-react';
import { TEACHER_COMMENTS } from '@/src/lib/comments';

interface StreamingProgressProps {
  stage: string;
  percent: number;
  isVisible: boolean;
}

// Duplicate the list so the marquee can loop seamlessly without a visible gap.
const SCROLLING = [...TEACHER_COMMENTS, ...TEACHER_COMMENTS];

export function StreamingProgress({ stage, percent, isVisible }: StreamingProgressProps) {
  const [displayPercent, setDisplayPercent] = useState(0);

  useEffect(() => {
    if (!isVisible) setDisplayPercent(0);
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
          className="flex flex-col items-center justify-center py-16 space-y-8 w-full">
          <div className="flex flex-col items-center space-y-8 px-8 max-w-md">
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
          </div>

          {/* Scrolling teacher comments */}
          <div className="w-full overflow-hidden py-2 relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent z-10" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent z-10" />
            <p className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">What teachers are saying</p>
            <motion.div
              className="flex gap-4 w-max"
              animate={{ x: ['0%', '-50%'] }}
              transition={{ duration: SCROLLING.length * 4, ease: 'linear', repeat: Infinity }}
            >
              {SCROLLING.map((c, i) => (
                <div key={i} className="flex items-start gap-2 bg-secondary/40 border border-border rounded-xl px-4 py-3 w-72 shrink-0">
                  <Quote className="w-3.5 h-3.5 text-accent opacity-50 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs text-foreground leading-snug italic">"{c.quote}"</p>
                    <p className="text-[10px] text-muted-foreground font-medium">— {c.name}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
