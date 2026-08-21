"use client";

import { Restaurant, StopGroup, StopResolution } from "@/app/page";
import StopGroupCard from "./StopGroupCard";
import RestaurantCard from "./RestaurantCard";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  RESTAURANT_SORT_LABELS,
  type RestaurantSort,
  sortRestaurants,
} from "@/lib/restaurant-rank";

interface RestaurantSidebarProps {
  restaurants: Restaurant[];
  stopGroups: StopGroup[];
  stopResolution?: StopResolution;
  selectedStopIndex?: number | null;
  onStopClick?: (stopIndex: number) => void;
  onRestaurantClick: (restaurant: Restaurant) => void;
  onPhotoClick?: (restaurant: Restaurant) => void;
  onRestaurantHover?: (restaurant: Restaurant | null) => void;
  variant?: "desktop" | "sheet";
  onBack?: () => void;
  isSearching?: boolean;
  routeHeadline?: string;
}

type ViewMode = "list" | "stop";

const SAMPLED_DISCLAIMER =
  "No exact stop data — searched every 500 m along your route.";

const SORT_OPTIONS: RestaurantSort[] = [
  "recommended",
  "most_reviewed",
  "shortest_detour",
];

export default function RestaurantSidebar({
  restaurants,
  stopGroups,
  stopResolution = "gtfs",
  selectedStopIndex,
  onStopClick,
  onRestaurantClick,
  onPhotoClick,
  onRestaurantHover,
  variant = "desktop",
  onBack,
  isSearching = false,
  routeHeadline,
}: RestaurantSidebarProps) {
  const isSampled = stopResolution === "sampled";
  const canGroupByStop = !isSampled;
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sort, setSort] = useState<RestaurantSort>("recommended");
  const listRef = useRef<HTMLDivElement>(null);

  const effectiveView: ViewMode = canGroupByStop ? viewMode : "list";

  const filteredRestaurants = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const matched = q
      ? restaurants.filter((r) => r.name.toLowerCase().includes(q))
      : restaurants;
    return sortRestaurants(matched, sort);
  }, [restaurants, searchQuery, sort]);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return stopGroups
      .map((group) => ({
        ...group,
        restaurants: sortRestaurants(
          q
            ? group.restaurants.filter((r) => r.name.toLowerCase().includes(q))
            : group.restaurants,
          sort,
        ),
      }))
      .filter((group) => group.restaurants.length > 0);
  }, [stopGroups, searchQuery, sort]);

  useEffect(() => {
    if (effectiveView !== "stop" || selectedStopIndex == null) return;
    const node = listRef.current?.querySelector(
      `[data-stop-index="${selectedStopIndex}"]`,
    );
    node?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedStopIndex, effectiveView]);

  const totalRestaurants = restaurants.length;
  const isEmpty =
    (isSampled ? restaurants.length === 0 : stopGroups.length === 0) &&
    !isSearching;

  if (isEmpty) {
    if (variant === "desktop") {
      return (
        <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-6">
          <p className="text-center text-sm text-text-muted">
            No restaurants found along this route.
          </p>
        </div>
      );
    }
    return null;
  }

  const sampledDisclaimer = isSampled ? (
    <p className="mt-1.5 text-xs leading-snug text-text-muted">
      {SAMPLED_DISCLAIMER}
    </p>
  ) : null;

  const emptySearch = (
    <p className="pt-8 text-center text-sm text-text-muted">
      No restaurants match your search.
    </p>
  );

  const listRows =
    filteredRestaurants.length === 0
      ? emptySearch
      : filteredRestaurants.map((restaurant) => (
          <RestaurantCard
            key={restaurant.placeId}
            restaurant={restaurant}
            onClick={onRestaurantClick}
            onPhotoClick={onPhotoClick}
            onHover={onRestaurantHover}
          />
        ));

  const stopSections =
    filteredGroups.length === 0
      ? emptySearch
      : filteredGroups.map((group) => (
          <StopGroupCard
            key={group.stopIndex}
            group={group}
            isSelected={group.stopIndex === selectedStopIndex}
            onSelect={() => onStopClick?.(group.stopIndex)}
            onRestaurantClick={onRestaurantClick}
            onPhotoClick={onPhotoClick}
            onRestaurantHover={onRestaurantHover}
          />
        ));

  const restaurantList =
    effectiveView === "stop" ? stopSections : listRows;
  const isStopView = effectiveView === "stop" && !isSearching;

  const countLabel = isSearching
    ? "Searching…"
    : searchQuery
      ? `${filteredRestaurants.length} match${filteredRestaurants.length !== 1 ? "es" : ""}`
      : `${totalRestaurants}`;

  const loadingSkeleton = (
    <>
      <p className="flex items-center justify-center gap-2 pb-1 pt-2 text-center text-xs text-text-muted">
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-text-muted border-t-transparent" />
        Searching for restaurants…
      </p>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse gap-3 rounded-lg border border-border bg-card-bg px-2.5 py-2"
        >
          <div className="h-16 w-16 shrink-0 rounded-md bg-border" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3.5 w-3/5 rounded bg-border" />
            <div className="h-2.5 w-2/5 rounded bg-border opacity-60" />
            <div className="h-2.5 w-1/2 rounded bg-border opacity-40" />
          </div>
        </div>
      ))}
    </>
  );

  const compactToolbar = (
    <div className="shrink-0 border-b border-border px-3 py-2">
      {filterOpen && !isSearching ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            autoFocus
            placeholder="Search restaurants…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-border bg-app-bg px-2.5 py-1 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-ring"
          />
          <button
            type="button"
            onClick={() => {
              setFilterOpen(false);
              setSearchQuery("");
            }}
            className="shrink-0 rounded p-1 text-text-muted hover:text-text-primary"
            aria-label="Close search"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-xs font-semibold text-text-primary">
            {countLabel}
          </span>
          {!isSearching && (
            <>
              {canGroupByStop && (
                <div
                  className="grid shrink-0 grid-cols-2 rounded-md border border-border p-0.5"
                  role="tablist"
                  aria-label="Restaurant view"
                >
                  {(["list", "stop"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      role="tab"
                      aria-selected={effectiveView === mode}
                      onClick={() => setViewMode(mode)}
                      className={`rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
                        effectiveView === mode
                          ? "bg-primary text-primary-fg"
                          : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {mode === "list" ? "List" : "By stop"}
                    </button>
                  ))}
                </div>
              )}
              <select
                aria-label="Sort restaurants"
                value={sort}
                onChange={(e) => setSort(e.target.value as RestaurantSort)}
                className="ml-auto min-w-0 max-w-[9.5rem] truncate rounded-md border border-border bg-app-bg px-1.5 py-0.5 text-[11px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-ring"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {RESTAURANT_SORT_LABELS[option]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setFilterOpen(true)}
                className="shrink-0 rounded p-1 text-text-muted hover:text-text-primary"
                aria-label="Search restaurants"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            </>
          )}
        </div>
      )}
      {sampledDisclaimer && (
        <p className="mt-1.5 text-[11px] leading-snug text-text-muted">
          {SAMPLED_DISCLAIMER}
        </p>
      )}
    </div>
  );

  if (variant === "sheet") {
    return (
      <div className="flex h-full flex-col">
        {onBack && (
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
            <button
              onClick={onBack}
              className="flex shrink-0 items-center gap-1 text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              ← Change route
            </button>
            {routeHeadline && (
              <span className="truncate text-right text-xs text-text-muted">
                {routeHeadline}
              </span>
            )}
          </div>
        )}
        {compactToolbar}

        <div ref={listRef} className="flex-1 overflow-y-auto">
          <div className={isStopView ? "pb-8" : "space-y-3 p-4 pb-8"}>
            {isSearching ? loadingSkeleton : restaurantList}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {compactToolbar}

      <div className="relative min-h-0 flex-1">
        <div
          ref={listRef}
          className={`h-full overflow-y-auto pb-8 ${
            isStopView ? "" : "space-y-2 p-3"
          }`}
        >
          {isSearching ? loadingSkeleton : restaurantList}
        </div>
      </div>
    </div>
  );
}
