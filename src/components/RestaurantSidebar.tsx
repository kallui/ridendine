"use client";

import { Restaurant, StopGroup, StopResolution } from "@/app/page";
import StopGroupCard from "./StopGroupCard";
import RestaurantCard from "./RestaurantCard";
import { useState, useMemo } from "react";

interface RestaurantSidebarProps {
  restaurants: Restaurant[];
  stopGroups: StopGroup[];
  stopResolution?: StopResolution;
  selectedStopIndex?: number | null;
  onStopClick?: (stopIndex: number) => void;
  onRestaurantClick: (restaurant: Restaurant) => void;
  variant?: "desktop" | "sheet";
  onBack?: () => void;
  isSearching?: boolean;
  routeHeadline?: string;
}

const SAMPLED_DISCLAIMER =
  "No exact stop data — searched every 500 m along your route.";

export default function RestaurantSidebar({
  restaurants,
  stopGroups,
  stopResolution = "gtfs",
  selectedStopIndex,
  onRestaurantClick,
  variant = "desktop",
  onBack,
  isSearching = false,
  routeHeadline,
}: RestaurantSidebarProps) {
  const isSampled = stopResolution === "sampled";
  const [isCollapsed, setIsCollapsed] = useState(false);
  const panelCollapsed = isCollapsed && !isSearching;
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedStops, setExpandedStops] = useState<Set<number>>(new Set());
  const [collapsedSelectedStops, setCollapsedSelectedStops] = useState<
    Set<number>
  >(new Set());
  const [prevSelectedStopIndex, setPrevSelectedStopIndex] = useState(
    selectedStopIndex,
  );

  if (selectedStopIndex !== prevSelectedStopIndex) {
    setPrevSelectedStopIndex(selectedStopIndex);
    if (selectedStopIndex !== null && selectedStopIndex !== undefined) {
      setCollapsedSelectedStops((prev) => {
        if (!prev.has(selectedStopIndex)) return prev;
        const next = new Set(prev);
        next.delete(selectedStopIndex);
        return next;
      });
    }
  }

  const isStopExpanded = (stopIndex: number) => {
    if (collapsedSelectedStops.has(stopIndex)) return false;
    if (stopIndex === selectedStopIndex) return true;
    return expandedStops.has(stopIndex);
  };

  const toggleStop = (stopIndex: number) => {
    if (isStopExpanded(stopIndex)) {
      if (stopIndex === selectedStopIndex) {
        setCollapsedSelectedStops((prev) => new Set(prev).add(stopIndex));
      } else {
        setExpandedStops((prev) => {
          const next = new Set(prev);
          next.delete(stopIndex);
          return next;
        });
      }
      return;
    }

    setCollapsedSelectedStops((prev) => {
      if (!prev.has(stopIndex)) return prev;
      const next = new Set(prev);
      next.delete(stopIndex);
      return next;
    });
    if (stopIndex !== selectedStopIndex) {
      setExpandedStops((prev) => new Set(prev).add(stopIndex));
    }
  };

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

  const filteredRestaurants = useMemo(() => {
    const sorted = [...restaurants].sort(
      (a, b) =>
        a.nearestStopIndex - b.nearestStopIndex ||
        a.detourMinutes - b.detourMinutes,
    );
    if (!searchQuery) return sorted;
    const q = searchQuery.toLowerCase();
    return sorted.filter((r) => r.name.toLowerCase().includes(q));
  }, [restaurants, searchQuery]);

  const totalRestaurants = restaurants.length;
  const totalStops = stopGroups.length;
  const isEmpty =
    (isSampled ? restaurants.length === 0 : stopGroups.length === 0) &&
    !isSearching;

  if (isEmpty) return null;

  const sampledDisclaimer = isSampled ? (
    <p className="text-xs text-text-muted leading-snug mt-1.5">
      {SAMPLED_DISCLAIMER}
    </p>
  ) : null;

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
        isExpanded={isStopExpanded(group.stopIndex)}
        onToggle={() => toggleStop(group.stopIndex)}
        onRestaurantClick={onRestaurantClick}
      />
    ))
  );

  const flatList = filteredRestaurants.length === 0 ? (
    <p className="text-text-muted text-sm text-center pt-8">
      No restaurants match your search.
    </p>
  ) : (
    filteredRestaurants.map((restaurant) => (
      <RestaurantCard
        key={restaurant.placeId}
        restaurant={restaurant}
        onClick={onRestaurantClick}
      />
    ))
  );

  const restaurantList = isSampled ? flatList : groupList;

  const desktopTitle = isSearching
    ? "Searching for restaurants…"
    : isSampled
      ? searchQuery
        ? `${filteredRestaurants.length} match${filteredRestaurants.length !== 1 ? "es" : ""}`
        : `${totalRestaurants} restaurant${totalRestaurants !== 1 ? "s" : ""} along route`
      : searchQuery
        ? `Matches in ${filteredGroups.length} stop${filteredGroups.length !== 1 ? "s" : ""}`
        : `${totalStops} stop${totalStops !== 1 ? "s" : ""} · ${totalRestaurants} restaurant${totalRestaurants !== 1 ? "s" : ""}`;

  const loadingSkeleton = isSampled ? (
    <>
      <p className="text-text-muted text-xs text-center pt-2 pb-1 flex items-center justify-center gap-2">
        <span className="inline-block w-3 h-3 rounded-full border-2 border-text-muted border-t-transparent animate-spin" />
        Searching for restaurants…
      </p>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-card-bg px-3 py-2.5 space-y-2 animate-pulse"
        >
          <div className="h-3.5 w-3/5 rounded bg-border" />
          <div className="h-2.5 w-2/5 rounded bg-border opacity-60" />
        </div>
      ))}
    </>
  ) : (
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
          {sampledDisclaimer}
          {!isSearching && searchInput}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-3 pb-8">
            {isSearching ? loadingSkeleton : restaurantList}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`hidden lg:block absolute top-20 right-0 z-20 h-[calc(100vh-6rem)] bg-card-bg shadow-2xl border border-border rounded-tl-xl rounded-bl-xl transition-all duration-300 ease-in-out ${
          panelCollapsed ? "w-0" : "w-96"
        }`}
      >
        {!panelCollapsed && (
          <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b border-border shrink-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-text-primary leading-snug">
                    {desktopTitle}
                  </h2>
                  {sampledDisclaimer}
                </div>
                <button
                  onClick={() => setIsCollapsed(true)}
                  className="shrink-0 p-2 hover:bg-app-bg rounded-lg transition-colors -mr-1 -mt-0.5"
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
            </div>

            <div className="px-4 py-3 border-b border-border shrink-0">
              {!isSearching && searchInput}
            </div>

            <div className="relative flex-1 min-h-0">
              <div className="overflow-y-auto h-full p-4 pb-8 space-y-3">
                {isSearching ? loadingSkeleton : restaurantList}
              </div>
            </div>
          </div>
        )}
      </div>

      {panelCollapsed && (
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
