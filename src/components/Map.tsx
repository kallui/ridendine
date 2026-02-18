"use client";

import {
  Map as GoogleMap,
  useMap,
  AdvancedMarker,
  Pin,
} from "@vis.gl/react-google-maps";
import { useEffect, useRef, useState } from "react";
import { Restaurant, SearchCircle } from "@/app/page";
import RestaurantMarkerPopup from "./RestaurantMarkerPopup";

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
    null,
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
      mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}
      colorScheme="DARK"
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

      {/* Custom Info Window for Selected Restaurant */}
      {selectedRestaurant && (
        <RestaurantMarkerPopup
          restaurant={selectedRestaurant}
          onClose={() => setSelectedRestaurant(null)}
        />
      )}
    </GoogleMap>
  );
}
