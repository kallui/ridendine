"use client";

import {
  Map as GoogleMap,
  useMap,
  AdvancedMarker,
  Pin,
} from "@vis.gl/react-google-maps";
import { useEffect, useRef, useMemo } from "react";
import { Restaurant, SearchCircle, StopGroup } from "@/app/page";
import {
  getRouteBoundsPoints,
  buildRoutePath,
  getRouteEndpoints,
  getRouteSegments,
} from "@/lib/directions-paths";
import RestaurantMarkerPopup from "./RestaurantMarkerPopup";

/** Single-letter badge shown on the map at each transit boarding point. */
function getTransitShortLabel(vehicleType?: string): string {
  if (!vehicleType) return "T";
  const map: Record<string, string> = {
    BUS: "B",
    INTERCITY_BUS: "B",
    TROLLEYBUS: "B",
    SUBWAY: "S",
    METRO_RAIL: "S",
    HEAVY_RAIL: "R",
    COMMUTER_TRAIN: "R",
    RAIL: "R",
    HIGH_SPEED_TRAIN: "R",
    TRAM: "T",
    LIGHT_RAIL: "T",
    FERRY: "F",
    CABLE_CAR: "C",
    GONDOLA_LIFT: "G",
    MONORAIL: "M",
  };
  return map[vehicleType] ?? "T";
}

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
  stopGroups: StopGroup[];
  selectedStopIndex?: number | null;
  onStopClick?: (stopIndex: number) => void;
  showBounds: boolean;
  selectedRestaurant: Restaurant | null;
  onSelectRestaurant: (restaurant: Restaurant | null) => void;
  onMapClick?: () => void;
}

