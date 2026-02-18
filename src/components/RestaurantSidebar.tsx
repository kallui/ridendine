"use client";

import { Restaurant } from "@/app/page";
import RestaurantCard from "./RestaurantCard";
import { useState } from "react";

interface RestaurantSidebarProps {
  restaurants: Restaurant[];
  onRestaurantClick: (restaurant: Restaurant) => void;
}

export default function RestaurantSidebar({
  restaurants,
  onRestaurantClick,
}: RestaurantSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (restaurants.length === 0) return null;

  return (
    <>
      {/* Sidebar */}
      <div
        className={`absolute top-4 right-0 bottom-10 bg-card-bg shadow-2xl border border-gray-800 rounded-tl-xl rounded-bl-xl transition-all duration-300 ease-in-out z-20 ${
          isCollapsed ? "w-0" : "w-96"
        }`}
      >
        {!isCollapsed && (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-card-bg">
              <h2 className="text-xl font-bold text-text-primary">
                Restaurants ({restaurants.length})
              </h2>
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-2 hover:bg-app-bg rounded-lg transition-colors"
                aria-label="Collapse sidebar"
              >
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            {/* Restaurant List */}
            <div className="relative flex-1 min-h-0">
              <div className="overflow-y-auto h-full p-4 pb-8 space-y-3">
                {restaurants.map((restaurant) => (
                  <RestaurantCard
                    key={restaurant.placeId}
                    restaurant={restaurant}
                    onClick={onRestaurantClick}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Expand Button (when collapsed) */}
      {isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          className="absolute top-1/2 right-4 -translate-y-1/2 z-20 bg-card-bg shadow-lg border border-gray-800 p-3 rounded-full hover:bg-app-bg transition-colors"
          aria-label="Expand sidebar"
        >
          <svg
            className="w-6 h-6 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      )}
    </>
  );
}
