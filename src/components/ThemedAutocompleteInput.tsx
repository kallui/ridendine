import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AutocompletePrediction } from "@/hooks/useCustomPlacesAutocomplete";

interface Props {
  value: string;
  onChange: (v: string) => void;
  predictions: AutocompletePrediction[];
  loading: boolean;
  onSelect: (prediction: AutocompletePrediction) => void;
  activeIndex: number | null;
  setActiveIndex: (i: number | null) => void;
}

export function ThemedAutocompleteInput({
  value,
  onChange,
  predictions,
  loading,
  onSelect,
  activeIndex,
  setActiveIndex,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const max = predictions.length - 1;
    if (max < 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(activeIndex === null ? 0 : Math.min(activeIndex + 1, max));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(activeIndex === null ? max : Math.max(activeIndex - 1, 0));
      return;
    }

    if (e.key === "Enter" && activeIndex !== null) {
      e.preventDefault();
      onSelect(predictions[activeIndex]);
      setActiveIndex(null);
      return;
    }

    if (e.key === "Escape") {
      setActiveIndex(null);
    }
  };

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        className="w-full px-6 py-4 rounded-2xl border border-border bg-app-bg/90 text-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-ring transition"
        placeholder="Enter your destination..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
        autoComplete="off"
      />
      <AnimatePresence>
        {(predictions.length > 0 || loading) && (
          <motion.ul
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            className="absolute left-0 right-0 mt-2 bg-card-bg/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl overflow-hidden z-30"
          >
            {loading && (
              <li className="px-6 py-4 text-text-muted text-center">
                Loading...
              </li>
            )}
            {predictions.map((p, i) => (
              <li
                key={p.place_id}
                className={
                  "px-6 py-4 cursor-pointer transition " +
                  (activeIndex === i
                    ? "bg-accent text-primary-fg "
                    : "hover:bg-accent-soft/60 text-text-primary ")
                }
                onMouseDown={() => {
                  onSelect(p);
                  setActiveIndex(null);
                }}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {p.description}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
