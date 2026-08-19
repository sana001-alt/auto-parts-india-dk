import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GearSpeedLogoIcon } from "./BrandLogo";

interface SplashScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
  isReady?: boolean;
}

export default function SplashScreen({
  onFinish,
  minDurationMs = 2500,
  isReady = true
}: SplashScreenProps) {
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    // Prevent scrolling while splash screen is active
    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    const timer = setTimeout(() => {
      if (isReady) {
        setIsDone(true);
        if (onFinish) {
          onFinish();
        }
      }
    }, minDurationMs);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [minDurationMs, isReady, onFinish]);

  return (
    <AnimatePresence>
      {!isDone && (
        <motion.div
          key="native-mobile-splash-screen"
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            scale: 1.02,
            filter: "blur(6px)",
            transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } 
          }}
          className="fixed inset-0 z-[99999] w-screen h-screen bg-[#050811] flex items-center justify-center px-6 select-none overflow-hidden touch-none"
          style={{ height: "100dvh", width: "100vw" }}
          id="app-native-splash-screen"
        >
          {/* Centered Brand Unit */}
          <div className="flex flex-col items-center justify-center text-center relative z-10 bg-transparent">
            {/* SVG Logo Icon (Gear + Speed Arrow) */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ 
                scale: [0.85, 1.04, 1],
                opacity: 1
              }}
              transition={{ 
                duration: 0.7,
                ease: [0.16, 1, 0.3, 1]
              }}
              className="mb-4 flex items-center justify-center bg-transparent"
            >
              <GearSpeedLogoIcon size={84} />
            </motion.div>

            {/* Typography Heading */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
              className="flex items-center gap-2"
            >
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase font-sans">
                AUTO PARTS
              </h1>
              <span className="bg-[#1565FF] text-white text-[11px] sm:text-xs font-black px-2 py-0.5 rounded uppercase tracking-wider">
                INDIA
              </span>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="text-slate-400 text-xs font-semibold uppercase tracking-widest mt-2"
            >
              Automotive Marketplace
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

