"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCustomPlacesAutocomplete } from "@/hooks/useCustomPlacesAutocomplete";
import type { AutocompletePrediction } from "@/hooks/useCustomPlacesAutocomplete";
import TripEndpoints from "./TripEndpoints";

import type { QuotaResult } from "@/lib/rate-limit/types";
import { getDevQuickSearch } from "@/lib/dev-quick-search";

/** Label passed to directions — resolved to GPS coords in page.tsx */
const CURRENT_LOCATION_LABEL = "Current Location";
const CURRENT_LOCATION_PLACE_ID = "__current_location__";

const CURRENT_LOCATION_PREDICTION: AutocompletePrediction = {
  description: CURRENT_LOCATION_LABEL,
  place_id: CURRENT_LOCATION_PLACE_ID,
};

function isCurrentLocationPrediction(
  prediction: AutocompletePrediction | null | undefined,
): boolean {
  return prediction?.place_id === CURRENT_LOCATION_PLACE_ID;
}

function waypointFromField(
  prediction: AutocompletePrediction | null,
  input: string,
): string | google.maps.Place {
  if (isCurrentLocationPrediction(prediction)) return CURRENT_LOCATION_LABEL;
  if (prediction) return { placeId: prediction.place_id };
  return input;
}

function SearchPurposeHeading() {
  return (
    <p className="pl-2 text-sm font-normal leading-snug text-text-secondary">
      Find restaurants along your transit route
    </p>
  );
}

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
  quota?: QuotaResult | null;
  /** Flush section inside the desktop overlay panel (no floating card chrome). */
  embedded?: boolean;
}

