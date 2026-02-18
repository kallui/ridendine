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
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${restaurant.placeId}`;

  return (
    <a
      href={googleMapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onClick(restaurant)}
      className="block bg-card-bg border-2 border-border rounded-lg p-4 hover:shadow-lg hover:shadow-primary/20 hover:border-primary transition-all cursor-pointer no-underline"
    >
      {/* Restaurant Name */}
      <h3 className="font-bold text-lg text-text-primary mb-2 line-clamp-1">
        {restaurant.name}
      </h3>

      {/* Shared restaurant details component */}
      <RestaurantDetails
        restaurant={restaurant}
        variant="card"
        onClick={() => onClick(restaurant)}
      />
    </a>
  );
}
