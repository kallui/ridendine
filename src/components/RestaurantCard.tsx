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
      className="block bg-[#2a2a2a] border-2 border-gray-700 rounded-lg p-4 hover:shadow-lg hover:shadow-emerald-500/20 hover:border-emerald-500 transition-all cursor-pointer no-underline"
    >
      {/* Restaurant Name */}
      <h3 className="font-bold text-lg text-gray-100 mb-2 line-clamp-1">
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
