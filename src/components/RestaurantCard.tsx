import { Restaurant } from "@/app/page";
import { PHOTO_WIDTH } from "@/lib/place-photo";
import { MapsLinks, RestaurantDetails, MapPinIcon } from "./RestaurantShared";
import RestaurantPhoto from "./RestaurantPhoto";
import type { MouseEvent } from "react";

interface RestaurantCardProps {
  restaurant: Restaurant;
  onClick: (restaurant: Restaurant) => void;
  onPhotoClick?: (restaurant: Restaurant) => void;
  onHover?: (restaurant: Restaurant | null) => void;
}

function clickIsTextSelection(event: MouseEvent): boolean {
  if (window.getSelection()?.toString()) return true;
  const target = event.target;
  return target instanceof HTMLElement && Boolean(target.closest("a"));
}

export default function RestaurantCard({
  restaurant,
  onClick,
  onPhotoClick,
  onHover,
}: RestaurantCardProps) {
  return (
    <div
      onClick={(event) => {
        if (clickIsTextSelection(event)) return;
        onClick(restaurant);
      }}
      onMouseEnter={() => onHover?.(restaurant)}
      onMouseLeave={() => onHover?.(null)}
      className="relative flex w-full cursor-pointer items-start gap-3 rounded-lg border border-border bg-card-bg px-2.5 py-2 text-left select-text transition-all hover:border-text-muted hover:shadow-md"
    >
      <span
        aria-hidden
        className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-restaurant"
      />
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          if (onPhotoClick) onPhotoClick(restaurant);
          else onClick(restaurant);
        }}
        className="group shrink-0 rounded-md"
        aria-label={`View photos of ${restaurant.name}`}
      >
        <RestaurantPhoto
          photoReference={restaurant.photoReference}
          alt=""
          width={PHOTO_WIDTH.thumb}
          className="h-16 w-16 rounded-md"
          clickable
        />
      </button>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-sm font-semibold leading-snug text-text-primary">
            {restaurant.name}
          </h3>
          <MapsLinks
            restaurant={restaurant}
            variant="card"
            onLinkClick={(e) => e.stopPropagation()}
          />
        </div>

        <RestaurantDetails
          restaurant={restaurant}
          variant="card"
          showAddress={false}
        />

        {restaurant.vicinity && (
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-text-muted">
            <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-1">{restaurant.vicinity}</span>
          </p>
        )}
      </div>
    </div>
  );
}
