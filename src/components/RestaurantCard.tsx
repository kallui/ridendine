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
      className="bg-card-bg border-2 border-border rounded-lg p-4 hover:shadow-lg hover:shadow-primary/20 hover:border-primary transition-all cursor-pointer"
    >
      {/* Restaurant Name */}
      <h3 className="font-bold text-lg text-text-primary line-clamp-1 mb-2">
        {restaurant.name}
      </h3>

      {/* Shared restaurant details component */}
      <RestaurantDetails
        restaurant={restaurant}
        variant="card"
        onClick={() => onClick(restaurant)}
      />
    </div>
  );
}
