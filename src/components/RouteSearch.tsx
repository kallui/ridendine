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
  searchDisabled?: boolean;
  searchBlockedMessage?: string | null;
  defaultOrigin?: string;
  defaultDestination?: string;
  userLocation?: google.maps.LatLngLiteral | null;
  collapsed?: boolean;
  onExpand?: () => void;
  searchCount?: number;
  dailyLimit?: number;
  dailyLimitReached?: boolean;
  limitResetAt?: number | null;
}

// Defined outside RouteSearch so React doesn't create a new component type on every render.
function PredictionList({
  predictions,
  activeIndex,
  onSelect,
  onHover,
  onLeave,
}: {
  predictions: Array<{ place_id: string; description: string }>;
  activeIndex: number | null;
  onSelect: (i: number) => void;
  onHover: (i: number) => void;
  onLeave: () => void;
}) {
  return (
    <motion.ul
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      className="absolute z-50 top-full left-0 right-0 mt-1 bg-card-bg border border-border rounded-md shadow-xl overflow-hidden"
    >
      {predictions.map((p, i) => (
        <li
          key={p.place_id}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(i);
          }}
          onMouseEnter={() => onHover(i)}
          onMouseLeave={onLeave}
          className={`px-4 py-2 text-sm cursor-pointer transition-colors ${
            i === activeIndex
              ? "bg-accent-soft text-text-primary"
              : "text-text-secondary hover:bg-accent-soft/60"
          }`}
        >
          {p.description}
        </li>
      ))}
    </motion.ul>
  );
}

function formatResetCountdown(resetAt: number): string {
  const diffMs = resetAt - Date.now();
  if (diffMs <= 0) return "Resetting soon";

  // Floor each unit — ceil was rounding 23h 59m 1s up to "24h 0m".
  const hrs = Math.floor(diffMs / 3_600_000);
  const mins = Math.floor((diffMs % 3_600_000) / 60_000);
  const secs = Math.floor((diffMs % 60_000) / 1000);

  if (hrs > 0) return `${hrs}h ${mins}m until reset`;
  if (mins > 0) return `${mins}m until reset`;
  return `${secs}s until reset`;
}

function countdownTickMs(resetAt: number): number {
  return resetAt - Date.now() > 60_000 ? 60_000 : 1_000;
}

