"use client";

import { Restaurant, StopGroup } from "@/app/page";
import StopGroupCard from "./StopGroupCard";
import { useState, useMemo, useEffect } from "react";

interface RestaurantSidebarProps {
  restaurants: Restaurant[];
  stopGroups: StopGroup[];
  selectedStopIndex?: number | null;
  onStopClick?: (stopIndex: number) => void;
  onRestaurantClick: (restaurant: Restaurant) => void;
  variant?: "desktop" | "sheet";
  onBack?: () => void;
  isSearching?: boolean;
  routeHeadline?: string;
}

export default function RestaurantSidebar({
  restaurants,
  stopGroups,
  selectedStopIndex,
  onRestaurantClick,
  variant = "desktop",
  onBack,
  isSearching = false,
  routeHeadline,
}: RestaurantSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // Set of stop indices whose accordion section is open.
  const [expandedStops, setExpandedStops] = useState<Set<number>>(new Set());

  // Auto-expand the stop that was clicked on the map.
  useEffect(() => {
    if (selectedStopIndex !== null && selectedStopIndex !== undefined) {
      setExpandedStops((prev) => new Set([...prev, selectedStopIndex]));
    }
  }, [selectedStopIndex]);

  const toggleStop = (stopIndex: number) => {
    setExpandedStops((prev) => {
      const next = new Set(prev);
      if (next.has(stopIndex)) next.delete(stopIndex);
      else next.add(stopIndex);
      return next;
    });
  };

  // Filter stop groups by the search query: keep groups that have at least
  // one matching restaurant, showing only the matches within each group.
  const filteredGroups = useMemo(() => {
    if (!searchQuery) return stopGroups;
    const q = searchQuery.toLowerCase();
    return stopGroups
      .map((g) => ({
        ...g,
        restaurants: g.restaurants.filter((r) =>
          r.name.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.restaurants.length > 0);
  }, [stopGroups, searchQuery]);

  const totalRestaurants = restaurants.length;
  const totalStops = stopGroups.length;
  const isEmpty = stopGroups.length === 0 && !isSearching;

  if (isEmpty) return null;

  const searchInput = (
    <div className="space-y-2">
      <input
        type="text"
        placeholder="Search restaurants…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-4 py-2 border border-border rounded-md bg-app-bg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-ring text-sm"
      />
    </div>
  );

  const groupList = filteredGroups.length === 0 ? (
    <p className="text-text-muted text-sm text-center pt-8">
      No restaurants match your search.
    </p>
  ) : (
    filteredGroups.map((group) => (
      <StopGroupCard
        key={group.stopIndex}
        group={group}
        isExpanded={expandedStops.has(group.stopIndex)}
        onToggle={() => toggleStop(group.stopIndex)}
        onRestaurantClick={onRestaurantClick}
      />
    ))
  );

  const loadingSkeleton = (
    <>
      <p className="text-text-muted text-xs text-center pt-2 pb-1 flex items-center justify-center gap-2">
        <span className="inline-block w-3 h-3 rounded-full border-2 border-text-muted border-t-transparent animate-spin" />
        Searching for restaurants…
      </p>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card-bg p-3 space-y-2 animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-border shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-3/5 rounded bg-border" />
              <div className="h-2.5 w-1/4 rounded bg-border opacity-60" />
            </div>
          </div>
          <div className="pl-5 space-y-1.5">
            <div className="h-2.5 w-4/5 rounded bg-border opacity-50" />
            <div className="h-2.5 w-3/5 rounded bg-border opacity-40" />
          </div>
        </div>
      ))}
    </>
  );

  // ── Sheet variant (mobile bottom sheet) ──────────────────────────────────

  if (variant === "sheet") {
    return (
      <div className="h-full flex flex-col">
        <div className="shrink-0 bg-card-bg px-4 py-3 border-b border-border space-y-2">
          {onBack && (
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={onBack}
                className="text-text-secondary hover:text-text-primary text-sm flex items-center gap-1 transition-colors shrink-0"
              >
                ← Change route
              </button>
              {routeHeadline && (
                <span className="text-text-muted text-xs truncate text-right">
                  {routeHeadline}
                </span>
              )}
            </div>
          )}
          {searchInput}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-3 pb-8">
            {isSearching ? loadingSkeleton : groupList}
          </div>
        </div>
      </div>
    );
  }

  // ── Desktop sidebar (right rail) ──────────────────────────────────────────

  return (
    <>
      <div
        className={`hidden lg:block absolute top-4 right-0 bottom-10 bg-card-bg shadow-2xl border border-border rounded-tl-xl rounded-bl-xl transition-all duration-300 ease-in-out z-20 ${
          isCollapsed ? "w-0" : "w-96"
        }`}
      >
        {!isCollapsed && (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <h2 className="text-xl font-bold text-text-primary">
                {isSearching
                  ? "Restaurants"
                  : searchQuery
                    ? `Matches in ${filteredGroups.length} stop${filteredGroups.length !== 1 ? "s" : ""}`
                    : `${totalStops} stop${totalStops !== 1 ? "s" : ""} · ${totalRestaurants} restaurant${totalRestaurants !== 1 ? "s" : ""}`}
              </h2>
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-2 hover:bg-app-bg rounded-lg transition-colors"
                aria-label="Collapse sidebar"
              >
                <svg
                  className="w-5 h-5 text-text-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            {/* Filters */}
            <div className="px-4 py-3 border-b border-border shrink-0">
              {searchInput}
            </div>

            {/* Stop groups */}
            <div className="relative flex-1 min-h-0">
              <div className="overflow-y-auto h-full p-4 pb-8 space-y-3">
                {isSearching ? loadingSkeleton : groupList}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Expand button when collapsed */}
      {isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          className="hidden sm:block absolute top-1/2 right-4 -translate-y-1/2 z-20 bg-card-bg shadow-lg border border-border p-3 rounded-full hover:bg-app-bg transition-colors"
          aria-label="Expand sidebar"
        >
          <svg
            className="w-6 h-6 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      )}
    </>
  );
}
