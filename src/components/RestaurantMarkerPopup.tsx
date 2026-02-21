"use client";

import { AdvancedMarker } from "@vis.gl/react-google-maps";
import { Restaurant } from "@/app/page";
import { RestaurantDetails } from "./RestaurantShared";

interface RestaurantMarkerPopupProps {
  restaurant: Restaurant;
  onClose: () => void;
}

export default function RestaurantMarkerPopup({
  restaurant,
  onClose,
}: RestaurantMarkerPopupProps) {
  return (
    <AdvancedMarker position={restaurant.location} zIndex={1000}>
      <div className="relative -translate-y-2">
        {/* Pointer/tail */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full">
          <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-card-bg"></div>
        </div>

        {/* Card */}
        <div className="bg-card-bg rounded-lg shadow-2xl border-2 border-border p-4 min-w-[280px] max-w-[320px]">
          {/* Close button */}
          <div className="absolute top-2 right-2">
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-app-bg rounded-full transition-colors"
              aria-label="Close"
            >
              <svg
                className="w-5 h-5 text-gray-400 hover:text-gray-200"
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

          {/* Restaurant Name */}
          <h3 className="font-bold text-base text-text-primary mb-2 leading-tight pr-6">
            {restaurant.name}
          </h3>

          {/* Shared restaurant details component */}
          <RestaurantDetails restaurant={restaurant} variant="infowindow" />
        </div>
      </div>
    </AdvancedMarker>
  );
}
