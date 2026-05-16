"use client";

import { ReactNode, useRef, useState } from "react";

interface BottomSheetProps {
  isVisible: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  peekLabel: string;
  peekHeight?: string;
  children: ReactNode;
}

// KEY CONCEPT: the sheet is always h-[80vh] in the DOM.
// We use CSS translateY to slide it up/down:
//   hidden → translateY(100%)            = entirely below screen
//   peek   → translateY(calc(100%-5rem)) = only top 5rem visible
//   full   → translateY(0)               = fully visible
//
// The handle bar is exactly h-20 (= 5rem = 80px) to match the calc.
// sm:hidden means desktop never sees this — desktop uses the sidebar instead.

export default function BottomSheet({
  isVisible,
  isExpanded,
  onToggle,
  peekLabel,
  peekHeight = "5rem",
  children,
}: BottomSheetProps) {
  const dragStartYRef = useRef<number | null>(null);
  const [dragDeltaY, setDragDeltaY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  // Suppress the synthetic click that fires after a drag-ended touchend
  const suppressNextClickRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartYRef.current = e.touches[0].clientY;
    setDragDeltaY(0);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartYRef.current === null) return;
    const delta = e.touches[0].clientY - dragStartYRef.current;
    // Clamp direction: only allow dragging down when expanded, up when peeking
    setDragDeltaY(isExpanded ? Math.max(0, delta) : Math.min(0, delta));
  };

  const handleTouchEnd = () => {
    const SNAP_THRESHOLD = 50;
    if (Math.abs(dragDeltaY) >= SNAP_THRESHOLD) {
      suppressNextClickRef.current = true;
      if (dragDeltaY < -SNAP_THRESHOLD && !isExpanded) onToggle(); // drag up → expand
      if (dragDeltaY > SNAP_THRESHOLD && isExpanded) onToggle();   // drag down → peek
    }
    setDragDeltaY(0);
    setIsDragging(false);
    dragStartYRef.current = null;
  };

  const handleClick = () => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    onToggle();
  };

  // During drag: real-time position (no transition). Otherwise: snap via CSS transition.
  const base = !isVisible ? "100%" : isExpanded ? "0%" : `calc(100% - ${peekHeight})`;
  const transform = isDragging
    ? `translateY(calc(${base} + ${dragDeltaY}px))`
    : `translateY(${base})`;

  return (
    <div
      className={`lg:hidden fixed bottom-0 left-0 right-0 h-[68vh] bg-card-bg border-t border-gray-800 rounded-t-2xl shadow-2xl z-30 flex flex-col ${isDragging ? "" : "transition-transform duration-360 ease-out"}`}
      style={{ transform }}
    >
      {/* Handle bar — exactly h-20 so peek height matches the calc above */}
      <button
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="h-20 shrink-0 w-full flex flex-col items-center justify-center px-4 gap-1 bg-card-bg border-b border-gray-800 z-10 relative"
        aria-label={isExpanded ? "Collapse" : "Expand"}
      >
        {/* Drag handle pill */}
        <div className="w-10 h-1 rounded-full bg-text-muted/40 mb-1" />
        <span className="text-text-primary font-semibold text-sm">
          {peekLabel}
        </span>
      </button>

      {/* Content area — children manage their own scroll */}
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
