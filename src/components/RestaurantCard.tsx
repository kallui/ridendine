import { Restaurant } from "@/app/page";
import { MapsLinks, RestaurantDetails } from "./RestaurantShared";

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
        <MapsLinks
          restaurant={restaurant}
          variant="card"
          onLinkClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Row 2: rating · price · distance */}
      <RestaurantDetails restaurant={restaurant} variant="card" onClick={() => onClick(restaurant)} />
    </div>
  );
}
