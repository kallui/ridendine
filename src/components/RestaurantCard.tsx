import { Restaurant } from "@/app/page";
import { RestaurantDetails } from "./RestaurantShared";

interface RestaurantCardProps {
  restaurant: Restaurant;
  onClick: (restaurant: Restaurant) => void;
}

export default function RestaurantCard({
  restaurant,
  onClick,
}: RestaurantCardProps) {
  return (
    <div
      onClick={() => onClick(restaurant)}
      className="bg-card-bg border border-border rounded-lg px-3 py-2.5 hover:border-text-muted hover:shadow-md transition-all cursor-pointer"
    >
      {/* Row 1: Name + Maps link */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-semibold text-sm text-text-primary line-clamp-1 leading-snug">
          {restaurant.name}
        </h3>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${restaurant.placeId}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 p-1 text-text-muted hover:text-text-primary transition-colors"
          aria-label="View on Google Maps"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {/* Row 2: rating · price · distance */}
      <RestaurantDetails restaurant={restaurant} variant="card" onClick={() => onClick(restaurant)} />
    </div>
  );
}
