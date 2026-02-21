"use client";

import { Restaurant } from "@/app/page";
import RestaurantCard from "./RestaurantCard";
import { useState, useMemo } from "react";

type SortBy = "best" | "distance" | "rating";

const MAX_DISTANCE = 750; // matches Turf.js filter distance

function bestMatchScore(r: Restaurant): number {
  const ratingScore = ((r.rating ?? 0) / 5) * 0.65;
  const proximityScore = (1 - r.distanceFromRoute / MAX_DISTANCE) * 0.35;
  return ratingScore + proximityScore;
}

const RATING_OPTIONS = [
  { label: "3.5+", value: 3.5 },
  { label: "4.5+", value: 4.5 },
];

interface RestaurantSidebarProps {
  restaurants: Restaurant[];
  onRestaurantClick: (restaurant: Restaurant) => void;
  variant?: "desktop" | "sheet";
  onBack?: () => void;
  // sheet variant only: shows selected route summary above filters
  routeHeadline?: string;
}

export default function RestaurantSidebar({
  restaurants,
  onRestaurantClick,
  variant = "desktop",
  onBack,
  routeHeadline,
}: RestaurantSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState<SortBy>("best");

  const filteredRestaurants = useMemo(() => {
    return restaurants
      .filter((r) => {
        if (
          searchQuery &&
          !r.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
          return false;
        if (minRating > 0 && (r.rating ?? 0) < minRating) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
        if (sortBy === "distance")
          return a.distanceFromRoute - b.distanceFromRoute;
        return bestMatchScore(b) - bestMatchScore(a); // "best" default
      });
  }, [restaurants, searchQuery, minRating, sortBy]);

  const isFiltered = searchQuery || minRating > 0;

  if (restaurants.length === 0) return null;

  // Sheet variant: content-only for inside BottomSheet.
  // Filters are sticky so they stay visible while the list scrolls.
  // No outer container — BottomSheet provides positioning and scroll.
  if (variant === "sheet") {
    return (
      <div>
        {/* sticky top-0 inside overflow-y-auto sticks to the scroll container, not the viewport */}
        <div className="sticky top-0 bg-card-bg px-4 py-3 border-b border-gray-800 space-y-2 z-10">
          {/* Back button + route summary — only shown in sheet variant */}
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
          <input
            type="text"
            placeholder="Search restaurants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-700 rounded-md bg-app-bg text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          />
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {RATING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setMinRating(minRating === opt.value ? 0 : opt.value)
                  }
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    minRating === opt.value
                      ? "bg-primary text-white"
                      : "bg-app-bg text-text-muted border border-gray-700 hover:border-primary/50 hover:text-text-secondary"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {(["distance", "rating"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSortBy(sortBy === opt ? "best" : opt)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    sortBy === opt
                      ? "bg-primary text-white"
                      : "bg-app-bg text-text-muted border border-gray-700 hover:border-primary/50 hover:text-text-secondary"
                  }`}
                >
                  {opt === "distance" ? "Nearest" : "Top rated"}
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* List — no inner scroll, BottomSheet's overflow-y-auto handles it */}
        <div className="p-4 space-y-3 pb-8">
          {filteredRestaurants.length === 0 ? (
            <p className="text-text-muted text-sm text-center pt-8">
              No restaurants match your filters.
            </p>
          ) : (
            filteredRestaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.placeId}
                restaurant={restaurant}
                onClick={onRestaurantClick}
              />
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Sidebar — hidden on mobile (BottomSheet handles mobile) */}
      <div
        className={`hidden sm:block absolute top-4 right-0 bottom-10 bg-card-bg shadow-2xl border border-gray-800 rounded-tl-xl rounded-bl-xl transition-all duration-300 ease-in-out z-20 ${
          isCollapsed ? "w-0" : "w-96"
        }`}
      >
        {!isCollapsed && (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800 shrink-0">
              <h2 className="text-xl font-bold text-text-primary">
                {isFiltered
                  ? `${filteredRestaurants.length} of ${restaurants.length}`
                  : restaurants.length}{" "}
                restaurants
              </h2>
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-2 hover:bg-app-bg rounded-lg transition-colors"
                aria-label="Collapse sidebar"
              >
                <svg
                  className="w-5 h-5 text-gray-600"
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
            <div className="px-4 py-3 border-b border-gray-800 space-y-2 shrink-0">
              {/* Search by name */}
              <input
                type="text"
                placeholder="Search restaurants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-700 rounded-md bg-app-bg text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />

              {/* Rating + Sort on one row */}
              <div className="flex items-center justify-between">
                {/* Rating toggles */}
                <div className="flex gap-1">
                  {RATING_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setMinRating(minRating === opt.value ? 0 : opt.value)
                      }
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        minRating === opt.value
                          ? "bg-primary text-white"
                          : "bg-app-bg text-text-muted border border-gray-700 hover:border-primary/50 hover:text-text-secondary"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Sort toggles */}
                <div className="flex gap-1">
                  {(["distance", "rating"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSortBy(sortBy === opt ? "best" : opt)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        sortBy === opt
                          ? "bg-primary text-white"
                          : "bg-app-bg text-text-muted border border-gray-700 hover:border-primary/50 hover:text-text-secondary"
                      }`}
                    >
                      {opt === "distance" ? "Nearest" : "Top rated"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Restaurant List */}
            <div className="relative flex-1 min-h-0">
              <div className="overflow-y-auto h-full p-4 pb-8 space-y-3">
                {filteredRestaurants.length === 0 ? (
                  <p className="text-text-muted text-sm text-center pt-8">
                    No restaurants match your filters.
                  </p>
                ) : (
                  filteredRestaurants.map((restaurant) => (
                    <RestaurantCard
                      key={restaurant.placeId}
                      restaurant={restaurant}
                      onClick={onRestaurantClick}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Expand Button (when collapsed) — hidden on mobile */}
      {isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          className="hidden sm:block absolute top-1/2 right-4 -translate-y-1/2 z-20 bg-card-bg shadow-lg border border-gray-800 p-3 rounded-full hover:bg-app-bg transition-colors"
          aria-label="Expand sidebar"
        >
          <svg
            className="w-6 h-6 text-gray-600"
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
