import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface ResilienceGaugeProps {
  score: number;
  size?: number;
}

export function ResilienceGauge({ score, size = 160 }: ResilienceGaugeProps) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => setDisplayed(score), 100);
    return () => clearTimeout(timeout);
  }, [score]);

  const radius = (size - 20) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Use 75% of the circle (270 degrees), starting from bottom-left
  const arcFraction = 0.75;
  const dashArray = circumference * arcFraction;
  const dashOffset = dashArray - (dashArray * Math.min(100, Math.max(0, displayed)) / 100);

  // Rotation: start at 135deg (bottom-left) so the arc goes clockwise to bottom-right
  const rotation = 135;

  const color = score >= 70
    ? '#708D81'   // sage green
    : score >= 40
    ? '#D4A373'   // amber
    : '#ef4444';  // red

  const label = score >= 86
    ? 'Exceptional'
    : score >= 71
    ? 'Strong'
    : score >= 51
    ? 'Moderate'
    : score >= 31
    ? 'Low'
    : 'Vulnerable';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="block">
          {/* Track arc */}
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke="#F0F0EE"
            strokeWidth={10}
            strokeDasharray={`${dashArray} ${circumference}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            transform={`rotate(${rotation} ${cx} ${cy})`}
          />
          {/* Filled arc */}
          <motion.circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeDasharray={`${dashArray} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(${rotation} ${cx} ${cy})`}
            initial={{ strokeDashoffset: dashArray }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.1 }}
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-3xl font-bold leading-none"
            style={{ color }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {displayed}
          </motion.span>
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold mt-0.5">Resilience</span>
        </div>
      </div>
      <motion.span
        className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
        style={{ color, backgroundColor: color + '18' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        {label}
      </motion.span>
    </div>
  );
}