// Defined outside RouteSearch so React doesn't create a new component type on every render.
function PredictionList({
  predictions,
  activeIndex,
  onSelect,
  onHover,
  onLeave,
  showCurrentLocation = false,
  onSelectCurrentLocation,
}: {
  predictions: Array<{ place_id: string; description: string }>;
  activeIndex: number | null;
  onSelect: (predictionIndex: number) => void;
  onHover: (listIndex: number) => void;
  onLeave: () => void;
  showCurrentLocation?: boolean;
  onSelectCurrentLocation?: () => void;
}) {
  const offset = showCurrentLocation ? 1 : 0;

  return (
    <motion.ul
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      className="absolute z-50 top-full left-0 right-0 mt-1 bg-card-bg border border-border rounded-md shadow-xl overflow-hidden"
    >
      {showCurrentLocation && (
        <li
          onMouseDown={(e) => {
            e.preventDefault();
            onSelectCurrentLocation?.();
          }}
          onMouseEnter={() => onHover(0)}
          onMouseLeave={onLeave}
          className={`px-3 py-2 text-sm cursor-pointer transition-colors flex items-center gap-2.5 ${
            activeIndex === 0
              ? "bg-accent-soft text-text-primary"
              : "text-text-secondary hover:bg-accent-soft/60"
          }`}
        >
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 8a4 4 0 100 8 4 4 0 000-8zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
            </svg>
          </span>
          <span className="font-medium text-primary">Current location</span>
        </li>
      )}
      {predictions.map((p, i) => {
        const listIndex = i + offset;
        return (
          <li
            key={p.place_id}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(i);
            }}
            onMouseEnter={() => onHover(listIndex)}
            onMouseLeave={onLeave}
            className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
              activeIndex === listIndex
                ? "bg-accent-soft text-text-primary"
                : "text-text-secondary hover:bg-accent-soft/60"
            }`}
          >
            {p.description}
          </li>
        );
      })}
    </motion.ul>
  );
}

function formatNextIncrease(nextIncreaseAt: number): string {
  const diffMs = nextIncreaseAt - Date.now();
  if (diffMs <= 0) return "Available soon";

  const hrs = Math.floor(diffMs / 3_600_000);
  const mins = Math.floor((diffMs % 3_600_000) / 60_000);
  const secs = Math.floor((diffMs % 60_000) / 1000);

  if (hrs > 0) return `Next in ${hrs}h ${mins}m`;
  if (mins > 0) return `Next in ${mins}m`;
  return `Next in ${secs}s`;
}

function countdownTickMs(nextIncreaseAt: number): number {
  return nextIncreaseAt - Date.now() > 60_000 ? 60_000 : 1_000;
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
  quota = null,
  embedded = false,
}: RouteSearchProps) {
  const devQuickSearch = getDevQuickSearch();
  const skipNextAutoSearchRef = useRef(false);
  // After the first completed search, editing O/D must use Search / Enter.
  // Ref keeps auto-search effect deps stable (avoids HMR dep-array size errors).
  const requireExplicitSearchRef = useRef(
    Boolean(defaultOrigin && defaultDestination),
  );
  const originInputRef = useRef<HTMLInputElement>(null);
  const destInputRef = useRef<HTMLInputElement>(null);

  const nextIncreaseAt = quota?.nextIncreaseAt ?? null;
  const [countdown, setCountdown] = useState<string>(() =>
    nextIncreaseAt ? formatNextIncrease(nextIncreaseAt) : "",
  );
  useEffect(() => {
    if (!nextIncreaseAt) { setCountdown(""); return; }
    let timeoutId: number;
    const tick = () => {
      setCountdown(formatNextIncrease(nextIncreaseAt));
      timeoutId = window.setTimeout(tick, countdownTickMs(nextIncreaseAt));
    };
    tick();
    return () => window.clearTimeout(timeoutId);
  }, [nextIncreaseAt]);
  const [focusedField, setFocusedField] = useState<
    "origin" | "destination" | null
  >(null);

  const originAC = useCustomPlacesAutocomplete({
    initialInput: defaultOrigin,
    userLocation,
  });
  const destAC = useCustomPlacesAutocomplete({
    initialInput: defaultDestination,
    userLocation,
  });

  // When GPS arrives and origin is still empty, default to current location.
  useEffect(() => {
    if (!userLocation) return;
    if (originAC.input.trim()) return;
    skipNextAutoSearchRef.current = true;
    originAC.setInput(CURRENT_LOCATION_LABEL);
    originAC.setSelectedPrediction(CURRENT_LOCATION_PREDICTION);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation]);

  // When the parent re-provides an origin label (e.g. after a search completed),
  // sync the input so the field isn't empty on expand.
  useEffect(() => {
    if (!defaultOrigin) return;
    originAC.setInput(defaultOrigin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultOrigin]);

  useEffect(() => {
    if (defaultOrigin && defaultDestination) {
      requireExplicitSearchRef.current = true;
    }
  }, [defaultOrigin, defaultDestination]);

  // ── Shared helper ────────────────────────────────────────────────────────────


  // "both" mode: auto-search only before the first completed search.
  // After that, user must press Search / Enter (avoids quota waste while editing).
  useEffect(() => {
    if (requireExplicitSearchRef.current) return;
    if (skipNextAutoSearchRef.current) {
      skipNextAutoSearchRef.current = false;
      return;
    }
    if (!originAC.selectedPrediction && !destAC.selectedPrediction) return;

    const origin = waypointFromField(
      originAC.selectedPrediction,
      originAC.input,
    );
    const destination = waypointFromField(
      destAC.selectedPrediction,
      destAC.input,
    );

    if (!origin) { originInputRef.current?.focus(); return; }
    if (!destination) { destInputRef.current?.focus(); return; }
    if (searchDisabled) return;

    onSearch(origin, destination, originAC.input, destAC.input);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originAC.selectedPrediction, destAC.selectedPrediction]);

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

    // After a completed search, swap only updates fields — user confirms via Search.
    if (requireExplicitSearchRef.current) return;

    const nextOrigin = waypointFromField(
      nextOriginPrediction,
      nextOriginInput,
    );
    const nextDestination = waypointFromField(
      nextDestinationPrediction,
      nextDestinationInput,
    );

    if (nextOrigin && nextDestination && !searchDisabled) {
      onSearch(
        nextOrigin,
        nextDestination,
        nextOriginInput,
        nextDestinationInput,
      );
    }
  };

  const handleDevQuickSearch = () => {
    if (!devQuickSearch || searchDisabled) return;
    skipNextAutoSearchRef.current = true;
    originAC.setInput(devQuickSearch.origin);
    originAC.setSelectedPrediction(null);
    destAC.setInput(devQuickSearch.destination);
    destAC.setSelectedPrediction(null);
    onSearch(
      devQuickSearch.origin,
      devQuickSearch.destination,
      devQuickSearch.origin,
      devQuickSearch.destination,
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const o = waypointFromField(originAC.selectedPrediction, originAC.input);
    const d = waypointFromField(destAC.selectedPrediction, destAC.input);
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

  const selectCurrentLocationOrigin = () => {
    originAC.setInput(CURRENT_LOCATION_LABEL);
    originAC.setSelectedPrediction(CURRENT_LOCATION_PREDICTION);
    originAC.setActiveIndex(null);
    setFocusedField(null);
  };

  const selectCurrentLocationDest = () => {
    destAC.setInput(CURRENT_LOCATION_LABEL);
    destAC.setSelectedPrediction(CURRENT_LOCATION_PREDICTION);
    destAC.setActiveIndex(null);
    setFocusedField(null);
  };

  const selectOriginPrediction = (index: number) => {
    const selected = originAC.predictions[index];
    if (!selected) return;
    originAC.setInput(selected.description);
    originAC.setSelectedPrediction(selected);
    originAC.setActiveIndex(null);
    setFocusedField(null);
  };

  const selectDestPrediction = (index: number) => {
    const selected = destAC.predictions[index];
    if (!selected) return;
    destAC.setInput(selected.description);
    destAC.setSelectedPrediction(selected);
    destAC.setActiveIndex(null);
    setFocusedField(null);
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

  const originShowsCurrentLocation =
    Boolean(userLocation) &&
    originAC.input.trim().toLowerCase() !== "current location";

  const destShowsCurrentLocation =
    Boolean(userLocation) &&
    destAC.input.trim().toLowerCase() !== "current location";

  const originListMax =
    (originShowsCurrentLocation ? 1 : 0) + originAC.predictions.length - 1;
  const destListMax =
    (destShowsCurrentLocation ? 1 : 0) + destAC.predictions.length - 1;

  const canSubmitBoth =
    Boolean(originAC.input.trim() && destAC.input.trim()) && !searchDisabled;

  const handleOriginKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const max = originListMax;
    if (e.key === "ArrowDown") {
      if (max < 0) return;
      e.preventDefault();
      originAC.setActiveIndex(
        originAC.activeIndex === null ? 0 : Math.min(originAC.activeIndex + 1, max),
      );
      return;
    }
    if (e.key === "ArrowUp") {
      if (max < 0) return;
      e.preventDefault();
      originAC.setActiveIndex(
        originAC.activeIndex === null ? max : Math.max(originAC.activeIndex - 1, 0),
      );
      return;
    }
    if (e.key === "Enter" && originAC.activeIndex !== null && max >= 0) {
      e.preventDefault();
      const idx = originAC.activeIndex;
      if (originShowsCurrentLocation && idx === 0) {
        selectCurrentLocationOrigin();
      } else {
        selectOriginPrediction(originShowsCurrentLocation ? idx - 1 : idx);
      }
      return;
    }
    // Enter with no highlighted suggestion → native form submit
    if (e.key === "Escape") originAC.setActiveIndex(null);
  };

  const handleDestKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const max = destListMax;
    if (e.key === "ArrowDown") {
      if (max < 0) return;
      e.preventDefault();
      destAC.setActiveIndex(
        destAC.activeIndex === null ? 0 : Math.min(destAC.activeIndex + 1, max),
      );
      return;
    }
    if (e.key === "ArrowUp") {
      if (max < 0) return;
      e.preventDefault();
      destAC.setActiveIndex(
        destAC.activeIndex === null ? max : Math.max(destAC.activeIndex - 1, 0),
      );
      return;
    }
    if (e.key === "Enter") {
      // Highlighted suggestion → pick it; otherwise let the form submit / go.
      if (destAC.activeIndex !== null && max >= 0) {
        e.preventDefault();
        const idx = destAC.activeIndex;
        if (destShowsCurrentLocation && idx === 0) {
          selectCurrentLocationDest();
        } else {
          selectDestPrediction(destShowsCurrentLocation ? idx - 1 : idx);
        }
        return;
      }
      // No highlighted suggestion → form onSubmit runs (desktop Enter / mobile Search)
      return;
    }
    if (e.key === "Escape") destAC.setActiveIndex(null);
  };

  // ── Dropdown visibility ───────────────────────────────────────────────────────

  const originHasCommittedSelection =
    originAC.selectedPrediction !== null &&
    originAC.selectedPrediction.description === originAC.input;

  const destHasCommittedSelection =
    destAC.selectedPrediction !== null &&
    destAC.selectedPrediction.description === destAC.input;

  const showOriginDropdown =
    focusedField === "origin" &&
    !originHasCommittedSelection &&
    (originShowsCurrentLocation || originAC.predictions.length > 0);

  const showDestDropdown =
    focusedField === "destination" &&
    !destHasCommittedSelection &&
    (destShowsCurrentLocation || destAC.predictions.length > 0);


  // ── Render ────────────────────────────────────────────────────────────────────

  const originDisplayLabel =
    defaultOrigin === "Current Location" ? "Current location" : defaultOrigin;
  const limitReached = quota !== null && quota.remaining === 0;

  return (
    <div
      className={`flex flex-col bg-card-bg ${
        embedded
          ? collapsed
            ? "border-b border-border"
            : ""
          : "rounded-lg border border-border shadow-lg"
      }`}
    >
      {collapsed ? (
        /* ── Collapsed pill ─────────────────────────────────── */
        <button
          type="button"
          onClick={onExpand}
          className={`flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-accent-soft ${
            embedded ? "" : "rounded-t-lg"
          }`}
          aria-label="Edit search"
        >
          <svg
            className="h-4 w-4 shrink-0 text-text-muted"
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
          <TripEndpoints
            origin={originDisplayLabel || "Origin"}
            destination={defaultDestination || "Destination"}
          />
          <svg
            className="h-3.5 w-3.5 shrink-0 text-text-muted"
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
      ) : (
        /* ── Both fields: origin + destination ─────────────── */
        <form
          className="px-3 py-2.5 flex flex-col gap-2"
          onSubmit={handleSubmit}
        >
          <div className="flex items-start justify-between gap-2">
            <SearchPurposeHeading />
            {devQuickSearch && (
              <button
                type="button"
                onClick={handleDevQuickSearch}
                disabled={searchDisabled}
                title={`${devQuickSearch.origin} → ${devQuickSearch.destination}`}
                className="shrink-0 rounded-md border border-dashed border-amber-500/60 px-1.5 py-0.5 text-[10px] font-medium text-amber-500 transition-colors hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Dev: {devQuickSearch.label}
              </button>
            )}
          </div>
          <div className="flex gap-3">
            {/* Route line indicator */}
            <div className="flex flex-col items-center py-1.5 shrink-0 w-4">
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
                    enterKeyHint="next"
                    placeholder="Starting point"
                    value={originAC.input}
                    onChange={handleOriginChange}
                    onFocus={() => setFocusedField("origin")}
                    onBlur={() => setFocusedField(null)}
                    onKeyDown={handleOriginKeyDown}
                    className={`w-full pl-3 py-1.5 text-sm border border-border rounded-md
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
                        showCurrentLocation={originShowsCurrentLocation}
                        onSelectCurrentLocation={selectCurrentLocationOrigin}
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
                    enterKeyHint="search"
                    placeholder="Destination"
                    value={destAC.input}
                    onChange={handleDestChange}
                    onFocus={() => setFocusedField("destination")}
                    onBlur={() => setFocusedField(null)}
                    onKeyDown={handleDestKeyDown}
                    className={`w-full pl-3 py-1.5 text-sm border border-border rounded-md
                      bg-app-bg text-text-primary placeholder:text-text-muted
                      focus:outline-none focus:ring-2 focus:ring-accent-ring/70
                      ${destAC.input ? "pr-8" : "pr-4"}`}
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
                      <PredictionList
                        predictions={destAC.predictions}
                        activeIndex={destAC.activeIndex}
                        onSelect={selectDestPrediction}
                        onHover={(i) => destAC.setActiveIndex(i)}
                        onLeave={() => destAC.setActiveIndex(null)}
                        showCurrentLocation={destShowsCurrentLocation}
                        onSelectCurrentLocation={selectCurrentLocationDest}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Swap + search on the right */}
              <div className="absolute right-0 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2">
                <button
                  type="button"
                  onClick={handleSwap}
                  title="Swap origin and destination"
                  aria-label="Swap origin and destination"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card-bg/90 text-text-muted transition-colors hover:border-text-muted hover:text-text-primary"
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
                <button
                  type="submit"
                  disabled={!canSubmitBoth}
                  title="Search route"
                  aria-label="Search route"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-fg shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </button>
              </div>
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

      {quota !== null && (
        <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-1.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex gap-0.5 shrink-0">
              {Array.from({ length: quota.limit }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-3 rounded-full transition-colors ${
                    i < quota.remaining
                      ? "bg-text-primary"
                      : limitReached
                        ? "bg-amber-400"
                        : "bg-border"
                  }`}
                />
              ))}
            </div>
            <span
              className={`text-xs font-medium truncate ${
                limitReached ? "text-amber-500" : "text-text-secondary"
              }`}
            >
              {quota.remaining === 1
                ? `1 of ${quota.limit} search remaining`
                : `${quota.remaining} of ${quota.limit} searches remaining`}
            </span>
          </div>
          {countdown ? (
            <span
              className={`text-xs font-medium shrink-0 tabular-nums ${
                limitReached ? "text-amber-500" : "text-text-muted"
              }`}
            >
              {countdown}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