export default function RouteSearch({
  onSearch,
  isLoading,
  searchDisabled,
  searchBlockedMessage,
  defaultOrigin,
  defaultDestination,
  userLocation,
  collapsed = false,
  onExpand,
  searchCount = 0,
  dailyLimit = 5,
  dailyLimitReached = false,
  limitResetAt = null,
}: RouteSearchProps) {
  const skipNextAutoSearchRef = useRef(false);
  const originInputRef = useRef<HTMLInputElement>(null);
  const destInputRef = useRef<HTMLInputElement>(null);

  const [countdown, setCountdown] = useState<string>(() =>
    limitResetAt ? formatResetCountdown(limitResetAt) : "",
  );
  useEffect(() => {
    if (!limitResetAt) return;
    let timeoutId: number;
    const tick = () => {
      setCountdown(formatResetCountdown(limitResetAt));
      timeoutId = window.setTimeout(tick, countdownTickMs(limitResetAt));
    };
    tick();
    return () => window.clearTimeout(timeoutId);
  }, [limitResetAt]);
  const [focusedField, setFocusedField] = useState<
    "origin" | "destination" | null
  >(null);

  // "dest-only": single "Where to?" box.
  // "both": full origin + destination form.
  // Start in "both" if a previous search already set the origin label.
  const [phase, setPhase] = useState<"dest-only" | "both">(
    defaultOrigin ? "both" : "dest-only",
  );

  const originAC = useCustomPlacesAutocomplete({
    initialInput: defaultOrigin,
    userLocation,
  });
  const destAC = useCustomPlacesAutocomplete({
    initialInput: defaultDestination,
    userLocation,
  });


  // When the parent re-provides an origin label (e.g. after a search completed),
  // switch to the full form and sync the input so the field isn't empty on expand.
  useEffect(() => {
    if (!defaultOrigin) return;
    setPhase("both");
    originAC.setInput(defaultOrigin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultOrigin]);

  // Focus the destination input programmatically rather than using autoFocus.
  // autoFocus fires the native DOM focus before React's handlers are attached
  // (SSR hydration timing), so onFocus never fires and focusedField stays null.
  // A useEffect focus call happens post-hydration with handlers ready.
  useEffect(() => {
    if (!collapsed && phase === "dest-only") {
      const t = setTimeout(() => destInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [collapsed, phase]);

  // ── Shared helper ────────────────────────────────────────────────────────────

  /**
   * Called after the destination is confirmed while in dest-only mode.
   * If we have a location: auto-search immediately with "Current Location".
   * If we don't: reveal the origin field so the user can type it.
   */
  const proceedFromDest = (
    dest: string | google.maps.Place,
    destLabel: string,
  ) => {
    if (!dest) return;
    if (userLocation) {
      if (!searchDisabled)
        onSearch("Current Location", dest, "Current Location", destLabel);
    } else {
      // No location — reveal origin field and let user fill it in.
      originAC.setInput("");
      originAC.setSelectedPrediction(null);
      setPhase("both");
      setTimeout(() => originInputRef.current?.focus(), 60);
    }
  };

  // ── Auto-search effects ───────────────────────────────────────────────────────

  // "both" mode: fire when either autocomplete selection changes.
  useEffect(() => {
    if (phase !== "both") return;
    if (skipNextAutoSearchRef.current) {
      skipNextAutoSearchRef.current = false;
      return;
    }
    if (!originAC.selectedPrediction && !destAC.selectedPrediction) return;

    const origin = originAC.selectedPrediction
      ? { placeId: originAC.selectedPrediction.place_id }
      : originAC.input;
    const destination = destAC.selectedPrediction
      ? { placeId: destAC.selectedPrediction.place_id }
      : destAC.input;

    if (!origin) { originInputRef.current?.focus(); return; }
    if (!destination) { destInputRef.current?.focus(); return; }
    if (searchDisabled) return;

    onSearch(origin, destination, originAC.input, destAC.input);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originAC.selectedPrediction, destAC.selectedPrediction]);

  // "dest-only" mode: fire when user picks from autocomplete.
  useEffect(() => {
    if (phase !== "dest-only") return;
    if (!destAC.selectedPrediction) return;
    proceedFromDest(
      { placeId: destAC.selectedPrediction.place_id },
      destAC.input,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destAC.selectedPrediction]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

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

    if (nextOrigin && nextDestination && !searchDisabled) {
      onSearch(
        nextOrigin,
        nextDestination,
        nextOriginInput,
        nextDestinationInput,
      );
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (phase === "dest-only") {
      proceedFromDest(
        destAC.selectedPrediction
          ? { placeId: destAC.selectedPrediction.place_id }
          : destAC.input,
        destAC.input,
      );
      return;
    }
    const o = originAC.selectedPrediction
      ? { placeId: originAC.selectedPrediction.place_id }
      : originAC.input;
    const d = destAC.selectedPrediction
      ? { placeId: destAC.selectedPrediction.place_id }
      : destAC.input;
    if (o && d && !searchDisabled) onSearch(o, d, originAC.input, destAC.input);
  };

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

  const selectDestPrediction = (index: number) => {
    const selected = destAC.predictions[index];
    if (!selected) return;
    destAC.setInput(selected.description);
    destAC.setSelectedPrediction(selected);
    destAC.setActiveIndex(null);
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
    if (phase === "dest-only") {
      destInputRef.current?.focus();
    } else {
      destInputRef.current?.focus();
    }
  };

  const handleOriginKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const max = originAC.predictions.length - 1;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      originAC.setActiveIndex(
        originAC.activeIndex === null ? 0 : Math.min(originAC.activeIndex + 1, max),
      );
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      originAC.setActiveIndex(
        originAC.activeIndex === null ? max : Math.max(originAC.activeIndex - 1, 0),
      );
      return;
    }
    if (e.key === "Enter" && originAC.activeIndex !== null && max >= 0) {
      e.preventDefault();
      selectOriginPrediction(originAC.activeIndex);
      return;
    }
    if (e.key === "Escape") originAC.setActiveIndex(null);
  };

  const handleDestKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const max = destAC.predictions.length - 1;
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
    if (e.key === "Enter") {
      e.preventDefault();
      if (destAC.activeIndex !== null && max >= 0) {
        selectDestPrediction(destAC.activeIndex);
      } else if (phase === "dest-only") {
        proceedFromDest(
          destAC.selectedPrediction
            ? { placeId: destAC.selectedPrediction.place_id }
            : destAC.input,
          destAC.input,
        );
      }
      return;
    }
    if (e.key === "Escape") destAC.setActiveIndex(null);
  };

  // ── Dropdown visibility ───────────────────────────────────────────────────────

  const showOriginDropdown =
    focusedField === "origin" &&
    originAC.predictions.length > 0 &&
    originAC.selectedPrediction?.description !== originAC.input;

  const showDestDropdown =
    focusedField === "destination" &&
    destAC.predictions.length > 0 &&
    destAC.selectedPrediction?.description !== destAC.input;


  // ── Render ────────────────────────────────────────────────────────────────────

  const originDisplayLabel =
    defaultOrigin === "Current Location" ? "Current location" : defaultOrigin;
  const searchesLeft = dailyLimit - searchCount;

  return (
    <div className="bg-card-bg rounded-lg shadow-lg flex flex-col border border-border">
      {collapsed ? (
        /* ── Collapsed pill ─────────────────────────────────── */
        <button
          type="button"
          onClick={onExpand}
          className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-accent-soft/40 transition-colors text-left rounded-t-lg"
          aria-label="Edit search"
        >
          <svg
            className="w-4 h-4 text-text-muted shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <span className="text-text-primary text-sm flex-1 flex items-center gap-0 min-w-0">
            <span className="text-text-muted truncate min-w-0 max-w-[40%]">
              {originDisplayLabel || "Origin"}
            </span>
            <span className="text-text-muted mx-1.5 shrink-0">→</span>
            <span className="truncate min-w-0 max-w-[40%]">
              {defaultDestination || "Destination"}
            </span>
          </span>
          <svg
            className="w-3.5 h-3.5 text-text-muted shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2.414a2 2 0 01.586-1.414z"
            />
          </svg>
        </button>
      ) : phase === "dest-only" ? (
        /* ── Dest-only: single "Where to?" input ───────────── */
        <form
          className="p-2.5 sm:p-4 flex flex-col gap-2"
          onSubmit={handleSubmit}
        >
          {userLocation ? (
            /* ── Has GPS: show locked "Current location" origin + dest ── */
            <div className="flex gap-3">
              {/* Route line indicator */}
              <div className="flex flex-col items-center py-2.5 shrink-0 w-4">
                <div className="w-2.5 h-2.5 rounded-full border-2 border-text-secondary shrink-0" />
                <div className="w-px flex-1 bg-border my-1.5" />
                <div className="w-3 h-3 bg-text-primary rotate-45 rounded-sm shrink-0" />
              </div>

              <div className="flex-1 flex flex-col gap-2">
                {/* Origin — read-only "Current location" chip */}
                <button
                  type="button"
                  onClick={() => {
                    originAC.setInput("Current Location");
                    setPhase("both");
                    setTimeout(() => originInputRef.current?.focus(), 60);
                  }}
                  className="w-full text-left pl-3 pr-3 py-2 sm:py-2.5 border border-border rounded-md bg-app-bg/60 text-text-secondary text-sm flex items-center gap-1.5 hover:bg-app-bg hover:border-text-muted transition-colors group"
                  title="Click to change starting point"
                >
                  <svg className="w-3 h-3 shrink-0 text-primary" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  <span className="flex-1 truncate">Current location</span>
                  <svg className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-40 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2.414a2 2 0 01.586-1.414z" />
                  </svg>
                </button>

                {/* Destination */}
                <div className="relative">
                  <input
                    ref={destInputRef}
                    type="text"
                    autoComplete="off"
                    placeholder="Where to?"
                    value={destAC.input}
                    onChange={handleDestChange}
                    onFocus={() => setFocusedField("destination")}
                    onBlur={() => setFocusedField(null)}
                    onKeyDown={handleDestKeyDown}
                    className={`w-full pl-4 py-2 sm:py-2.5 border border-border rounded-md
                      bg-app-bg text-text-primary placeholder:text-text-muted
                      focus:outline-none focus:ring-2 focus:ring-accent-ring/70
                      ${destAC.input ? "pr-14" : "pr-9"}`}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                    {destAC.input && (
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleClearDest(); }}
                        className="p-1 text-text-muted hover:text-text-primary transition-colors"
                        aria-label="Clear destination"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                    <button
                      type="submit"
                      className="p-1 text-text-muted hover:text-text-primary transition-colors"
                      aria-label="Search"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                  </div>
                  <AnimatePresence>
                    {showDestDropdown && (
                      <PredictionList
                        predictions={destAC.predictions}
                        activeIndex={destAC.activeIndex}
                        onSelect={selectDestPrediction}
                        onHover={(i) => destAC.setActiveIndex(i)}
                        onLeave={() => destAC.setActiveIndex(null)}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          ) : (
            /* ── No GPS: single "Where to?" with manual origin option ── */
            <>
              <div className="flex gap-3 items-center">
                {/* Destination diamond icon */}
                <div className="flex items-center justify-center shrink-0 w-4">
                  <div className="w-3 h-3 bg-text-primary rotate-45 rounded-sm" />
                </div>

                <div className="relative flex-1">
                  <input
                    ref={destInputRef}
                    type="text"
                    autoComplete="off"
                    placeholder="Where to?"
                    value={destAC.input}
                    onChange={handleDestChange}
                    onFocus={() => setFocusedField("destination")}
                    onBlur={() => setFocusedField(null)}
                    onKeyDown={handleDestKeyDown}
                    className={`w-full pl-4 py-2 sm:py-2.5 border border-border rounded-md
                      bg-app-bg text-text-primary placeholder:text-text-muted
                      focus:outline-none focus:ring-2 focus:ring-accent-ring/70
                      ${destAC.input ? "pr-14" : "pr-9"}`}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                    {destAC.input && (
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleClearDest(); }}
                        className="p-1 text-text-muted hover:text-text-primary transition-colors"
                        aria-label="Clear destination"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                    <button
                      type="submit"
                      className="p-1 text-text-muted hover:text-text-primary transition-colors"
                      aria-label="Search"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                  </div>
                  <AnimatePresence>
                    {showDestDropdown && (
                      <PredictionList
                        predictions={destAC.predictions}
                        activeIndex={destAC.activeIndex}
                        onSelect={selectDestPrediction}
                        onHover={(i) => destAC.setActiveIndex(i)}
                        onLeave={() => destAC.setActiveIndex(null)}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPhase("both")}
                className="pl-7 text-xs text-text-muted hover:text-text-primary transition-colors text-left"
              >
                + Add starting point manually
              </button>
            </>
          )}

          {searchBlockedMessage && (
            <p className="text-amber-300 text-xs px-1">{searchBlockedMessage}</p>
          )}
          {isLoading && (
            <p className="text-text-muted text-xs px-1">Loading maps...</p>
          )}
        </form>
      ) : (
        /* ── Both fields: origin + destination ─────────────── */
        <form
          className="p-2.5 sm:p-4 flex flex-col gap-2 sm:gap-3"
          onSubmit={handleSubmit}
        >
          <div className="flex gap-3">
            {/* Route line indicator */}
            <div className="flex flex-col items-center py-3 shrink-0 w-4">
              <div className="w-2.5 h-2.5 rounded-full border-2 border-text-secondary shrink-0" />
              <div className="w-px flex-1 bg-border my-2" />
              <div className="w-3 h-3 bg-text-primary rotate-45 rounded-sm shrink-0" />
            </div>

            <div className="relative flex-1">
              <div className="flex flex-col gap-2 pr-10">
                {/* Origin */}
                <div className="relative">
                  <input
                    ref={originInputRef}
                    type="text"
                    id="origin"
                    autoComplete="off"
                    placeholder="Starting point"
                    value={originAC.input}
                    onChange={handleOriginChange}
                    onFocus={() => setFocusedField("origin")}
                    onBlur={() => setFocusedField(null)}
                    onKeyDown={handleOriginKeyDown}
                    className={`w-full pl-4 py-2 sm:py-2.5 border border-border rounded-md
                      bg-app-bg text-text-primary placeholder:text-text-muted
                      focus:outline-none focus:ring-2 focus:ring-accent-ring/70
                      ${originAC.input ? "pr-8" : "pr-4"}`}
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
                      <PredictionList
                        predictions={originAC.predictions}
                        activeIndex={originAC.activeIndex}
                        onSelect={selectOriginPrediction}
                        onHover={(i) => originAC.setActiveIndex(i)}
                        onLeave={() => originAC.setActiveIndex(null)}
                      />
                    )}
                  </AnimatePresence>
                </div>

                {/* Destination */}
                <div className="relative">
                  <input
                    ref={destInputRef}
                    type="text"
                    id="destination"
                    autoComplete="off"
                    placeholder="Destination"
                    value={destAC.input}
                    onChange={handleDestChange}
                    onFocus={() => setFocusedField("destination")}
                    onBlur={() => setFocusedField(null)}
                    onKeyDown={handleDestKeyDown}
                    className={`w-full pl-4 py-2 sm:py-2.5 border border-border rounded-md
                      bg-app-bg text-text-primary placeholder:text-text-muted
                      focus:outline-none focus:ring-2 focus:ring-accent-ring/70
                      ${destAC.input ? "pr-14" : "pr-9"}`}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                    {destAC.input && (
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleClearDest(); }}
                        className="p-1 text-text-muted hover:text-text-primary transition-colors"
                        aria-label="Clear destination"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                    <button
                      type="submit"
                      className="p-1 text-text-muted hover:text-text-primary transition-colors"
                      aria-label="Search"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                  </div>
                  <AnimatePresence>
                    {showDestDropdown && (
                      <PredictionList
                        predictions={destAC.predictions}
                        activeIndex={destAC.activeIndex}
                        onSelect={selectDestPrediction}
                        onHover={(i) => destAC.setActiveIndex(i)}
                        onLeave={() => destAC.setActiveIndex(null)}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Swap button */}
              <button
                type="button"
                onClick={handleSwap}
                title="Swap origin and destination"
                aria-label="Swap origin and destination"
                className="absolute right-0 top-1/2 -translate-y-1/2 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card-bg/90 text-text-muted hover:text-text-primary hover:border-text-muted transition-colors"
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

          {searchBlockedMessage && (
            <p className="text-amber-300 text-xs px-1">{searchBlockedMessage}</p>
          )}
          {isLoading && (
            <p className="text-text-muted text-xs px-1">Loading maps...</p>
          )}
        </form>
      )}

      {dailyLimit > 0 && (
        <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex gap-0.5 shrink-0">
              {Array.from({ length: dailyLimit }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-3 rounded-full transition-colors ${
                    i < searchesLeft
                      ? dailyLimitReached
                        ? "bg-amber-400"
                        : "bg-text-primary"
                      : "bg-border"
                  }`}
                />
              ))}
            </div>
            <span
              className={`text-xs font-medium truncate ${
                dailyLimitReached ? "text-amber-500" : "text-text-secondary"
              }`}
            >
              {searchesLeft === 1
                ? `1 of ${dailyLimit} search remaining`
                : `${searchesLeft} of ${dailyLimit} searches remaining`}
            </span>
          </div>
          {limitResetAt && searchCount > 0 ? (
            <span
              className={`text-xs font-medium shrink-0 tabular-nums ${
                dailyLimitReached ? "text-amber-500" : "text-text-muted"
              }`}
            >
              {countdown || "…"}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
