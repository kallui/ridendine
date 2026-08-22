"use client";

import { useState } from "react";
import { Restaurant, StopGroup } from "@/app/page";
import RestaurantCard from "./RestaurantCard";
import { formatTransitLineLabel } from "@/lib/alight-hint";

const VISIBLE_PER_STOP = 4;

interface StopGroupCardProps {
  group: StopGroup;
  isSelected: boolean;
  onSelect: () => void;
  onRestaurantClick: (restaurant: Restaurant) => void;
  onPhotoClick?: (restaurant: Restaurant) => void;
  onRestaurantHover?: (restaurant: Restaurant | null) => void;
}

export default function StopGroupCard({
  group,
  isSelected,
  onSelect,
  onRestaurantClick,
  onPhotoClick,
  onRestaurantHover,
}: StopGroupCardProps) {
  const [showAll, setShowAll] = useState(false);
  const hiddenCount = Math.max(0, group.restaurants.length - VISIBLE_PER_STOP);
  const visibleRestaurants = showAll
    ? group.restaurants
    : group.restaurants.slice(0, VISIBLE_PER_STOP);

  const headerTone = group.isTransfer
    ? "border-amber-500/25 bg-amber-500/10"
    : "border-border bg-accent-soft";

  return (
    <section
      data-stop-index={group.stopIndex}
      className={`border-b border-border bg-card-bg ${
        isSelected
          ? "border-l-[3px] border-l-primary"
          : group.isTransfer
            ? "border-l-[3px] border-l-amber-500"
            : "border-l-[3px] border-l-transparent"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className={`sticky top-0 z-10 flex w-full items-start gap-3 border-b px-4 py-3 text-left ${headerTone}`}
      >
        <div
          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full border-2 ${
            group.isTransfer
              ? "border-amber-500 bg-amber-500/30"
              : "border-primary bg-primary/20"
          }`}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold leading-snug text-text-primary">
              {group.stopName}
            </span>

            {group.isTransfer && (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-amber-500/20 px-1.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                ↔ Transfer
              </span>
            )}

            {group.transitLineName && (
              <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                {formatTransitLineLabel({
                  routeShortName: group.transitLineName,
                  headsign: group.transitHeadsign,
                  vehicleType: group.transitVehicleType,
                })}
              </span>
            )}
          </div>

          <p className="mt-0.5 text-xs text-text-muted">
            {group.restaurants.length}{" "}
            {group.restaurants.length === 1 ? "restaurant" : "restaurants"} nearby
          </p>
        </div>
      </button>

      <div className="space-y-2 px-3 py-2">
        {visibleRestaurants.map((restaurant) => (
          <RestaurantCard
            key={restaurant.placeId}
            restaurant={restaurant}
            onClick={onRestaurantClick}
            onPhotoClick={onPhotoClick}
            onHover={onRestaurantHover}
          />
        ))}

        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAll((open) => !open)}
            className="w-full py-1.5 text-center text-xs font-medium text-text-secondary hover:text-text-primary"
          >
            {showAll
              ? "Show fewer"
              : `${hiddenCount} more at this stop`}
          </button>
        )}
      </div>
    </section>
  );
}
