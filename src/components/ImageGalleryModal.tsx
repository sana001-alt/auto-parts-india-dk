import React, { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { SparePart } from "../types";

interface ImageGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  part: SparePart | null;
  initialIndex?: number;
}

export default function ImageGalleryModal({ isOpen, onClose, part, initialIndex = 0 }: ImageGalleryModalProps) {
  // Extract all valid image URLs
  const images: string[] = [];
  if (part) {
    if (part.imageUrls && part.imageUrls.length > 0) {
      part.imageUrls.forEach(url => {
        if (url && !images.includes(url)) {
          images.push(url);
        }
      });
    } else if (part.imageUrl) {
      images.push(part.imageUrl);
    }
  }

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Mutable refs to prevent closure staleness in native touch listeners
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  const positionRef = useRef(position);
  positionRef.current = position;

  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  const isTransitioningRef = useRef(isTransitioning);
  isTransitioningRef.current = isTransitioning;

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Touch & gesture tracking refs
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const touchStateRef = useRef<{
    mode: "idle" | "drag" | "pinch";
    startX: number;
    startY: number;
    initialPos: { x: number; y: number };
    initialScale: number;
    initialDist: number;
    initialCenter: { x: number; y: number };
    touchStartTime: number;
  }>({
    mode: "idle",
    startX: 0,
    startY: 0,
    initialPos: { x: 0, y: 0 },
    initialScale: 1,
    initialDist: 0,
    initialCenter: { x: 0, y: 0 },
    touchStartTime: 0
  });

  // Calculate pan clamping
  const clampPosition = useCallback((pos: { x: number; y: number }, targetScale: number) => {
    if (targetScale <= 1 || !containerRef.current) {
      return { x: 0, y: 0 };
    }
    const container = containerRef.current.getBoundingClientRect();
    const maxPanX = Math.max(0, (container.width * (targetScale - 1)) / 2);
    const maxPanY = Math.max(0, (container.height * (targetScale - 1)) / 2);

    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, pos.x)),
      y: Math.max(-maxPanY, Math.min(maxPanY, pos.y))
    };
  }, []);

  // Smooth reset to 1x fit-screen view
  const resetZoom = useCallback((animate = true) => {
    if (animate) {
      setIsTransitioning(true);
      isTransitioningRef.current = true;
      setScale(1);
      setPosition({ x: 0, y: 0 });
      scaleRef.current = 1;
      positionRef.current = { x: 0, y: 0 };
      setTimeout(() => {
        setIsTransitioning(false);
        isTransitioningRef.current = false;
      }, 280);
    } else {
      setIsTransitioning(false);
      isTransitioningRef.current = false;
      setScale(1);
      setPosition({ x: 0, y: 0 });
      scaleRef.current = 1;
      positionRef.current = { x: 0, y: 0 };
    }
  }, []);

  // Double tap / double click action: Toggle between 1x and 2.5x at tapped coordinates
  const handleDoubleTap = useCallback((clientX: number, clientY: number) => {
    if (scaleRef.current > 1.15) {
      // Toggle back to 1x fit-screen view
      resetZoom(true);
    } else if (containerRef.current) {
      // Zoom into 2.5x directly centered on the tapped coordinate
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const offsetX = clientX - cx;
      const offsetY = clientY - cy;
      const targetScale = 2.5;

      setIsTransitioning(true);
      isTransitioningRef.current = true;

      const targetPos = clampPosition({
        x: -offsetX * targetScale,
        y: -offsetY * targetScale
      }, targetScale);

      setScale(targetScale);
      setPosition(targetPos);
      scaleRef.current = targetScale;
      positionRef.current = targetPos;

      setTimeout(() => {
        setIsTransitioning(false);
        isTransitioningRef.current = false;
      }, 280);
    }
  }, [clampPosition, resetZoom]);

  // Lock body scroll and prevent page bounce on mount/open
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      const prevPosition = document.body.style.position;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
        document.body.style.position = prevPosition;
      };
    }
  }, [isOpen]);

  // Sync index and reset transforms on open
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex >= 0 && initialIndex < images.length ? initialIndex : 0);
      resetZoom(false);
    }
  }, [isOpen, initialIndex, images.length, resetZoom]);

  // Keyboard navigation & Esc to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && images.length > 1 && scaleRef.current <= 1.1) {
        resetZoom(false);
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
      } else if (e.key === "ArrowRight" && images.length > 1 && scaleRef.current <= 1.1) {
        resetZoom(false);
        setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, images.length, onClose, resetZoom]);

  // Native non-passive Touch & Gesture Handling (Prevents browser freeze, scroll bounce & zoom conflicts)
  useEffect(() => {
    const container = containerRef.current;
    if (!isOpen || !container) return;

    const onTouchStart = (e: TouchEvent) => {
      const now = Date.now();
      setIsTransitioning(false);
      isTransitioningRef.current = false;

      if (e.touches.length === 1) {
        const touch = e.touches[0];

        // Reliable double-tap detection (within 320ms and 35px)
        if (
          lastTapRef.current &&
          now - lastTapRef.current.time < 320 &&
          Math.hypot(touch.clientX - lastTapRef.current.x, touch.clientY - lastTapRef.current.y) < 35
        ) {
          e.preventDefault();
          lastTapRef.current = null;
          touchStateRef.current.mode = "idle";
          handleDoubleTap(touch.clientX, touch.clientY);
          return;
        }

        lastTapRef.current = {
          time: now,
          x: touch.clientX,
          y: touch.clientY
        };

        touchStateRef.current = {
          mode: "drag",
          startX: touch.clientX,
          startY: touch.clientY,
          initialPos: { ...positionRef.current },
          initialScale: scaleRef.current,
          initialDist: 0,
          initialCenter: { x: 0, y: 0 },
          touchStartTime: now
        };
      } else if (e.touches.length === 2) {
        // Pinch-to-zoom mode
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const center = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2
        };

        touchStateRef.current = {
          mode: "pinch",
          startX: 0,
          startY: 0,
          initialPos: { ...positionRef.current },
          initialScale: scaleRef.current,
          initialDist: dist,
          initialCenter: center,
          touchStartTime: now
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (touchStateRef.current.mode === "idle") return;

      if (e.touches.length === 2 && touchStateRef.current.mode === "pinch" && touchStateRef.current.initialDist > 0) {
        // 2-Finger Pinch Zoom
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const pinchRatio = currentDist / touchStateRef.current.initialDist;
        const targetScale = Math.min(Math.max(touchStateRef.current.initialScale * pinchRatio, 0.8), 4.5);

        const currentCenter = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2
        };
        const centerDeltaX = currentCenter.x - touchStateRef.current.initialCenter.x;
        const centerDeltaY = currentCenter.y - touchStateRef.current.initialCenter.y;

        const targetPos = clampPosition({
          x: touchStateRef.current.initialPos.x + centerDeltaX,
          y: touchStateRef.current.initialPos.y + centerDeltaY
        }, targetScale);

        setScale(targetScale);
        setPosition(targetPos);
        scaleRef.current = targetScale;
        positionRef.current = targetPos;
      } else if (e.touches.length === 1 && touchStateRef.current.mode === "drag") {
        const touch = e.touches[0];
        const deltaX = touch.clientX - touchStateRef.current.startX;
        const deltaY = touch.clientY - touchStateRef.current.startY;

        if (scaleRef.current > 1.05) {
          // Pan while zoomed
          e.preventDefault();
          const targetPos = clampPosition({
            x: touchStateRef.current.initialPos.x + deltaX,
            y: touchStateRef.current.initialPos.y + deltaY
          }, scaleRef.current);

          setPosition(targetPos);
          positionRef.current = targetPos;
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const state = touchStateRef.current;
      touchStateRef.current.mode = "idle";

      if (scaleRef.current < 1) {
        // Snap back if pinched below 1x
        resetZoom(true);
      } else if (scaleRef.current > 4.5) {
        // Clamp to max zoom 4.5x
        setIsTransitioning(true);
        isTransitioningRef.current = true;
        setScale(4.5);
        scaleRef.current = 4.5;
        const targetPos = clampPosition(positionRef.current, 4.5);
        setPosition(targetPos);
        positionRef.current = targetPos;
        setTimeout(() => {
          setIsTransitioning(false);
          isTransitioningRef.current = false;
        }, 200);
      } else if (scaleRef.current <= 1.05 && e.changedTouches.length === 1 && state.mode === "drag") {
        // Horizontal swipe navigation when not zoomed
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - state.startX;
        const deltaY = touch.clientY - state.startY;
        const duration = Date.now() - state.touchStartTime;

        if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 80 && duration < 350 && images.length > 1) {
          if (deltaX > 0) {
            // Previous image
            resetZoom(false);
            setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
          } else {
            // Next image
            resetZoom(false);
            setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
          }
        }
      }
    };

    // Trackpad & Mouse Wheel Zoom
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.88;
      const rect = container.getBoundingClientRect();
      const cursorX = e.clientX - (rect.left + rect.width / 2);
      const cursorY = e.clientY - (rect.top + rect.height / 2);

      const prevScale = scaleRef.current;
      const nextScale = Math.min(Math.max(prevScale * zoomFactor, 1), 4.5);

      if (nextScale <= 1) {
        setScale(1);
        setPosition({ x: 0, y: 0 });
        scaleRef.current = 1;
        positionRef.current = { x: 0, y: 0 };
        return;
      }

      const ratio = nextScale / prevScale;
      const targetPos = clampPosition({
        x: cursorX - (cursorX - positionRef.current.x) * ratio,
        y: cursorY - (cursorY - positionRef.current.y) * ratio
      }, nextScale);

      setScale(nextScale);
      setPosition(targetPos);
      scaleRef.current = nextScale;
      positionRef.current = targetPos;
    };

    container.addEventListener("touchstart", onTouchStart, { passive: false });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd, { passive: false });
    container.addEventListener("touchcancel", onTouchEnd, { passive: false });
    container.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("touchcancel", onTouchEnd);
      container.removeEventListener("wheel", onWheel);
    };
  }, [isOpen, images.length, clampPosition, handleDoubleTap, resetZoom]);

  // Desktop Mouse Drag Handling
  const mouseDragRef = useRef<{ startX: number; startY: number; initialPos: { x: number; y: number } } | null>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || scaleRef.current <= 1.05) return;
    setIsTransitioning(false);
    mouseDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPos: { ...positionRef.current }
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mouseDragRef.current || scaleRef.current <= 1.05) return;
    const deltaX = e.clientX - mouseDragRef.current.startX;
    const deltaY = e.clientY - mouseDragRef.current.startY;

    const targetPos = clampPosition({
      x: mouseDragRef.current.initialPos.x + deltaX,
      y: mouseDragRef.current.initialPos.y + deltaY
    }, scaleRef.current);

    setPosition(targetPos);
    positionRef.current = targetPos;
  };

  const handleMouseUp = () => {
    mouseDragRef.current = null;
  };

  if (!isOpen || !part || images.length === 0) return null;

  return (
    <div
      className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center overflow-hidden select-none"
      style={{
        backgroundColor: "#000000",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        touchAction: "none"
      }}
      id="fullscreen-image-viewer-modal"
    >
      {/* Single minimal semi-transparent 'X' icon at top-right */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2.5 sm:p-3 bg-white/20 hover:bg-white/30 active:scale-95 text-white rounded-full backdrop-blur-md transition-all cursor-pointer z-50 border border-white/10 shadow-2xl"
        id="fullscreen-viewer-close-btn"
        aria-label="Close fullscreen image viewer"
        title="Close (Esc)"
      >
        <X size={22} className="stroke-[2.5]" />
      </button>

      {/* Main Fullscreen Raw Image Canvas */}
      <div
        ref={containerRef}
        className={`w-full h-full flex items-center justify-center overflow-hidden p-0 m-0 ${
          scale > 1.05 ? "cursor-grab active:cursor-grabbing" : "cursor-default"
        }`}
        style={{
          touchAction: "none"
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={(e) => handleDoubleTap(e.clientX, e.clientY)}
      >
        <img
          ref={imgRef}
          key={currentIndex}
          src={images[currentIndex]}
          alt=""
          loading="eager"
          decoding="async"
          draggable={false}
          referrerPolicy="no-referrer"
          className="max-w-full max-h-full w-auto h-auto object-contain pointer-events-none select-none will-change-transform block m-auto"
          style={{
            maxWidth: "100vw",
            maxHeight: "100vh",
            objectFit: "contain",
            transform: `translate3d(${position.x}px, ${position.y}px, 0px) scale(${scale})`,
            transition: isTransitioning ? "transform 280ms cubic-bezier(0.2, 0, 0.2, 1)" : "none",
            transformOrigin: "center center"
          }}
        />
      </div>
    </div>
  );
}
