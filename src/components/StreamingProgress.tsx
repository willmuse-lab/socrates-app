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
  // the bar frozen for long stretches. Trickle upward continuously so it always
  // climbs, while a real checkpoint snaps it forward and acts as a floor. It
  // reaches 100% only on true completion.
  //
  // The trickle is paced by ELAPSED TIME (not tick count) against a ~14s time
  // constant calibrated to a typical successful analysis. A per-tick fraction
  // (the old approach) decays almost independently of how long the real work
  // takes, so it raced to ~95% in a couple of seconds and then sat pinned near
  // 99% for the rest of a 15-30s wait -- fast and dishonest, then a long
  // apparent hang. This curve instead reaches roughly 50% at 14s, ~75% at 28s,
  // and keeps creeping (never fully parking) the longer the real call runs.
  const startRef = React.useRef<number | null>(null);
  useEffect(() => {
    if (!isVisible) { setDisplayPercent(0); startRef.current = null; return; }
    if (startRef.current === null) startRef.current = Date.now();
    const TAU_MS = 14000;
    const CEILING = 97;
    const id = setInterval(() => {
      const elapsed = Date.now() - (startRef.current ?? Date.now());
      const timeBased = CEILING * (1 - Math.exp(-elapsed / TAU_MS));
      const floor = Math.min(percent, CEILING); // real checkpoints pull it up
      setDisplayPercent(p => Math.min(CEILING, Math.max(p, floor, timeBased)));
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
            <div className="relative w-24 h-24 rounded-full border-2 border-accent/30 flex items-center justify-center bg-card">
              <img src="/owl.png" alt="SocratesIQ" className="w-16 h-16 object-contain" />
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
                <p className="text-lg md:text-xl font-serif leading-relaxed text-foreground">"{comment.quote}"</p>
                <p className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">{comment.role}</p>
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
