import { Restaurant } from "@/app/page";

type RestaurantListProps = {
  restaurants: Restaurant[];
  isOpen: boolean;
  onClose: () => void;
};

export default function RestaurantList({
  restaurants,
  isOpen,
  onClose,
}: RestaurantListProps) {
  return (
    <div
      className={`fixed top-0 right-0 h-screen w-96 bg-white shadow-xl transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          {restaurants.length} Restaurants
        </h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-2xl"
        >
          ✕
        </button>
      </div>

      {/* Search Box - TODO: Add search functionality */}
      <div className="p-4 border-b">
        <input
          type="text"
          placeholder="Search by name..."
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>

      {/* Distance Filter - TODO: Add filter functionality */}
      <div className="p-4 border-b">
        <p className="text-sm text-gray-600 mb-2">Distance from route:</p>
        {/* Add filter buttons/dropdown here */}
      </div>

      {/* Restaurant List - TODO: Map through restaurants */}
      <div className="overflow-y-auto h-full pb-32">
        <div className="p-4">
          {restaurants.length === 0 ? (
            <p className="text-gray-500">No restaurants found.</p>
          ) : (
            restaurants.map((restaurant) => (
              <div
                key={restaurant.placeId}
                className="mb-4 p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <h3 className="text-lg font-bold text-gray-900">
                  {restaurant.name}
                </h3>
                <p className="text-sm text-gray-800 mt-1">
                  {restaurant.distanceFromRoute}m from route
                </p>
                <a
                  href={`https://www.google.com/maps/place/?q=place_id:${restaurant.placeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 hover:underline text-sm mt-2 inline-block"
                >
                  View on Google Maps →
                </a>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
