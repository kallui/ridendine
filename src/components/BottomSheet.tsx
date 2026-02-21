"use client";

import { ReactNode } from "react";

interface BottomSheetProps {
  isVisible: boolean; // whether to show the sheet at all
  isExpanded: boolean; // peek vs full
  onToggle: () => void;
  peekLabel: string; // text shown in peek mode e.g. "3 routes found"
  // How much of the sheet is visible in peek state.
  // Default "5rem" = handle bar only.
  // Pass a larger value (e.g. "15rem") to preview one card below the handle.
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
  const translateClass = !isVisible
    ? "translate-y-full"
    : isExpanded
      ? "translate-y-0"
      : `translate-y-[calc(100%-${peekHeight})]`;

  return (
    <div
      className={`sm:hidden fixed bottom-0 left-0 right-0 h-[68vh] bg-card-bg border-t border-gray-800 rounded-t-2xl shadow-2xl z-30 flex flex-col transition-transform duration-300 ease-in-out ${translateClass}`}
    >
      {/* Handle bar — exactly h-20 so peek height matches translateY calc */}
      <button
        onClick={onToggle}
        className="h-20 shrink-0 w-full flex flex-col items-center justify-center px-4 gap-2 border-b border-gray-800"
        aria-label={isExpanded ? "Collapse" : "Expand"}
      >
        {/* Visual drag handle indicator */}
        <div className="w-10 h-1 bg-gray-600 rounded-full" />

        <div className="flex items-center justify-between w-full">
          <span className="text-text-primary font-semibold text-sm">
            {peekLabel}
          </span>
          {/* Chevron rotates 180° when expanded */}
          <svg
            className={`w-4 h-4 text-text-muted transition-transform duration-300 ${
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
        </div>
      </button>

      {/* Scrollable content — owns all scrolling for sheet content */}
      <div className="flex-1 overflow-y-auto min-h-0">{children}</div>
    </div>
  );
}
