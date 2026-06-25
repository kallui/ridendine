"use client";

import { Restaurant, StopGroup } from "@/app/page";
import RestaurantCard from "./RestaurantCard";

/** Score for picking the "top pick" — balances rating with review volume. */
function recommendScore(r: Restaurant): number {
  return (r.rating ?? 0) * Math.log((r.userRatingsTotal ?? 0) + 1);
}

function getTopRestaurant(restaurants: Restaurant[]): Restaurant | null {
  if (!restaurants.length) return null;
  return restaurants.reduce((best, r) =>
    recommendScore(r) > recommendScore(best) ? r : best,
  );
}

interface StopGroupCardProps {
  group: StopGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onRestaurantClick: (restaurant: Restaurant) => void;
}

export default function StopGroupCard({
  group,
  isExpanded,
  onToggle,
  onRestaurantClick,
}: StopGroupCardProps) {
  const topRestaurant = getTopRestaurant(group.restaurants);

  return (
    <div
      className={`rounded-xl border transition-colors ${
        group.isTransfer
          ? "border-amber-500/40 bg-amber-500/5"
          : "border-border bg-card-bg"
      }`}
    >
      {/* ── Stop header (always visible, click to expand/collapse) ── */}
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 px-4 py-3 text-left"
        aria-expanded={isExpanded}
      >
        {/* Stop dot */}
        <div
          className={`mt-1 shrink-0 w-2.5 h-2.5 rounded-full border-2 ${
            group.isTransfer
              ? "border-amber-500 bg-amber-500/30"
              : "border-primary bg-primary/20"
          }`}
        />

        <div className="flex-1 min-w-0">
          {/* Name row + badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-text-primary leading-snug">
              {group.stopName}
            </span>

            {group.isTransfer && (
              <span className="shrink-0 inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
                ↔ Transfer
              </span>
            )}

            {group.transitLineName && (
              <span className="shrink-0 text-xs font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                {group.transitLineName}
              </span>
            )}
          </div>

          {/* Restaurant count */}
          <p className="text-xs text-text-muted mt-0.5">
            {group.restaurants.length}{" "}
            {group.restaurants.length === 1 ? "restaurant" : "restaurants"} nearby
          </p>

          {/* Top pick preview — only when collapsed */}
          {!isExpanded && topRestaurant && (
            <p className="text-xs text-text-secondary mt-1 truncate">
              <span className="text-text-muted">Top pick: </span>
              {topRestaurant.name}
              {topRestaurant.detourMinutes === 0 ? (
                <span className="text-green-500 ml-1">· No detour</span>
              ) : (
                <span className="text-text-muted ml-1">
                  · +{topRestaurant.detourMinutes} min
                </span>
              )}
            </p>
          )}
        </div>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 shrink-0 mt-0.5 text-text-muted transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* ── Expanded restaurant list ── */}
      {isExpanded && (
        <div className="border-t border-border/50 px-3 pb-3 pt-2 space-y-2">
          {group.restaurants.map((restaurant) => (
            <RestaurantCard
              key={restaurant.placeId}
              restaurant={restaurant}
              onClick={onRestaurantClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
