import type { MouseEvent } from "react";
import { Restaurant } from "@/app/page";

// ── External maps links ──────────────────────────────────────────────────────

export function getRestaurantMapsUrls(restaurant: Restaurant) {
  const { lat, lng } = restaurant.location;
  const google = `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${restaurant.placeId}`;
  const params = new URLSearchParams({
    q: restaurant.name,
    ll: `${lat},${lng}`,
  });
  if (restaurant.vicinity) {
    params.set("address", restaurant.vicinity);
  }
  return { google, apple: `https://maps.apple.com/?${params.toString()}` };
}

function GoogleMapsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  );
}

function AppleMapsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

const externalLinkProps = {
  target: "_blank" as const,
  rel: "noopener noreferrer" as const,
};

export function MapsLinks({
  restaurant,
  variant,
  onLinkClick,
}: {
  restaurant: Restaurant;
  variant: "card" | "popup";
  onLinkClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const { google, apple } = getRestaurantMapsUrls(restaurant);

  if (variant === "card") {
    return (
      <div className="flex items-center shrink-0 -mr-1">
        <a
          href={google}
          {...externalLinkProps}
          onClick={onLinkClick}
          className="p-1 text-text-muted hover:text-text-primary transition-colors"
          aria-label="Open in Google Maps"
        >
          <GoogleMapsIcon className="w-3.5 h-3.5" />
        </a>
        <a
          href={apple}
          {...externalLinkProps}
          onClick={onLinkClick}
          className="p-1 text-text-muted hover:text-text-primary transition-colors"
          aria-label="Open in Apple Maps"
        >
          <AppleMapsIcon className="w-3.5 h-3.5" />
        </a>
      </div>
    );
  }

  const popupButtonClass =
    "inline-flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors min-w-0 bg-primary hover:bg-primary-hover text-primary-fg";

  return (
    <div className="flex gap-2">
      <a
        href={google}
        {...externalLinkProps}
        onClick={onLinkClick}
        className={popupButtonClass}
      >
        <GoogleMapsIcon className="w-4 h-4 shrink-0" />
        <span className="truncate">Google Maps</span>
      </a>
      <a
        href={apple}
        {...externalLinkProps}
        onClick={onLinkClick}
        className={popupButtonClass}
      >
        <AppleMapsIcon className="w-4 h-4 shrink-0" />
        <span className="truncate">Apple Maps</span>
      </a>
    </div>
  );
}

// ── Star rating ──────────────────────────────────────────────────────────────

export function renderStars(rating?: number, uid?: string) {
  if (!rating) return null;

  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  const gradientId = `half-star-${uid ?? rating}`;

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: fullStars }).map((_, i) => (
        <svg
          key={`full-${i}`}
          className="w-4 h-4 text-yellow-400 fill-current"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      {hasHalfStar && (
        <svg
          className="w-4 h-4 text-yellow-400"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <defs>
            <linearGradient id={gradientId}>
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="#D1D5DB" stopOpacity="1" />
            </linearGradient>
          </defs>
          <path
            fill={`url(#${gradientId})`}
            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
          />
        </svg>
      )}
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

export function formatReviewCount(count?: number) {
  if (!count) return null;
  return count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count.toString();
}

function RatingDisplay({
  rating,
  userRatingsTotal,
  placeId,
  size = "card",
}: {
  rating?: number;
  userRatingsTotal?: number;
  placeId: string;
  size?: "card" | "infowindow";
}) {
  const scoreClass =
    size === "card"
      ? "text-xs font-semibold text-text-primary"
      : "text-sm font-semibold text-text-primary";
  const countClass =
    size === "card" ? "text-xs text-text-muted" : "text-sm text-gray-500";

  if (rating == null) {
    return (
      <span className={size === "card" ? "text-xs text-text-muted" : "text-sm text-text-muted"}>
        N/A
      </span>
    );
  }

  return (
    <>
      <span className={scoreClass}>{rating.toFixed(1)}</span>
      {renderStars(rating, placeId)}
      {userRatingsTotal != null && userRatingsTotal > 0 && (
        <span className={countClass}>({formatReviewCount(userRatingsTotal)})</span>
      )}
    </>
  );
}

// ── Detour badge ─────────────────────────────────────────────────────────────

export function DetourBadge({ minutes }: { minutes: number }) {
  if (minutes === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        No detour
      </span>
    );
  }
  return (
    <span className="text-xs font-medium text-text-secondary">
      +{minutes} min detour
    </span>
  );
}

// ── Shared restaurant details ─────────────────────────────────────────────────

interface RestaurantDetailsProps {
  restaurant: Restaurant;
  variant?: "card" | "infowindow";
  onClick?: (restaurant: Restaurant) => void;
}

export function RestaurantDetails({
  restaurant,
  variant = "card",
}: RestaurantDetailsProps) {
  const isCard = variant === "card";

  if (isCard) {
    // Compact single-row: 4.7 ★★★★☆ (371) · +2 min detour
    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <RatingDisplay
            rating={restaurant.rating}
            userRatingsTotal={restaurant.userRatingsTotal}
            placeId={restaurant.placeId}
            size="card"
          />
          <span className="text-text-muted text-xs">·</span>
          <DetourBadge minutes={restaurant.detourMinutes} />
        </div>
        {restaurant.vicinity && (
          <p className="text-xs text-text-muted line-clamp-1">
            {restaurant.vicinity}
          </p>
        )}
      </div>
    );
  }

  // infowindow variant — more spacious, shown in the map popup
  return (
    <>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <RatingDisplay
          rating={restaurant.rating}
          userRatingsTotal={restaurant.userRatingsTotal}
          placeId={restaurant.placeId}
          size="infowindow"
        />
      </div>

      {/* Detour */}
      <div className="flex items-center gap-2 mb-2">
        <svg
          className="w-4 h-4 text-gray-400 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <DetourBadge minutes={restaurant.detourMinutes} />
      </div>

      {/* Nearest stop — only when we have a real stop name */}
      {restaurant.nearestStopName && (
        <div className="flex items-center gap-2 mb-2">
          <svg
            className="w-4 h-4 text-text-muted flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
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
          <p className="text-sm text-text-secondary">
            Near{" "}
            <span className="font-medium text-text-primary">
              {restaurant.nearestStopName}
            </span>
            {restaurant.transitLineName && (
              <span className="ml-1 text-xs text-text-muted">
                ({restaurant.transitLineName})
              </span>
            )}
          </p>
        </div>
      )}

      {/* Address */}
      {restaurant.vicinity && (
        <p className="text-xs text-gray-400 mb-3 line-clamp-2">
          {restaurant.vicinity}
        </p>
      )}

      <MapsLinks restaurant={restaurant} variant="popup" />
    </>
  );
}
