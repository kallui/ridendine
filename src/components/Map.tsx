"use client";

import {
  Map as GoogleMap,
  useMap,
  AdvancedMarker,
  Pin,
} from "@vis.gl/react-google-maps";
import { useEffect, useRef } from "react";
import { Restaurant, SearchCircle } from "@/app/page";
import { getRouteBoundsPoints, buildRoutePath, getRouteEndpoints } from "@/lib/directions-paths";
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
  onMapClick?: () => void;
}

export default function Map({
  centerCoordinate,
  zoomLevel,
  mapId,
  colorScheme,
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
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const circlesRef = useRef<google.maps.Circle[]>([]);

  useEffect(() => {
    if (!map || !selectedRestaurant) return;
    map.panTo(selectedRestaurant.location);
    map.setZoom(17);
  }, [map, selectedRestaurant]);

  // Draw route polylines directly (REST directions JSON does not render via DirectionsRenderer).
  useEffect(() => {
    if (!map) return;

    polylinesRef.current.forEach((polyline) => polyline.setMap(null));
    polylinesRef.current = [];

    routes.forEach((route, index) => {
      const path = buildRoutePath(route);
      if (path.length === 0) return;

      const isSelected = selectedRouteIndex === index;
      const polyline = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: isSelected ? "#FAFAFA" : "#52525B",
        strokeWeight: isSelected ? 6 : 4,
        strokeOpacity: isSelected ? 1 : 0.45,
        zIndex: isSelected ? 2 : 1,
        map,
      });
      polylinesRef.current.push(polyline);
    });

    return () => {
      polylinesRef.current.forEach((polyline) => polyline.setMap(null));
      polylinesRef.current = [];
    };
  }, [map, routes, selectedRouteIndex]);

  useEffect(() => {
    if (!map || routes.length === 0 || selectedRestaurant) return;

    const routesToFit =
      selectedRouteIndex !== null && routes[selectedRouteIndex]
        ? [routes[selectedRouteIndex]]
        : routes;

    const bounds = new google.maps.LatLngBounds();
    let hasPoints = false;

    routesToFit.forEach((route) => {
      getRouteBoundsPoints(route).forEach((point) => {
        bounds.extend(point);
        hasPoints = true;
      });
    });

    if (!hasPoints) return;

    const isDesktop =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches;

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

  useEffect(() => {
    if (!map) return;

    circlesRef.current.forEach((circle) => circle.setMap(null));
    circlesRef.current = [];

    if (showBounds && searchCircles.length > 0) {
      circlesRef.current = searchCircles.map((searchCircle) => {
        const circle = new google.maps.Circle({
          center: searchCircle.center,
          radius: searchCircle.radius,
          strokeColor: "#71717A",
          strokeOpacity: 0.5,
          strokeWeight: 2,
          fillColor: "#52525B",
          fillOpacity: 0.08,
          map: map,
        });
        if (onMapClick) circle.addListener("click", onMapClick);
        return circle;
      });
    }

    return () => {
      circlesRef.current.forEach((circle) => circle.setMap(null));
      circlesRef.current = [];
    };
  }, [map, searchCircles, showBounds, onMapClick]);

  const markerRoute =
    selectedRouteIndex !== null && routes[selectedRouteIndex]
      ? routes[selectedRouteIndex]
      : routes[0];
  const routeEndpoints = markerRoute ? getRouteEndpoints(markerRoute) : null;

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
      {routeEndpoints?.origin && (
        <AdvancedMarker position={routeEndpoints.origin} zIndex={3}>
          <div className="w-3.5 h-3.5 rounded-full border-[2.5px] border-text-secondary bg-white shadow-md" />
        </AdvancedMarker>
      )}

      {routeEndpoints?.destination && (
        <AdvancedMarker position={routeEndpoints.destination} zIndex={3}>
          <div className="w-4 h-4 rotate-45 rounded-sm bg-text-primary shadow-md ring-2 ring-white/80" />
        </AdvancedMarker>
      )}

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

      {selectedRestaurant && (
        <RestaurantMarkerPopup
          restaurant={selectedRestaurant}
          onClose={() => onSelectRestaurant(null)}
        />
      )}
    </GoogleMap>
  );
}
