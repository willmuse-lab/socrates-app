import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Quote } from 'lucide-react';
import { TEACHER_COMMENTS } from '@/src/lib/comments';

interface StreamingProgressProps {
  stage: string;
  percent: number;
  isVisible: boolean;
}

export function StreamingProgress({ percent, isVisible }: StreamingProgressProps) {
  const [displayPercent, setDisplayPercent] = useState(0);
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    if (!isVisible) { setDisplayPercent(0); return; }
    const interval = setInterval(() => {
      setQuoteIndex(i => (i + 1) % TEACHER_COMMENTS.length);
    }, 4200);
    return () => clearInterval(interval);
  }, [isVisible]);

  // The two analysis steps only bump `percent` at real checkpoints, which left
  // the bar frozen for long stretches. Trickle upward continuously (ease-out
  // toward a 95% ceiling) so it always climbs, while a real checkpoint snaps it
  // forward and acts as a floor. It reaches 100% only on true completion.
  useEffect(() => {
    if (!isVisible) { setDisplayPercent(0); return; }
    const id = setInterval(() => {
      setDisplayPercent(p => {
        const floor = Math.min(percent, 99);          // real checkpoints pull it up
        const trickled = p + Math.max(0.4, (95 - p) * 0.05); // ease-out creep to 95
        return Math.min(99, Math.max(p, floor, trickled));
      });
    }, 180);
    return () => clearInterval(id);
  }, [isVisible, percent]);

  const comment = TEACHER_COMMENTS[quoteIndex];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
          className="flex flex-col items-center justify-center py-16 px-8 space-y-10 max-w-xl mx-auto">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping" />
            <div className="relative w-16 h-16 rounded-full border-2 border-accent/30 flex items-center justify-center bg-card">
              <img src="/logo.png" alt="SocratesIQ" className="w-10 h-10 object-contain" />
            </div>
          </div>

          {/* Rotating teacher testimonials — the centerpiece while waiting */}
          <div className="min-h-[120px] flex items-center justify-center w-full">
            <AnimatePresence mode="wait">
              <motion.div key={quoteIndex}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.45 }}
                className="text-center space-y-3">
                <Quote className="w-5 h-5 text-accent opacity-40 mx-auto" />
                <p className="text-lg md:text-xl font-serif italic leading-relaxed text-foreground">"{comment.quote}"</p>
                <p className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">— {comment.role}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Slim progress bar so it never looks frozen */}
          <div className="w-full max-w-sm space-y-1.5">
            <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
              <motion.div className="h-full bg-accent rounded-full" style={{ width: `${Math.round(displayPercent)}%` }} transition={{ duration: 0.3, ease: "easeOut" }} />
            </div>
            <p className="text-center text-[10px] text-muted-foreground">{Math.round(displayPercent)}%</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
