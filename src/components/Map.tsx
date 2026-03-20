"use client";

import {
  Map as GoogleMap,
  useMap,
  AdvancedMarker,
  Pin,
} from "@vis.gl/react-google-maps";
import { useEffect, useRef } from "react";
import { Restaurant, SearchCircle } from "@/app/page";
import RestaurantMarkerPopup from "./RestaurantMarkerPopup";

interface MapProps {
  centerCoordinate: { lat: number; lng: number };
  zoomLevel: number;
  mapId?: string;
  colorScheme?: "DARK" | "LIGHT";
  directionsResult?: google.maps.DirectionsResult | null;
  routes: google.maps.DirectionsRoute[];
  selectedRouteIndex: number | null;
  restaurants: Restaurant[];
  searchCircles: SearchCircle[];
  showBounds: boolean;
  selectedRestaurant: Restaurant | null;
  onSelectRestaurant: (restaurant: Restaurant | null) => void;
  onMapClick?: () => void; // called when the map background is tapped (not a marker)
}

export default function Map({
  centerCoordinate,
  zoomLevel,
  mapId,
  colorScheme,
  directionsResult,
  routes,
  selectedRouteIndex,
  restaurants,
  searchCircles,
  showBounds,
  selectedRestaurant,
  onSelectRestaurant,
  onMapClick,
}: MapProps) {
  const map = useMap();
  const directionsRenderersRef = useRef<google.maps.DirectionsRenderer[]>([]);
  const circlesRef = useRef<google.maps.Circle[]>([]);

  // Pan + zoom to restaurant when selected from sidebar
  useEffect(() => {
    if (!map || !selectedRestaurant) return;
    map.panTo(selectedRestaurant.location);
    map.setZoom(17);
  }, [map, selectedRestaurant]);

  // Handle route directions rendering (show all routes, highlight selected)
  useEffect(() => {
    if (!map || !directionsResult) return;

    // Clear existing renderers
    directionsRenderersRef.current.forEach((renderer) => renderer.setMap(null));
    directionsRenderersRef.current = [];

    // Render all routes
    routes.forEach((route, index) => {
      const isSelected = selectedRouteIndex === index;

      // Create a temporary DirectionsResult with just this route
      const singleRouteResult: google.maps.DirectionsResult = {
        ...directionsResult,
        routes: [route],
      };

      const renderer = new google.maps.DirectionsRenderer({
        suppressMarkers: isSelected, // Hide markers for non-selected routes
        suppressInfoWindows: true,
        polylineOptions: {
          strokeColor: isSelected ? "#6366F1" : "#6B7280", // Primary indigo vs gray
          strokeWeight: isSelected ? 5 : 3,
          strokeOpacity: isSelected ? 0.8 : 0.4,
        },
      });

      renderer.setMap(map);
      renderer.setDirections(singleRouteResult);
      directionsRenderersRef.current.push(renderer);
    });

    return () => {
      directionsRenderersRef.current.forEach((renderer) =>
        renderer.setMap(null),
      );
      directionsRenderersRef.current = [];
    };
  }, [map, directionsResult, routes, selectedRouteIndex]);

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
            strokeColor: "#818CF8", // Indigo for search circles
            strokeOpacity: 0.6,
            strokeWeight: 2,
            fillColor: "#6366F1",
            fillOpacity: 0.1,
            map: map,
          }),
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
      mapId={mapId}
      colorScheme={colorScheme}
      onClick={onMapClick}
    >
      {/* Restaurant Markers */}
      {restaurants.map((restaurant) => (
        <AdvancedMarker
          key={restaurant.placeId}
          position={restaurant.location}
          onClick={() => onSelectRestaurant(restaurant)}
        >
          <Pin
            background={"#EF4444"}
            borderColor={"#991B1B"}
            glyphColor={"#FEE2E2"}
          />
        </AdvancedMarker>
      ))}

      {/* Custom Info Window for Selected Restaurant */}
      {selectedRestaurant && (
        <RestaurantMarkerPopup
          restaurant={selectedRestaurant}
          onClose={() => onSelectRestaurant(null)}
        />
      )}
    </GoogleMap>
  );
}
