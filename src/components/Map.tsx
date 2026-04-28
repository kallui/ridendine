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
        preserveViewport: true,
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

  // Fit map to the current route context whenever routes change.
  useEffect(() => {
    if (!map || routes.length === 0 || selectedRestaurant) return;

    const routesToFit =
      selectedRouteIndex !== null && routes[selectedRouteIndex]
        ? [routes[selectedRouteIndex]]
        : routes;

    const bounds = new google.maps.LatLngBounds();
    let hasPoints = false;

    routesToFit.forEach((route) => {
      if (route.overview_path && route.overview_path.length > 0) {
        route.overview_path.forEach((point) => {
          bounds.extend(point);
          hasPoints = true;
        });
        return;
      }

      route.legs.forEach((leg) => {
        leg.steps.forEach((step) => {
          if (!step.path || step.path.length === 0) return;
          step.path.forEach((point) => {
            bounds.extend(point);
            hasPoints = true;
          });
        });
      });
    });

    if (!hasPoints) return;

    const isDesktop =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches;

    // Keep route comfortably visible around overlays. For an explicitly selected
    // route, use tighter padding so the map feels more zoomed in.
    const fitPadding: google.maps.Padding =
      selectedRouteIndex !== null
        ? isDesktop
          ? { top: 112, right: 220, bottom: 112, left: 220 }
          : { top: 90, right: 75, bottom: 220, left: 75 }
        : isDesktop
          ? { top: 112, right: 220, bottom: 112, left: 220 }
          : { top: 88, right: 72, bottom: 220, left: 72 };

    map.fitBounds(bounds, fitPadding);
  }, [map, routes, selectedRouteIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle search circles visualization
  useEffect(() => {
    if (!map) return;

    // Remove existing circles
    circlesRef.current.forEach((circle) => circle.setMap(null));
    circlesRef.current = [];

    // Draw new circles if searchCircles exist and showBounds is true
    if (showBounds && searchCircles.length > 0) {
      circlesRef.current = searchCircles.map((searchCircle) => {
        const circle = new google.maps.Circle({
          center: searchCircle.center,
          radius: searchCircle.radius,
          strokeColor: "#818CF8", // Indigo for search circles
          strokeOpacity: 0.6,
          strokeWeight: 2,
          fillColor: "#6366F1",
          fillOpacity: 0.1,
          map: map,
        });
        if (onMapClick) circle.addListener("click", onMapClick);
        return circle;
      });
    }

    // Cleanup
    return () => {
      circlesRef.current.forEach((circle) => circle.setMap(null));
      circlesRef.current = [];
    };
  }, [map, searchCircles, showBounds, onMapClick]);

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
