import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, ChevronDown, ChevronUp, Wrench, Zap } from 'lucide-react';
import { AIFailure } from '@/src/lib/gemini';

interface AIFailureBreakdownProps {
  headline: string;
  failures: AIFailure[];
}

const SEVERITY_COLORS = {
  High:   { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  Medium: { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  Low:    { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400' },
};

export function AIFailureBreakdown({ headline, failures }: AIFailureBreakdownProps) {
  const [expanded, setExpanded] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const highCount = failures.filter(f => f.severity === 'High').length;
  const mediumCount = failures.filter(f => f.severity === 'Medium').length;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="border border-red-200 rounded-xl overflow-hidden bg-white">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-4 bg-red-50 hover:bg-red-100/70 transition-colors text-left">
        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4 text-red-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-red-700">AI Vulnerability Diagnosis</span>
            <div className="flex gap-1">
              {highCount > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-200 text-red-700">{highCount} High</span>}
              {mediumCount > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-700">{mediumCount} Medium</span>}
            </div>
          </div>
          <p className="text-sm font-medium text-red-800 leading-snug">{headline}</p>
        </div>
        <div className="flex-shrink-0 mt-1">
          {expanded ? <ChevronUp className="w-4 h-4 text-red-500" /> : <ChevronDown className="w-4 h-4 text-red-500" />}
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="p-4 space-y-3">
              {failures.map((failure, i) => {
                const colors = SEVERITY_COLORS[failure.severity] || SEVERITY_COLORS.Medium;
                const isOpen = expandedIndex === i;
                return (
                  <div key={i} className={`border rounded-lg overflow-hidden ${colors.border}`}>
                    <button onClick={() => setExpandedIndex(isOpen ? null : i)}
                      className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${colors.bg} hover:opacity-90`}>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                      <div className="flex-1 min-w-0"><span className="text-xs font-bold text-foreground">{failure.type}</span></div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 ${colors.badge}`}>{failure.severity}</span>
                      {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                          <div className="px-4 py-3 space-y-3 bg-white border-t border-border/50">
                            <div className="flex items-start gap-2">
                              <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">What a student could do</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">{failure.explanation}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
                              <Wrench className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-green-700 mb-1">How to fix it</p>
                                <p className="text-xs text-green-800 leading-relaxed font-medium">{failure.fix}</p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
