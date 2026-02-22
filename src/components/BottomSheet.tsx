"use client";

import { ReactNode } from "react";

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
  // Use inline style instead of a dynamic Tailwind class — Tailwind's static
  // scanner can't detect template-literal class names and purges them in prod.
  const translateY = !isVisible
    ? "100%"
    : isExpanded
      ? "0%"
      : `calc(100% - ${peekHeight})`;

  return (
    <div
      className="lg:hidden fixed bottom-0 left-0 right-0 h-[68vh] bg-card-bg border-t border-gray-800 rounded-t-2xl shadow-2xl z-30 flex flex-col transition-transform duration-300 ease-in-out"
      style={{ transform: `translateY(${translateY})` }}
    >
      {/* Handle bar — exactly h-20 so peek height matches the calc above */}
      <button
        onClick={onToggle}
        className="h-20 shrink-0 w-full flex flex-col items-center justify-center px-4 gap-1 bg-card-bg border-b border-gray-800 z-10 relative"
        aria-label={isExpanded ? "Collapse" : "Expand"}
      >
        {/* Chevron at top-center: points up when peek (tap to expand), down when expanded (tap to collapse) */}
        <svg
          className={`w-5 h-5 text-text-muted transition-transform duration-300 ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 15l7-7 7 7"
          />
        </svg>
        <span className="text-text-primary font-semibold text-sm">
          {peekLabel}
        </span>
      </button>

      {/* Content area — children manage their own scroll */}
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