export default function Map({
  centerCoordinate,
  zoomLevel,
  mapId,
  colorScheme = "DARK",
  routes,
  selectedRouteIndex,
  restaurants,
  searchCircles,
  selectedStopIndex,
  onStopClick,
  showBounds,
  selectedRestaurant,
  onSelectRestaurant,
  onMapClick,
}: MapProps) {
  const map = useMap();
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const transitBadgesRef = useRef<google.maps.Marker[]>([]);
  const circlesRef = useRef<google.maps.Circle[]>([]);
  const stopMarkersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  // ── Pan to selected restaurant ───────────────────────────────────────────

  useEffect(() => {
    if (!map || !selectedRestaurant) return;
    map.panTo(selectedRestaurant.location);
    map.setZoom(17);
  }, [map, selectedRestaurant]);

  // ── Route polylines + transit badges ─────────────────────────────────────

  useEffect(() => {
    if (!map) return;

    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    transitBadgesRef.current.forEach((m) => m.setMap(null));
    transitBadgesRef.current = [];

    routes.forEach((route, index) => {
      const isSelected = selectedRouteIndex === index;

      if (!isSelected) {
        const path = buildRoutePath(route);
        if (path.length === 0) return;
        polylinesRef.current.push(
          new google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: "#52525B",
            strokeWeight: 4,
            strokeOpacity: 0.45,
            zIndex: 1,
            map,
          }),
        );
        return;
      }

      const segments = getRouteSegments(route);
      for (const segment of segments) {
        if (segment.path.length < 2) continue;

        if (segment.travelMode === "WALKING") {
          const walkingDotColor = colorScheme === "DARK" ? "#FFFFFF" : "#1E293B";
          polylinesRef.current.push(
            new google.maps.Polyline({
              path: segment.path,
              geodesic: true,
              strokeOpacity: 0,
              strokeWeight: 0,
              icons: [
                {
                  icon: {
                    path: "M 0,-1 0,1",
                    strokeOpacity: 1,
                    strokeColor: walkingDotColor,
                    strokeWeight: 3,
                    scale: 4,
                  },
                  offset: "0",
                  repeat: "18px",
                },
              ],
              zIndex: 2,
              map,
            }),
          );
        } else {
          polylinesRef.current.push(
            new google.maps.Polyline({
              path: segment.path,
              geodesic: true,
              strokeColor: "#2563EB",
              strokeWeight: 6,
              strokeOpacity: 1,
              zIndex: 2,
              map,
            }),
          );

          if (segment.departureLocation) {
            transitBadgesRef.current.push(
              new google.maps.Marker({
                position: segment.departureLocation,
                map,
                zIndex: 5,
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: "#1D4ED8",
                  fillOpacity: 1,
                  strokeColor: "#FFFFFF",
                  strokeWeight: 2,
                },
                label: {
                  text: getTransitShortLabel(segment.vehicleType),
                  color: "#FFFFFF",
                  fontSize: "10px",
                  fontWeight: "bold",
                },
              }),
            );
          }
        }
      }
    });

    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
      transitBadgesRef.current.forEach((m) => m.setMap(null));
      transitBadgesRef.current = [];
    };
  }, [map, routes, selectedRouteIndex, colorScheme]);

  // ── Fit bounds ────────────────────────────────────────────────────────────

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

  // ── Search circles + stop dot markers ────────────────────────────────────

  useEffect(() => {
    if (!map) return;

    circlesRef.current.forEach((c) => c.setMap(null));
    circlesRef.current = [];
    stopMarkersRef.current.forEach((m) => m.setMap(null));
    stopMarkersRef.current = [];

    if (showBounds && searchCircles.length > 0) {
      circlesRef.current = searchCircles.map((searchCircle) => {
        const circle = new google.maps.Circle({
          center: searchCircle.center,
          radius: searchCircle.radius,
          strokeColor: "#2563EB",
          strokeOpacity: 0.35,
          strokeWeight: 1.5,
          fillColor: "#2563EB",
          fillOpacity: 0.06,
          map,
        });
        if (onMapClick) circle.addListener("click", onMapClick);
        return circle;
      });

      stopMarkersRef.current = searchCircles.map((searchCircle, idx) => {
        const isSelected = selectedStopIndex === idx;
        const marker = new google.maps.Marker({
          position: searchCircle.center,
          map,
          zIndex: isSelected ? 6 : 3,
          title: searchCircle.name,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: isSelected ? 8 : 5,
            fillColor: isSelected ? "#2563EB" : "#FFFFFF",
            fillOpacity: 1,
            strokeColor: "#2563EB",
            strokeWeight: isSelected ? 3 : 2,
          },
        });

        if (searchCircle.name) {
          const openLabel = () => {
            if (!infoWindowRef.current) {
              infoWindowRef.current = new google.maps.InfoWindow();
            }
            infoWindowRef.current.setContent(
              `<span style="font-size:13px;font-weight:500;padding:2px 4px">${searchCircle.name}</span>`,
            );
            infoWindowRef.current.open({ map, anchor: marker });
          };
          marker.addListener("mouseover", openLabel);
          marker.addListener("mouseout", () => infoWindowRef.current?.close());
        }

        marker.addListener("click", () => {
          if (searchCircle.name) {
            if (!infoWindowRef.current) {
              infoWindowRef.current = new google.maps.InfoWindow();
            }
            infoWindowRef.current.setContent(
              `<span style="font-size:13px;font-weight:500;padding:2px 4px">${searchCircle.name}</span>`,
            );
            infoWindowRef.current.open({ map, anchor: marker });
          }
          onStopClick?.(idx);
        });

        return marker;
      });
    }

    return () => {
      infoWindowRef.current?.close();
      circlesRef.current.forEach((c) => c.setMap(null));
      circlesRef.current = [];
      stopMarkersRef.current.forEach((m) => m.setMap(null));
      stopMarkersRef.current = [];
    };
  }, [map, searchCircles, showBounds, onMapClick, onStopClick, selectedStopIndex]);

  // ── Smart restaurant marker set ───────────────────────────────────────────
  // Default: show the top 2-3 restaurants per stop (by rating × log(reviews)).
  // When a stop is selected: show all its restaurants; dim top picks elsewhere.

  const topRestaurantIds = useMemo(() => {
    const ids = new Set<string>();
    const byStop: Record<number, Restaurant[]> = {};
    for (const r of restaurants) {
      if (!byStop[r.nearestStopIndex]) byStop[r.nearestStopIndex] = [];
      byStop[r.nearestStopIndex].push(r);
    }
    for (const rests of Object.values(byStop)) {
      const sorted = [...rests].sort(
        (a, b) =>
          (b.rating ?? 0) * Math.log((b.userRatingsTotal ?? 0) + 1) -
          (a.rating ?? 0) * Math.log((a.userRatingsTotal ?? 0) + 1),
      );
      sorted.slice(0, 3).forEach((r) => ids.add(r.placeId));
    }
    return ids;
  }, [restaurants]);

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

      {restaurants.map((restaurant) => {
        const isSelectedStop =
          selectedStopIndex !== null &&
          restaurant.nearestStopIndex === selectedStopIndex;
        const isTopMarker = topRestaurantIds.has(restaurant.placeId);

        // Hide this marker if it's not a top pick and its stop isn't selected.
        if (!isTopMarker && !isSelectedStop) return null;

        const isDimmed =
          selectedStopIndex !== null && !isSelectedStop;

        return (
          <AdvancedMarker
            key={restaurant.placeId}
            position={restaurant.location}
            zIndex={isSelectedStop ? 10 : 5}
            onClick={() => onSelectRestaurant(restaurant)}
          >
            <Pin
              background={
                isDimmed ? "#9CA3AF" : isSelectedStop ? "#F97316" : "#EF4444"
              }
              borderColor={
                isDimmed ? "#6B7280" : isSelectedStop ? "#C2410C" : "#991B1B"
              }
              glyphColor={isDimmed ? "#E5E7EB" : "#FEE2E2"}
              scale={isSelectedStop ? 1.2 : 1}
            />
          </AdvancedMarker>
        );
      })}

      {selectedRestaurant && (
        <RestaurantMarkerPopup
          restaurant={selectedRestaurant}
          onClose={() => onSelectRestaurant(null)}
        />
      )}
    </GoogleMap>
  );
}
