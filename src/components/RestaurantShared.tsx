import { Restaurant } from "@/app/page";

// Helper function to render star rating
export function renderStars(rating?: number) {
  if (!rating) return null;

  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-0.5">
      {/* Full stars */}
      {Array.from({ length: fullStars }).map((_, i) => (
        <svg
          key={`full-${i}`}
          className="w-4 h-4 text-yellow-400 fill-current"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      {/* Half star */}
      {hasHalfStar && (
        <svg
          className="w-4 h-4 text-yellow-400"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <defs>
            <linearGradient id="half-star">
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="#D1D5DB" stopOpacity="1" />
            </linearGradient>
          </defs>
          <path
            fill="url(#half-star)"
            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
          />
        </svg>
      )}
      {/* Empty stars */}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <svg
          key={`empty-${i}`}
          className="w-4 h-4 text-gray-300 fill-current"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

// Helper function to format review count
export function formatReviewCount(count?: number) {
  if (!count) return null;
  return count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count.toString();
}

// Helper function to render price level
export function renderPriceLevel(priceLevel?: number) {
  if (priceLevel === undefined || priceLevel === null) return null;

  const dollarSigns = "$".repeat(priceLevel || 1);
  const grayDollars = "$".repeat(4 - (priceLevel || 1));

  return (
    <div className="flex items-center">
      <span className="text-green-600 font-semibold text-sm">
        {dollarSigns}
      </span>
      <span className="text-gray-300 text-sm">{grayDollars}</span>
    </div>
  );
}

// Shared restaurant details component
interface RestaurantDetailsProps {
  restaurant: Restaurant;
  variant?: "card" | "infowindow";
  onClick?: (restaurant: Restaurant) => void;
}

export function RestaurantDetails({
  restaurant,
  variant = "card",
  onClick,
}: RestaurantDetailsProps) {
  const isCard = variant === "card";

  return (
    <>
      {/* Rating and Price Level */}
      {(restaurant.rating || restaurant.priceLevel !== undefined) && (
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <div className="flex items-center gap-2">
            {restaurant.rating && (
              <span className="text-sm font-semibold text-text-primary">
                {restaurant.rating.toFixed(1)}
              </span>
            )}
            {renderStars(restaurant.rating)}
            {restaurant.userRatingsTotal && (
              <span className="text-sm text-gray-500">
                ({formatReviewCount(restaurant.userRatingsTotal)})
              </span>
            )}
          </div>
          {renderPriceLevel(restaurant.priceLevel)}
        </div>
      )}

      {/* Distance from Route */}
      <div className="flex items-center gap-2 mb-2">
        <svg
          className="w-4 h-4 text-gray-400 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <p className="text-sm text-gray-300">
          <span className="font-medium">{restaurant.distanceFromRoute}m</span>{" "}
          from route
        </p>
      </div>

      {/* Address (if available) */}
      {restaurant.vicinity && (
        <p
          className={`text-xs text-gray-400 mb-3 ${isCard ? "line-clamp-1" : "line-clamp-2"}`}
        >
          {restaurant.vicinity}
        </p>
      )}

      {/* Google Maps Link */}
      {isCard ? (
        <span className="inline-flex items-center gap-1 text-sm text-primary font-medium">
          <span>View on Google Maps</span>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </span>
      ) : (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${restaurant.placeId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg transition-colors w-full justify-center shadow-sm"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
          View on Google Maps
        </a>
      )}
    </>
  );
}
