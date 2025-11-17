"use client";

import {
  Map as GoogleMap,
  useMap,
  AdvancedMarker,
  Pin,
  InfoWindow,
} from "@vis.gl/react-google-maps";
import { useEffect, useRef, useState } from "react";
import { Restaurant, SearchCircle } from "@/app/page";

interface MapProps {
  centerCoordinate: { lat: number; lng: number };
  zoomLevel: number;
  route?: google.maps.DirectionsResult | null;
  restaurants: Restaurant[];
  searchCircles: SearchCircle[];
  showBounds: boolean;
}

export default function Map({
  centerCoordinate,
  zoomLevel,
  route,
  restaurants,
  searchCircles,
  showBounds,
}: MapProps) {
  const map = useMap();
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(
    null
  );
  const circlesRef = useRef<google.maps.Circle[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);

  // Handle route directions rendering
  useEffect(() => {
    console.log("Map useEffect triggered:", {
      hasMap: !!map,
      hasRoute: !!route,
    });

    if (!map) return;

    if (!directionsRendererRef.current) {
      console.log("Creating DirectionsRenderer");
      directionsRendererRef.current = new google.maps.DirectionsRenderer();
      directionsRendererRef.current.setMap(map);
    }

    if (route && directionsRendererRef.current) {
      console.log("Setting directions on map");
      directionsRendererRef.current.setDirections(route);
    }
  }, [map, route]);

  // Handle search circles visualization
  useEffect(() => {
    if (!map) return;

    // Remove existing circles
    circlesRef.current.forEach((circle) => circle.setMap(null));
    circlesRef.current = [];

    // Draw new circles if searchCircles exist and showBounds is true
    if (showBounds && searchCircles.length > 0) {
      circlesRef.current = searchCircles.map(
        (searchCircle) =>
          new google.maps.Circle({
            center: searchCircle.center,
            radius: searchCircle.radius,
            strokeColor: "#10B981", // Green for search circles
            strokeOpacity: 0.6,
            strokeWeight: 2,
            fillColor: "#10B981",
            fillOpacity: 0.1,
            map: map,
          })
      );
    }

    // Cleanup
    return () => {
      circlesRef.current.forEach((circle) => circle.setMap(null));
      circlesRef.current = [];
    };
  }, [map, searchCircles, showBounds]);

  return (
    <GoogleMap
      style={{ width: "100vw", height: "100vh" }}
      defaultCenter={centerCoordinate}
      defaultZoom={zoomLevel}
      gestureHandling="greedy"
      disableDefaultUI
      mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}
    >
      {/* Restaurant Markers */}
      {restaurants.map((restaurant) => (
        <AdvancedMarker
          key={restaurant.placeId}
          position={restaurant.location}
          onClick={() => setSelectedRestaurant(restaurant)}
        >
          <Pin
            background={"#EF4444"}
            borderColor={"#991B1B"}
            glyphColor={"#FEE2E2"}
          />
        </AdvancedMarker>
      ))}

      {/* Info Window for Selected Restaurant */}
      {selectedRestaurant && (
        <InfoWindow
          position={selectedRestaurant.location}
          onCloseClick={() => setSelectedRestaurant(null)}
        >
          <div className="min-w-[200px] max-w-[280px]">
            <h3 className="font-bold text-lg text-gray-900 mb-2 leading-tight">
              {selectedRestaurant.name}
            </h3>
            <div className="flex items-center gap-2 mb-3">
              <svg
                className="w-4 h-4 text-gray-500"
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
              <p className="text-sm font-medium text-gray-700">
                {selectedRestaurant.distanceFromRoute}m from route
              </p>
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${selectedRestaurant.placeId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors w-full justify-center"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              View on Google Maps
            </a>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}
