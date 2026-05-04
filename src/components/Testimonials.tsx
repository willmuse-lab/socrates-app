import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Quote, ChevronLeft, ChevronRight, Star } from 'lucide-react';

interface TestimonialProps {
  compact?: boolean;
}

const TESTIMONIALS = [
  {
    name: 'Mrs. Davis',
    role: '10th Grade English Teacher',
    avatar: 'MD',
    color: 'bg-accent',
    quote: "Socrates is a tool that helps teachers reduce students' ability to use AI to do the work for them. It also suggests ways to incorporate class time and discussion into assessments, which encouraged my students to engage with each other more.",
    highlight: 'Students caught AI giving incorrect information — and it became a major teaching moment about critical thinking.',
    feature: 'Quick-start examples',
    result: 'Students used multiple AI sources to compare information, turning AI limitations into learning opportunities.',
  },
  {
    name: 'Mrs. Davis',
    role: '10th Grade English Teacher',
    avatar: 'MD',
    color: 'bg-accent',
    quote: "One surprising result was how often students caught AI giving incorrect information, which gave me the opportunity to applaud students for how much more they knew about the book than AI did. That was really eye-opening for students who said they usually just trust what AI says.",
    highlight: "Students in lower-level classes thrived — it wasn't HARD, it just forced them to THINK.",
    feature: 'Level redesigns',
    result: 'A character analysis assignment became a multi-source AI critique project. Major success especially for lower-level classes.',
  },
  {
    name: 'Mr. Muse',
    role: 'Middle & High School Math Teacher',
    avatar: 'MM',
    color: 'bg-purple-600',
    quote: 'A program with the ability to evaluate your premade lessons for AI vulnerabilities and then patch those holes with your choice of AI usage. I do not use AI as the "bad guy" any longer — it is now a tool we use to facilitate learning.',
    highlight: 'Students are not afraid of using AI as long as they journal the assignment and can use the "find the mistake" quick assignment.',
    feature: 'Quick-start examples',
    result: 'Improved teaching of rational functions in NC Math 3 — more productive outcomes, students journaling AI use.',
  },
];

export function Testimonials({ compact = false }: TestimonialProps) {
  const [current, setCurrent] = useState(0);
  const prev = () => setCurrent(c => (c - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  const next = () => setCurrent(c => (c + 1) % TESTIMONIALS.length);
  const t = TESTIMONIALS[current];

  if (compact) {
    return (
      <div className="space-y-4">
        {[TESTIMONIALS[0], TESTIMONIALS[2]].map((t, i) => (
          <div key={i} className="bg-secondary/30 border border-border rounded-xl p-5 space-y-3">
            <Quote className="w-4 h-4 text-accent opacity-50" />
            <p className="text-sm text-foreground leading-relaxed italic">"{t.quote}"</p>
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full ${t.color} flex items-center justify-center text-[10px] font-bold text-white`}>{t.avatar}</div>
              <div>
                <p className="text-xs font-bold">{t.name}</p>
                <p className="text-[10px] text-muted-foreground">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className="py-20 px-6 md:px-10 bg-card border-t border-border">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <div className="flex justify-center gap-1">
            {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />)}
          </div>
          <h2 className="text-3xl font-bold font-serif italic">What teachers are saying</h2>
          <p className="text-muted-foreground">Real feedback from real classrooms.</p>
        </div>
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div key={current} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="bg-background border border-border rounded-2xl p-8 md:p-10 space-y-6">
              <Quote className="w-8 h-8 text-accent opacity-30" />
              <p className="text-xl font-serif leading-relaxed text-foreground">"{t.quote}"</p>
              <div className="bg-accent/5 border-l-4 border-accent rounded-r-xl px-4 py-3">
                <p className="text-sm text-accent font-medium leading-relaxed">{t.highlight}</p>
              </div>
              <div className="grid sm:grid-cols-3 gap-4 pt-2">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Most used feature</p>
                  <p className="text-xs font-medium">{t.feature}</p>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">What changed in their classroom</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t.result}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center text-sm font-bold text-white`}>{t.avatar}</div>
                  <div>
                    <p className="text-sm font-bold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={prev} className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={next} className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
          <div className="flex justify-center gap-2 mt-4">
            {TESTIMONIALS.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all ${i === current ? 'w-6 bg-accent' : 'w-2 bg-border'}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
