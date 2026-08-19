import React, { useState, useRef, useEffect } from "react";
import { Loader2, ArrowDown } from "lucide-react";
import { triggerVibration } from "../utils/audioNotification";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
  pullThreshold?: number;
  disabled?: boolean;
}

export default function PullToRefresh({
  onRefresh,
  children,
  className = "",
  pullThreshold = 65,
  disabled = false
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const hasTriggeredHapticRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (disabled || isRefreshing) return;
    const container = containerRef.current;
    if (!container) return;

    // Only allow pull-to-refresh if user is at the top of scrollable container
    if (container.scrollTop <= 0) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
      hasTriggeredHapticRef.current = false;
    } else {
      isPullingRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isPullingRef.current || isRefreshing || disabled) return;
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) {
      isPullingRef.current = false;
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startYRef.current;

    if (deltaY > 0) {
      // Apply elastic dampening formula: delta * (1 / (1 + delta / 250))
      const dampedDistance = Math.min(120, deltaY * 0.45);
      setPullDistance(dampedDistance);

      if (dampedDistance >= pullThreshold && !hasTriggeredHapticRef.current) {
        hasTriggeredHapticRef.current = true;
        triggerVibration([20]); // Subtle haptic tick
      } else if (dampedDistance < pullThreshold) {
        hasTriggeredHapticRef.current = false;
      }
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPullingRef.current || isRefreshing) return;
    isPullingRef.current = false;

    if (pullDistance >= pullThreshold) {
      setIsRefreshing(true);
      setPullDistance(pullThreshold);
      triggerVibration([40]);

      try {
        await Promise.resolve(onRefresh());
      } catch (err) {
        console.warn("Pull-to-refresh error:", err);
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 400);
      }
    } else {
      setPullDistance(0);
    }
  };

  const progress = Math.min(1, pullDistance / pullThreshold);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => {
        isPullingRef.current = false;
        setPullDistance(0);
      }}
      className={`relative w-full h-full overflow-y-auto overscroll-y-contain ${className}`}
      style={{
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
        msOverflowStyle: "none"
      }}
    >
      {/* Pull Indicator Area */}
      <div
        className="w-full flex items-center justify-center overflow-hidden transition-all duration-200 pointer-events-none"
        style={{
          height: isRefreshing ? `${pullThreshold}px` : `${pullDistance}px`,
          opacity: pullDistance > 10 || isRefreshing ? 1 : 0
        }}
      >
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-full shadow-md border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-semibold">
          {isRefreshing ? (
            <>
              <Loader2 size={16} className="text-blue-600 animate-spin" />
              <span>Refreshing...</span>
            </>
          ) : (
            <>
              <div
                className="transition-transform duration-150"
                style={{
                  transform: `rotate(${progress >= 1 ? 180 : progress * 180}deg)`
                }}
              >
                <ArrowDown size={15} className={progress >= 1 ? "text-blue-600" : "text-slate-400"} />
              </div>
              <span className={progress >= 1 ? "text-blue-600 font-bold" : "text-slate-500"}>
                {progress >= 1 ? "Release to refresh" : "Pull down to refresh"}
              </span>
            </>
          )}
        </div>
      </div>

      {children}
    </div>
  );
}
