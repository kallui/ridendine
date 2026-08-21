"use client";

import {
  Map as GoogleMap,
  useMap,
  AdvancedMarker,
  Pin,
} from "@vis.gl/react-google-maps";
import { useEffect, useRef } from "react";
import { Restaurant, SearchCircle, StopGroup } from "@/app/page";
import {
  getRouteBoundsPoints,
  buildRoutePath,
  getRouteEndpoints,
  getRouteEndHeading,
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

function offsetMeters(
  point: google.maps.LatLngLiteral,
  headingDeg: number,
  meters: number,
): google.maps.LatLngLiteral {
  const radius = 6_378_137;
  const heading = (headingDeg * Math.PI) / 180;
  const north = Math.cos(heading) * meters;
  const east = Math.sin(heading) * meters;
  return {
    lat: point.lat + (north / radius) * (180 / Math.PI),
    lng:
      point.lng +
      (east / (radius * Math.cos((point.lat * Math.PI) / 180))) *
        (180 / Math.PI),
  };
}

function endpointLabelHtml(text: string): string {
  return `<span style="font-size:13px;font-weight:500;padding:2px 4px">${text}</span>`;
}

export type DesktopOverlay = "none" | "panel";

/** Matches the overlay panel: min(28rem, 30vw) with min-width 22rem. */
function desktopPanelWidthPx(): number {
  return Math.max(352, Math.min(448, window.innerWidth * 0.3));
}

/**
 * Pixel pan so the popup card (which sits above the pin) lands in the
 * visible center of this map pane.
 */
function restaurantFocusPanBy(
  map: google.maps.Map,
  desktopOverlay: DesktopOverlay,
): { x: number; y: number } {
  const div = map.getDiv();
  const width = div.clientWidth;
  const height = div.clientHeight;
  const desktop = window.matchMedia("(min-width: 1024px)").matches;
  const pad = desktop
    ? {
        left: desktopOverlay === "panel" ? desktopPanelWidthPx() : 24,
        right: 24,
        top: 24,
        bottom: 24,
      }
    : { left: 16, right: 16, top: 24, bottom: 96 };
  // Pin/anchor is at the bottom of the card; shift it down so the card is centered.
  const popupLift = 160;
  const targetX = pad.left + (width - pad.left - pad.right) / 2;
  const targetY = pad.top + (height - pad.top - pad.bottom) / 2 + popupLift;
  return { x: width / 2 - targetX, y: height / 2 - targetY };
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Geographic point that puts the popup card in the pane center at `zoom`. */
function popupFocusLatLng(
  map: google.maps.Map,
  location: google.maps.LatLngLiteral,
  zoom: number,
  desktopOverlay: DesktopOverlay,
): google.maps.LatLngLiteral {
  const projection = map.getProjection();
  if (!projection) return location;
  const { x, y } = restaurantFocusPanBy(map, desktopOverlay);
  const point = projection.fromLatLngToPoint(
    new google.maps.LatLng(location.lat, location.lng),
  );
  const scale = Math.pow(2, zoom);
  point.x += x / scale;
  point.y += y / scale;
  const latLng = projection.fromPointToLatLng(point);
  return latLng
    ? { lat: latLng.lat(), lng: latLng.lng() }
    : location;
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
  hoveredRestaurant?: Restaurant | null;
  onSelectRestaurant: (restaurant: Restaurant | null) => void;
  onOpenPhotos?: (restaurant: Restaurant) => void;
  onMapClick?: () => void;
  desktopOverlay?: DesktopOverlay;
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
  hoveredRestaurant = null,
  onSelectRestaurant,
  onOpenPhotos,
  onMapClick,
  desktopOverlay = "none",
}: MapProps) {
  const map = useMap();
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const transitBadgesRef = useRef<google.maps.Marker[]>([]);
  const circlesRef = useRef<google.maps.Circle[]>([]);
  const stopMarkersRef = useRef<google.maps.Marker[]>([]);
  const endpointMarkersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const flyRafRef = useRef<number | null>(null);
  const desktopOverlayRef = useRef(desktopOverlay);

  // ── Keep the map sized to its pane, then frame the selected popup card ─

  useEffect(() => {
    desktopOverlayRef.current = desktopOverlay;
  }, [desktopOverlay]);

  useEffect(() => {
    if (!map) return;
    map.setOptions({ clickableIcons: false });
    const onResize = () => google.maps.event.trigger(map, "resize");
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [map]);

  useEffect(() => {
    if (!map || !selectedRestaurant) return;

    google.maps.event.trigger(map, "resize");

    const startCenter = map.getCenter();
    const startZoom = map.getZoom();
    if (!startCenter || startZoom == null) return;

    const targetZoom = 17;
    const dest = popupFocusLatLng(
      map,
      selectedRestaurant.location,
      targetZoom,
      desktopOverlayRef.current,
    );
    const startLat = startCenter.lat();
    const startLng = startCenter.lng();
    const durationMs = 550;
    const startedAt = performance.now();

    if (flyRafRef.current != null) {
      cancelAnimationFrame(flyRafRef.current);
    }

    const frame = (now: number) => {
      const t = Math.min(1, (now - startedAt) / durationMs);
      const e = easeInOutCubic(t);
      map.setCenter({
        lat: startLat + (dest.lat - startLat) * e,
        lng: startLng + (dest.lng - startLng) * e,
      });
      map.setZoom(startZoom + (targetZoom - startZoom) * e);
      if (t < 1) {
        flyRafRef.current = requestAnimationFrame(frame);
      } else {
        flyRafRef.current = null;
      }
    };

    flyRafRef.current = requestAnimationFrame(frame);

    return () => {
      if (flyRafRef.current != null) {
        cancelAnimationFrame(flyRafRef.current);
        flyRafRef.current = null;
      }
    };
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

    const desktopLeft =
      isDesktop && desktopOverlay === "panel"
        ? desktopPanelWidthPx()
        : isDesktop
          ? 24
          : 0;

    const fitPadding: google.maps.Padding =
      selectedRouteIndex !== null
        ? isDesktop
          ? { top: 40, right: 40, bottom: 40, left: desktopLeft }
          : { top: 24, right: 75, bottom: 220, left: 75 }
        : isDesktop
          ? { top: 40, right: 40, bottom: 40, left: desktopLeft }
          : { top: 24, right: 72, bottom: 220, left: 72 };

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

      stopMarkersRef.current = searchCircles.flatMap((searchCircle, idx) => {
        if (
          searchCircle.endpointKind === "origin" ||
          searchCircle.endpointKind === "destination"
        ) {
          return [];
        }

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
              endpointLabelHtml(searchCircle.name),
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
              endpointLabelHtml(searchCircle.name),
            );
            infoWindowRef.current.open({ map, anchor: marker });
          }
          onStopClick?.(idx);
        });

        return [marker];
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

  // ── Origin / destination end-caps ────────────────────────────────────────
  useEffect(() => {
    if (!map) return;

    endpointMarkersRef.current.forEach((m) => m.setMap(null));
    endpointMarkersRef.current = [];

    const route =
      selectedRouteIndex !== null && routes[selectedRouteIndex]
        ? routes[selectedRouteIndex]
        : routes[0];
    if (!route) return;

    const { origin, destination } = getRouteEndpoints(route);
    const heading = getRouteEndHeading(route);
    const originIdx = searchCircles.findIndex(
      (circle) => circle.endpointKind === "origin",
    );
    const destIdx = searchCircles.findIndex(
      (circle) => circle.endpointKind === "destination",
    );
    const originSelected =
      originIdx >= 0 && selectedStopIndex === originIdx;
    const destSelected = destIdx >= 0 && selectedStopIndex === destIdx;

    const bindLabel = (marker: google.maps.Marker, label: string) => {
      const openLabel = () => {
        if (!infoWindowRef.current) {
          infoWindowRef.current = new google.maps.InfoWindow();
        }
        infoWindowRef.current.setContent(endpointLabelHtml(label));
        infoWindowRef.current.open({ map, anchor: marker });
      };
      marker.addListener("mouseover", openLabel);
      marker.addListener("mouseout", () => infoWindowRef.current?.close());
      marker.addListener("click", () => {
        openLabel();
      });
    };

    if (origin) {
      const originMarker = new google.maps.Marker({
        position: origin,
        map,
        zIndex: 3,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: originSelected ? 8 : 7,
          fillColor: "#FFFFFF",
          fillOpacity: 1,
          strokeColor: "#2563EB",
          strokeWeight: originSelected ? 3.5 : 3,
        },
      });
      bindLabel(originMarker, "Start");
      if (originIdx >= 0) {
        originMarker.addListener("click", () => onStopClick?.(originIdx));
      }
      endpointMarkersRef.current.push(originMarker);
    }

    if (destination) {
      const destDisc = new google.maps.Marker({
        position: destination,
        map,
        zIndex: 3,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: destSelected ? 8 : 7,
          fillColor: "#1D4ED8",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 2,
        },
      });
      const destArrow = new google.maps.Marker({
        position: offsetMeters(destination, heading, 14),
        map,
        zIndex: 3,
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 3.2,
          rotation: heading,
          fillColor: "#1D4ED8",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 1.25,
        },
      });
      bindLabel(destDisc, "End");
      bindLabel(destArrow, "End");
      if (destIdx >= 0) {
        destDisc.addListener("click", () => onStopClick?.(destIdx));
        destArrow.addListener("click", () => onStopClick?.(destIdx));
      }
      endpointMarkersRef.current.push(destDisc, destArrow);
    }

    return () => {
      endpointMarkersRef.current.forEach((m) => m.setMap(null));
      endpointMarkersRef.current = [];
    };
  }, [
    map,
    routes,
    selectedRouteIndex,
    searchCircles,
    selectedStopIndex,
    onStopClick,
  ]);

  // ── Restaurant markers ────────────────────────────────────────────────────
  // Show every restaurant; dim markers at other stops when one stop is selected.
  const popupRestaurant = hoveredRestaurant ?? selectedRestaurant;
  const isPopupPreview =
    Boolean(hoveredRestaurant) &&
    hoveredRestaurant?.placeId !== selectedRestaurant?.placeId;

  return (
    <div className="h-full w-full">
    <GoogleMap
      style={{ width: "100%", height: "100%" }}
      defaultCenter={centerCoordinate}
      defaultZoom={zoomLevel}
      gestureHandling="greedy"
      disableDefaultUI
      clickableIcons={false}
      isFractionalZoomEnabled
      mapId={mapId}
      colorScheme={colorScheme}
      onClick={(event) => {
        const target = event.domEvent?.target;
        if (target instanceof Element && target.closest(".restaurant-map-popup")) {
          return;
        }
        onMapClick?.();
      }}
    >
      {restaurants.map((restaurant) => {
        const isSelectedStop =
          selectedStopIndex !== null &&
          restaurant.nearestStopIndex === selectedStopIndex;
        const isHighlighted =
          selectedRestaurant?.placeId === restaurant.placeId;
        const isHovered =
          hoveredRestaurant?.placeId === restaurant.placeId && !isHighlighted;

        const isDimmed =
          selectedStopIndex !== null &&
          !isSelectedStop &&
          !isHighlighted &&
          !isHovered;

        return (
          <AdvancedMarker
            key={restaurant.placeId}
            position={restaurant.location}
            zIndex={isHighlighted ? 15 : isHovered ? 20 : isSelectedStop ? 10 : 5}
            onClick={(event) => {
              event.stop();
              onSelectRestaurant(restaurant);
            }}
          >
            <Pin
              background={
                isDimmed
                  ? "#9CA3AF"
                  : isHovered || isSelectedStop || isHighlighted
                    ? "#F97316"
                    : "#EF4444"
              }
              borderColor={
                isDimmed
                  ? "#6B7280"
                  : isHovered || isSelectedStop || isHighlighted
                    ? "#C2410C"
                    : "#991B1B"
              }
              glyphColor={isDimmed ? "#E5E7EB" : "#FEE2E2"}
              scale={isSelectedStop || isHighlighted || isHovered ? 1.2 : 1}
            />
          </AdvancedMarker>
        );
      })}

      {popupRestaurant && (
        <RestaurantMarkerPopup
          key={popupRestaurant.placeId}
          restaurant={popupRestaurant}
          preview={isPopupPreview}
          onClose={
            isPopupPreview ? undefined : () => onSelectRestaurant(null)
          }
          onOpenPhotos={isPopupPreview ? undefined : onOpenPhotos}
        />
      )}
    </GoogleMap>
    </div>
  );
}
