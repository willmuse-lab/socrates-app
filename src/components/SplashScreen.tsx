import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onComplete();
    }, 5000);
    return () => clearTimeout(timeout);
  }, [onComplete]);

  const handleVideoEnded = () => {
    setTimeout(onComplete, 300);
  };

  const handleVideoError = () => {
    setVideoError(true);
    setTimeout(onComplete, 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="fixed inset-0 z-[100] bg-[#1a1a2e] flex items-center justify-center overflow-hidden"
    >
      {videoError ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <img src="/logo.png" alt="Socrates" className="w-24 h-24 object-contain" />
          <p className="text-white font-serif italic text-2xl">Socrates</p>
        </motion.div>
      ) : (
        <video
          autoPlay
          muted
          playsInline
          onEnded={handleVideoEnded}
          onError={handleVideoError}
          className="w-full h-full object-cover md:object-contain"
          aria-hidden="true"
        >
          <source src="/socrates-startup.mp4" type="video/mp4" />
        </video>
      )}
    </motion.div>
  );
}
