import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface StreamingProgressProps {
  stage: string;
  percent: number;
  isVisible: boolean;
}

const QUOTES = [
  { quote: "After redesigning my essay prompt with the Gold version, the quality of student thinking was unlike anything I'd seen in 12 years of teaching.", author: "Ms. Reyes", role: "10th Grade English, Chicago" },
  { quote: "My students stopped asking 'can I use AI?' and started asking 'how do I use AI well?' That mindset shift is everything.", author: "Mr. Okonkwo", role: "AP History, Atlanta" },
  { quote: "I was skeptical. Then I watched a student defend their local data analysis in a way no chatbot could have invented. I became a believer.", author: "Dr. Patel", role: "Dept. Chair, Biology, Houston" },
  { quote: "The IEP-adapted versions saved me three hours of differentiation prep. Same resilience, right level of scaffolding.", author: "Ms. Thornton", role: "Special Education, Portland" },
  { quote: "When I anchored the assignment to our class debate, half my students told me it was the most meaningful work they'd done all semester.", author: "Mr. Kim", role: "Social Studies, Seattle" },
  { quote: "The before-and-after scores showed my department exactly why generic prompts weren't working. Data changed minds.", author: "Mrs. Alvarez", role: "Curriculum Coach, San Antonio" },
  { quote: "Gold-level assignments feel hard to write. But once you've done one, you see that 'hard for AI' is the same as 'deep learning for students.'", author: "Prof. Marsh", role: "Instructional Design, Boston College" },
  { quote: "My ELL students actually outperformed native speakers on the locally-anchored version. Their lived experience was an asset, not a barrier.", author: "Ms. Nguyen", role: "ESL Coordinator, Los Angeles" },
];

export function StreamingProgress({ stage, percent, isVisible }: StreamingProgressProps) {
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const [displayPercent, setDisplayPercent] = useState(0);

  useEffect(() => {
    if (!isVisible) { setDisplayPercent(0); return; }
    const interval = setInterval(() => {
      setQuoteIndex(i => (i + 1) % QUOTES.length);
    }, 4500);
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
          <div className="bg-secondary/40 rounded-xl px-5 py-4 w-full border border-border space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">From educators using Socrates</p>
            <AnimatePresence mode="wait">
              <motion.div key={quoteIndex} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.35 }} className="space-y-2">
                <p className="text-xs text-foreground/80 leading-relaxed italic">"{QUOTES[quoteIndex].quote}"</p>
                <div>
                  <p className="text-[10px] font-bold text-foreground">{QUOTES[quoteIndex].author}</p>
                  <p className="text-[10px] text-muted-foreground">{QUOTES[quoteIndex].role}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
