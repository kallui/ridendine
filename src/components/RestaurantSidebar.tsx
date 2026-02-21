"use client";

import { Restaurant } from "@/app/page";
import RestaurantCard from "./RestaurantCard";
import { useState, useMemo } from "react";

type SortBy = "distance" | "rating";

const RATING_OPTIONS = [
  { label: "All", value: 0 },
  { label: "3.5+", value: 3.5 },
  { label: "4.0+", value: 4.0 },
  { label: "4.5+", value: 4.5 },
];

interface RestaurantSidebarProps {
  restaurants: Restaurant[];
  onRestaurantClick: (restaurant: Restaurant) => void;
}

export default function RestaurantSidebar({
  restaurants,
  onRestaurantClick,
}: RestaurantSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState<SortBy>("distance");

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
        return a.distanceFromRoute - b.distanceFromRoute;
      });
  }, [restaurants, searchQuery, minRating, sortBy]);

  const isFiltered = searchQuery || minRating > 0;

  if (restaurants.length === 0) return null;

  return (
    <>
      {/* Sidebar */}
      <div
        className={`absolute top-4 right-0 bottom-10 bg-card-bg shadow-2xl border border-gray-800 rounded-tl-xl rounded-bl-xl transition-all duration-300 ease-in-out z-20 ${
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
                {/* Rating chips */}
                <div className="flex gap-1">
                  {RATING_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMinRating(opt.value)}
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

                {/* Sort toggle */}
                <div className="flex rounded overflow-hidden border border-gray-700">
                  <button
                    type="button"
                    onClick={() => setSortBy("distance")}
                    className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                      sortBy === "distance"
                        ? "bg-primary text-white"
                        : "bg-app-bg text-text-muted hover:text-text-secondary"
                    }`}
                  >
                    Nearest
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortBy("rating")}
                    className={`px-2.5 py-1 text-xs font-medium transition-colors border-l border-gray-700 ${
                      sortBy === "rating"
                        ? "bg-primary text-white"
                        : "bg-app-bg text-text-muted hover:text-text-secondary"
                    }`}
                  >
                    Top rated
                  </button>
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

      {/* Expand Button (when collapsed) */}
      {isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          className="absolute top-1/2 right-4 -translate-y-1/2 z-20 bg-card-bg shadow-lg border border-gray-800 p-3 rounded-full hover:bg-app-bg transition-colors"
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
