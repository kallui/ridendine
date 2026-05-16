"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCustomPlacesAutocomplete } from "@/hooks/useCustomPlacesAutocomplete";

interface RouteSearchProps {
  onSearch: (
    origin: string | google.maps.Place,
    destination: string | google.maps.Place,
    originLabel: string,
    destLabel: string,
  ) => void;
  isLoading?: boolean;
  defaultOrigin?: string;
  defaultDestination?: string;
  userLocation?: google.maps.LatLngLiteral | null;
}

export default function RouteSearch({
  onSearch,
  isLoading,
  defaultOrigin,
  defaultDestination,
  userLocation,
}: RouteSearchProps) {
  const skipNextAutoSearchRef = useRef(false);
  const originInputRef = useRef<HTMLInputElement>(null);
  const destInputRef = useRef<HTMLInputElement>(null);

  const [focusedField, setFocusedField] = useState<
    "origin" | "destination" | null
  >(null);

  const originAC = useCustomPlacesAutocomplete({ initialInput: defaultOrigin, userLocation });
  const destAC = useCustomPlacesAutocomplete({ initialInput: defaultDestination, userLocation });

  // Auto-search when a prediction is selected and the other field has any value
  useEffect(() => {
    if (skipNextAutoSearchRef.current) {
      skipNextAutoSearchRef.current = false;
      return;
    }

    // At least one field must have just been selected from autocomplete
    if (!originAC.selectedPrediction && !destAC.selectedPrediction) return;

    const origin = originAC.selectedPrediction
      ? { placeId: originAC.selectedPrediction.place_id }
      : originAC.input;

    const destination = destAC.selectedPrediction
      ? { placeId: destAC.selectedPrediction.place_id }
      : destAC.input;

    // If one field is still empty, focus it so the user knows to fill it in
    if (!origin) {
      originInputRef.current?.focus();
      return;
    }
    if (!destination) {
      destInputRef.current?.focus();
      return;
    }

    onSearch(origin, destination, originAC.input, destAC.input);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originAC.selectedPrediction, destAC.selectedPrediction]);

  const handleSwap = () => {
    const nextOriginInput = destAC.input;
    const nextOriginPrediction = destAC.selectedPrediction;
    const nextDestinationInput = originAC.input;
    const nextDestinationPrediction = originAC.selectedPrediction;

    skipNextAutoSearchRef.current = true;
    setFocusedField(null);
    originAC.setActiveIndex(null);
    destAC.setActiveIndex(null);

    originAC.setInput(nextOriginInput);
    originAC.setSelectedPrediction(nextOriginPrediction);
    destAC.setInput(nextDestinationInput);
    destAC.setSelectedPrediction(nextDestinationPrediction);

    const nextOrigin = nextOriginPrediction
      ? { placeId: nextOriginPrediction.place_id }
      : nextOriginInput;
    const nextDestination = nextDestinationPrediction
      ? { placeId: nextDestinationPrediction.place_id }
      : nextDestinationInput;

    if (nextOrigin && nextDestination) {
      onSearch(nextOrigin, nextDestination, nextOriginInput, nextDestinationInput);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const o = originAC.selectedPrediction
      ? { placeId: originAC.selectedPrediction.place_id }
      : originAC.input;
    const d = destAC.selectedPrediction
      ? { placeId: destAC.selectedPrediction.place_id }
      : destAC.input;
    if (o && d) onSearch(o, d, originAC.input, destAC.input);
  };

  const showOriginDropdown =
    focusedField === "origin" &&
    originAC.predictions.length > 0 &&
    originAC.selectedPrediction?.description !== originAC.input;

  const showDestDropdown =
    focusedField === "destination" &&
    destAC.predictions.length > 0 &&
    destAC.selectedPrediction?.description !== destAC.input;

  const handleOriginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    originAC.setInput(e.target.value);
    originAC.setActiveIndex(null);
    if (originAC.selectedPrediction) originAC.setSelectedPrediction(null);
  };

  const handleDestChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    destAC.setInput(e.target.value);
    destAC.setActiveIndex(null);
    if (destAC.selectedPrediction) destAC.setSelectedPrediction(null);
  };

  const selectOriginPrediction = (index: number) => {
    const selected = originAC.predictions[index];
    if (!selected) return;
    originAC.setInput(selected.description);
    originAC.setSelectedPrediction(selected);
    originAC.setActiveIndex(null);
  };

  const handleClearOrigin = () => {
    originAC.setInput("");
    originAC.setSelectedPrediction(null);
    originAC.setActiveIndex(null);
    originInputRef.current?.focus();
  };

  const handleClearDest = () => {
    destAC.setInput("");
    destAC.setSelectedPrediction(null);
    destAC.setActiveIndex(null);
    destInputRef.current?.focus();
  };

  const selectDestPrediction = (index: number) => {
    const selected = destAC.predictions[index];
    if (!selected) return;
    destAC.setInput(selected.description);
    destAC.setSelectedPrediction(selected);
    destAC.setActiveIndex(null);
  };

  const handleOriginKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const max = originAC.predictions.length - 1;
    if (max < 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      originAC.setActiveIndex(
        originAC.activeIndex === null
          ? 0
          : Math.min(originAC.activeIndex + 1, max),
      );
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      originAC.setActiveIndex(
        originAC.activeIndex === null
          ? max
          : Math.max(originAC.activeIndex - 1, 0),
      );
      return;
    }

    if (e.key === "Enter" && originAC.activeIndex !== null) {
      e.preventDefault();
      selectOriginPrediction(originAC.activeIndex);
      return;
    }

    if (e.key === "Escape") {
      originAC.setActiveIndex(null);
    }
  };

  const handleDestKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const max = destAC.predictions.length - 1;
    if (max < 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      destAC.setActiveIndex(
        destAC.activeIndex === null ? 0 : Math.min(destAC.activeIndex + 1, max),
      );
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      destAC.setActiveIndex(
        destAC.activeIndex === null ? max : Math.max(destAC.activeIndex - 1, 0),
      );
      return;
    }

    if (e.key === "Enter" && destAC.activeIndex !== null) {
      e.preventDefault();
      selectDestPrediction(destAC.activeIndex);
      return;
    }

    if (e.key === "Escape") {
      destAC.setActiveIndex(null);
    }
  };

  return (
    <form
      className="bg-card-bg p-2.5 sm:p-4 rounded-lg shadow-lg flex flex-col gap-2 sm:gap-3 border border-border"
      onSubmit={handleSubmit}
    >
      {/* Origin + Destination with simplified route indicator */}
      <div className="flex gap-3">
        {/* Left: start/end indicator */}
        <div className="flex flex-col items-center py-3 shrink-0 w-4">
          <div className="w-2.5 h-2.5 rounded-full border-2 border-primary shrink-0" />
          <div className="w-px flex-1 bg-border my-2" />
          <div className="w-3 h-3 bg-primary rotate-45 rounded-sm shrink-0" />
        </div>

        {/* Right: inputs + floating swap */}
        <div className="relative flex-1">
          <div className="flex flex-col gap-2 pr-10">
            {/* Origin input + dropdown */}
            <div className="relative">
              <input
                ref={originInputRef}
                type="text"
                id="origin"
                className={`w-full pl-4 py-2 sm:py-2.5 border border-border rounded-md 
                  bg-app-bg text-text-primary placeholder:text-text-muted 
                  focus:outline-none focus:ring-2 focus:ring-accent-ring/70 ${originAC.input ? "pr-8" : "pr-4"}`}
                placeholder="Starting point"
                value={originAC.input}
                onChange={handleOriginChange}
                onFocus={() => setFocusedField("origin")}
                onKeyDown={handleOriginKeyDown}
                autoComplete="off"
              />
              {originAC.input && (
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleClearOrigin(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary transition-colors"
                  aria-label="Clear origin"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <AnimatePresence>
                {showOriginDropdown && (
                  <motion.ul
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="absolute z-50 top-full left-0 right-0 mt-1 bg-card-bg border border-border rounded-md shadow-xl overflow-hidden"
                  >
                    {originAC.predictions.map((p, i) => (
                      <li
                        key={p.place_id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectOriginPrediction(i);
                        }}
                        onMouseEnter={() => originAC.setActiveIndex(i)}
                        onMouseLeave={() => originAC.setActiveIndex(null)}
                        className={`px-4 py-2 text-sm cursor-pointer transition-colors ${
                          i === originAC.activeIndex
                            ? "bg-primary/25 text-text-primary"
                            : "text-text-secondary hover:bg-primary/10"
                        }`}
                      >
                        {p.description}
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>

            {/* Destination input + dropdown */}
            <div className="relative">
              <input
                ref={destInputRef}
                type="text"
                id="destination"
                className={`w-full pl-4 py-2 sm:py-2.5 border border-border rounded-md
                  bg-app-bg text-text-primary placeholder:text-text-muted
                  focus:outline-none focus:ring-2 focus:ring-accent-ring/70 ${destAC.input ? "pr-8" : "pr-4"}`}
                placeholder="Destination"
                value={destAC.input}
                onChange={handleDestChange}
                onFocus={() => setFocusedField("destination")}
                onKeyDown={handleDestKeyDown}
                autoComplete="off"
              />
              {destAC.input && (
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleClearDest(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary transition-colors"
                  aria-label="Clear destination"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              <AnimatePresence>
                {showDestDropdown && (
                  <motion.ul
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="absolute z-50 top-full left-0 right-0 mt-1 bg-card-bg border border-border rounded-md shadow-xl overflow-hidden"
                  >
                    {destAC.predictions.map((p, i) => (
                      <li
                        key={p.place_id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectDestPrediction(i);
                        }}
                        onMouseEnter={() => destAC.setActiveIndex(i)}
                        onMouseLeave={() => destAC.setActiveIndex(null)}
                        className={`px-4 py-2 text-sm cursor-pointer transition-colors ${
                          i === destAC.activeIndex
                            ? "bg-primary/25 text-text-primary"
                            : "text-text-secondary hover:bg-primary/10"
                        }`}
                      >
                        {p.description}
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSwap}
            title="Swap origin and destination"
            aria-label="Swap origin and destination"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card-bg/90 text-text-muted hover:text-primary hover:border-primary/40 transition-colors"
          >
            <svg
              className="h-4 w-4 rotate-90"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M8 7V4m0 0L5.5 6.5M8 4l2.5 2.5M16 17v3m0 0-2.5-2.5M16 20l2.5-2.5M7 7h10M7 17h10"
              />
            </svg>
          </button>
        </div>
      </div>
    </form>
  );
}
