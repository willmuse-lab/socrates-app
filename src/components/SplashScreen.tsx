import React, { useEffect } from 'react';
import { motion } from 'motion/react';

interface SplashScreenProps {
  onComplete: () => void;
}

// Branded splash. The old owl "fly-in" video (socrates-startup.mp4) showed the
// previous name and logo, so it was removed. This shows the current SocratesIQ
// lockup (owl + wordmark + tagline) on the brand's warm-paper background with a
// clean fade and rise. The lockup already contains the name, so no extra text.
export function SplashScreen({ onComplete }: SplashScreenProps) {
  useEffect(() => {
    const timeout = setTimeout(onComplete, 2200);
    return () => clearTimeout(timeout);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      className="fixed inset-0 z-[100] bg-[#F4EFE4] flex items-center justify-center overflow-hidden"
    >
      <motion.img
        src="/logo.png"
        alt="SocratesIQ"
        initial={{ opacity: 0, y: 18, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="w-64 md:w-80 object-contain"
      />
    </motion.div>
  );
}
