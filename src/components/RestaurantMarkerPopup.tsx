"use client";

import { AdvancedMarker } from "@vis.gl/react-google-maps";
import { Restaurant } from "@/app/page";
import { PHOTO_WIDTH } from "@/lib/place-photo";
import { RestaurantDetails } from "./RestaurantShared";
import RestaurantPhoto from "./RestaurantPhoto";
import { usePlacePhotos } from "@/hooks/usePlacePhotos";
import { useEffect, useRef } from "react";

interface RestaurantMarkerPopupProps {
  restaurant: Restaurant;
  onClose?: () => void;
  onOpenPhotos?: (restaurant: Restaurant) => void;
  /** Preview from list hover: no close control, ignores pointer events. */
  preview?: boolean;
}

export default function RestaurantMarkerPopup({
  restaurant,
  onClose,
  onOpenPhotos,
  preview = false,
}: RestaurantMarkerPopupProps) {
  const photos = usePlacePhotos(
    restaurant.placeId,
    restaurant.photoReference,
  );
  const photoCount = photos.length;
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = popupRef.current;
    if (!el || preview) return;
    google.maps.OverlayView.preventMapHitsAndGesturesFrom(el);
  }, [preview, restaurant.placeId]);

  return (
    <AdvancedMarker
      position={restaurant.location}
      zIndex={1000}
      onClick={(event) => event.stop()}
    >
      <div
        ref={popupRef}
        className={`restaurant-map-popup relative -translate-y-2 ${preview ? "pointer-events-none" : ""}`}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full">
          <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-card-bg"></div>
        </div>

        <div className="min-w-[280px] max-w-[320px] cursor-text rounded-lg border-2 border-border bg-card-bg p-3 shadow-2xl">
          {!preview && onClose && (
            <div className="absolute right-2 top-2 z-10">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-card-bg/80 p-1.5 hover:bg-app-bg transition-colors"
                aria-label="Close"
              >
                <svg
                  className="h-5 w-5 text-gray-400 hover:text-gray-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenPhotos?.(restaurant);
            }}
            className={`group relative mb-3 block w-full overflow-hidden rounded-md ${
              preview ? "pointer-events-none" : ""
            }`}
            aria-label={`View photos of ${restaurant.name}`}
          >
            <RestaurantPhoto
              photoReference={
                photos[0]?.photoReference ?? restaurant.photoReference
              }
              alt={restaurant.name}
              width={PHOTO_WIDTH.card}
              eager
              className="h-28 w-full"
              clickable
            />
            {photoCount > 1 && (
              <span className="absolute bottom-1.5 right-1.5 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white">
                {photoCount} photos
              </span>
            )}
          </button>

          <h3 className="mb-2 pr-6 text-base font-bold leading-tight text-text-primary">
            {restaurant.name}
          </h3>

          <RestaurantDetails restaurant={restaurant} variant="infowindow" />
        </div>
      </div>
    </AdvancedMarker>
  );
}
