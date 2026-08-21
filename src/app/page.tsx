"use client";

import RouteMap from "@/components/Map";
import Navbar from "@/components/Navbar";
import RouteSearch from "@/components/RouteSearch";
import RestaurantSidebar from "@/components/RestaurantSidebar";
import RouteSelectionPanel from "@/components/RouteSelectionPanel";
import TripContextBar from "@/components/TripContextBar";
import BottomSheet from "@/components/BottomSheet";
import PhotoLightbox from "@/components/PhotoLightbox";
import { getRouteHeadline } from "@/components/RouteOptionCard";
import { APIProvider } from "@vis.gl/react-google-maps";
import { useState, useEffect, useRef, useMemo } from "react";
import { useThemeMode } from "@/hooks/useThemeMode";
import {
  formatCommuteLimitMessage,
  isRouteWithinCommuteLimits,
} from "@/lib/commute-limits";
import { parseApiError, useQuota } from "@/hooks/useQuota";
import {
  normalizeDirectionsResult,
  isTransitStep,
  getStepTransit,
} from "@/lib/directions-normalize";
import {
  extractPolylineCoordinates,
  extractTransitPolyline,
  getRouteEndpoints,
} from "@/lib/directions-paths";
import type { PlaceSearchResult } from "@/lib/places-types";
import { computeSearchPoints } from "@/lib/route-sampling";
import { formatStopName } from "@/lib/format-stop-name";
import { isValidPhotoReference } from "@/lib/place-photo";
import { formatAlightHint } from "@/lib/alight-hint";

export type Restaurant = {
  placeId: string;
  name: string;
  location: { lat: number; lng: number };
  distanceFromRoute: number;
  types: string[];
  rating?: number; // 1.0 to 5.0
  userRatingsTotal?: number; // Number of reviews
  priceLevel?: number; // 0 to 4 — kept for API compat, not displayed
  vicinity?: string; // Short address like "123 Main St, San Francisco"
  nearestStopName: string;
  nearestStopIndex: number; // route-order index into the searchCircles array
  detourMinutes: number; // walking time from the nearest stop (~80 m/min)
  transitLineName?: string; // "99", "Expo Line", etc.
  transitHeadsign?: string; // "Waterfront", "UBC"
  transitVehicleType?: string; // Google vehicle type, e.g. BUS
  alightHint?: string; // "Take Expo Line (Waterfront), then Bus 49 (UBC) · get off at Joyce St"
  photoReference?: string; // Nearby Search cover photo
};

export type StopGroup = {
  stopName: string;
  stopIndex: number;
  center: google.maps.LatLngLiteral;
  restaurants: Restaurant[];
  isTransfer: boolean; // user changes transit line at this stop
  transitLineName?: string;
  transitHeadsign?: string;
  transitVehicleType?: string;
};

export type SearchCircle = {
  center: google.maps.LatLngLiteral;
  radius: number;
  name?: string;
  routeShortName?: string;
  headsign?: string;
  vehicleType?: string;
  endpointKind?: "origin" | "destination";
};

/** How search points were resolved: real GTFS stops vs polyline sampling. */
export type StopResolution = "gtfs" | "sampled";

function MapContent() {
  const { themeMode, toggleTheme } = useThemeMode();
  const [originLabel, setOriginLabel] = useState("");
  const [destinationLabel, setDestinationLabel] = useState("");
  const [userLocation, setUserLocation] =
    useState<google.maps.LatLngLiteral | null>(null);
  const [, setLocationError] = useState<string | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isFetchingDirections, setIsFetchingDirections] = useState(false);
  const { quota, canSearch, recordSearch, markBlocked } = useQuota();
  // === SEARCH CONFIGURATION ===
  const searchRadius = 400; // 5-min walk (~400 m) — used for both the API call and visible circles
  const fallbackSearchInterval = 0.5; // Fallback: sample transit polyline every X km when GTFS unavailable
  const minRestaurantLoadingMs = 450;

  // === MAP/ROUTE STATE ===
  const [routes, setRoutes] = useState<google.maps.DirectionsRoute[]>([]); // All route alternatives
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number | null>(
    null,
  ); // Which route user picked
  const [directionsResult, setDirectionsResult] =
    useState<google.maps.DirectionsResult | null>(null); // Full API response
  // Cache: keyed by route index so we never re-search a route the user already visited
  const [restaurantCache, setRestaurantCache] = useState<{
    [routeIndex: number]: Restaurant[];
  }>({});
  const [searchCircleCache, setSearchCircleCache] = useState<{
    [routeIndex: number]: SearchCircle[];
  }>({});
  const [stopResolutionCache, setStopResolutionCache] = useState<{
    [routeIndex: number]: StopResolution;
  }>({});
  const [isSearchingRestaurants, setIsSearchingRestaurants] = useState(false);
  const showBounds = true;
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);
  const [hoveredRestaurant, setHoveredRestaurant] =
    useState<Restaurant | null>(null);
  const [lightboxRestaurant, setLightboxRestaurant] =
    useState<Restaurant | null>(null);
  const [selectedStopIndex, setSelectedStopIndex] = useState<number | null>(null);
  const activeDirectionsRequestIdRef = useRef(0);
  const activeRestaurantSearchIdRef = useRef(0);

  // === MOBILE BOTTOM SHEET ===
  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isRoutePanelExpanded, setIsRoutePanelExpanded] = useState(true);
  const [isDesktopPanelCollapsed, setIsDesktopPanelCollapsed] = useState(false);


  // Request user location on mount (only once)
  useEffect(() => {
    if (
      !userLocation &&
      typeof window !== "undefined" &&
      navigator.geolocation
    ) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setLocationError(null);
        },
        () => {
          setLocationError("Location permission denied or unavailable.");
        },
      );
    }
  }, [userLocation]);

  // Collapse search form and open bottom sheet when new routes arrive.
  useEffect(() => {
    if (routes.length > 0) {
      setIsSearchExpanded(false);
      setIsBottomSheetExpanded(true);
    }
  }, [routes.length]);

  useEffect(() => {
    if (selectedRouteIndex !== null) {
      setIsBottomSheetExpanded(true);
    }
    setSelectedStopIndex(null);
  }, [selectedRouteIndex]);

  // Derived: restaurants/circles for the currently selected route (or empty if none selected)
  const restaurants = useMemo(
    () =>
      selectedRouteIndex !== null
        ? (restaurantCache[selectedRouteIndex] ?? [])
        : [],
    [selectedRouteIndex, restaurantCache],
  );
  const searchCircles = useMemo(
    () =>
      selectedRouteIndex !== null
        ? (searchCircleCache[selectedRouteIndex] ?? [])
        : [],
    [selectedRouteIndex, searchCircleCache],
  );
  const stopResolution: StopResolution =
    selectedRouteIndex !== null
      ? (stopResolutionCache[selectedRouteIndex] ?? "gtfs")
      : "gtfs";

  // Group restaurants by their nearest stop, in route order.
  const stopGroups = useMemo((): StopGroup[] => {
    if (restaurants.length === 0 || searchCircles.length === 0) return [];

    const grouped: Record<number, Restaurant[]> = {};
    for (const r of restaurants) {
      if (!grouped[r.nearestStopIndex]) grouped[r.nearestStopIndex] = [];
      grouped[r.nearestStopIndex].push(r);
    }

    const groups: StopGroup[] = [];
    for (const [stopIndexStr, rests] of Object.entries(grouped)) {
      const stopIndex = parseInt(stopIndexStr, 10);
      const circle = searchCircles[stopIndex];
      if (!circle) continue;
      const sample = rests.find((r) => r.transitLineName);
      groups.push({
        stopName: circle.name ?? `Stop ${stopIndex + 1}`,
        stopIndex,
        center: circle.center,
        restaurants: [...rests],
        isTransfer: false,
        transitLineName: sample?.transitLineName,
        transitHeadsign: sample?.transitHeadsign,
        transitVehicleType: sample?.transitVehicleType,
      });
    }

    groups.sort((a, b) => a.stopIndex - b.stopIndex);

    // A stop is a transfer when the transit line changes from the previous stop.
    for (let i = 1; i < groups.length; i++) {
      const prev = groups[i - 1];
      const curr = groups[i];
      if (
        curr.transitLineName &&
        prev.transitLineName &&
        curr.transitLineName !== prev.transitLineName
      ) {
        curr.isTransfer = true;
      }
    }

    return groups;
  }, [restaurants, searchCircles]);

  // === MAP CONFIG ===
  const mapId =
    themeMode === "dark"
      ? (process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_DARK ??
        process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID)
      : (process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_LIGHT ??
        process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID);

  const serializeWaypoint = (
    waypoint: string | google.maps.LatLngLiteral | google.maps.Place,
  ): string | { lat: number; lng: number } | { placeId: string } | null => {
    if (typeof waypoint === "string") {
      const trimmed = waypoint.trim();
      return trimmed || null;
    }
    if ("placeId" in waypoint && waypoint.placeId) {
      return { placeId: waypoint.placeId };
    }
    if ("lat" in waypoint && "lng" in waypoint) {
      return { lat: waypoint.lat, lng: waypoint.lng };
    }
    return null;
  };

  const handleGetDirection = async (
    origin: string | google.maps.LatLngLiteral | google.maps.Place,
    destination: string | google.maps.Place,
  ) => {
    if (!canSearch || isFetchingDirections || isSearchingRestaurants) return;

    const directionsRequestId = ++activeDirectionsRequestIdRef.current;

    // Invalidate any in-flight Places fan-out from older searches.
    activeRestaurantSearchIdRef.current += 1;
    setIsSearchingRestaurants(false);

    const normalizeWaypoint = (
      waypoint: string | google.maps.LatLngLiteral | google.maps.Place,
    ): string | google.maps.LatLngLiteral | google.maps.Place | null => {
      if (typeof waypoint !== "string") return waypoint;

      const trimmed = waypoint.trim();
      if (!trimmed) return null;

      const normalized = trimmed.toLowerCase();
      const isCurrentLocationLabel =
        normalized === "current location" || normalized === "your location";

      if (isCurrentLocationLabel) {
        if (userLocation) {
          return userLocation;
        }

        setLocationError(
          "Current location is unavailable. Please choose a starting point.",
        );
        return null;
      }

      return trimmed;
    };

    const normalizedOrigin = normalizeWaypoint(origin);
    const normalizedDestination = normalizeWaypoint(destination);

    if (!normalizedOrigin || !normalizedDestination) {
      return;
    }

    const apiOrigin = serializeWaypoint(normalizedOrigin);
    const apiDestination = serializeWaypoint(normalizedDestination);

    if (!apiOrigin || !apiDestination) {
      return;
    }

    setIsFetchingDirections(true);
    setRouteError(null);
    setSelectedRouteIndex(null);
    setIsRoutePanelExpanded(true);

    try {
      const response = await fetch("/api/directions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: apiOrigin,
          destination: apiDestination,
        }),
      });

      if (directionsRequestId !== activeDirectionsRequestIdRef.current) {
        return;
      }

      if (!response.ok) {
        if (response.status === 429) {
          try {
            const body = (await response.json()) as {
              message?: string;
              quota?: import("@/lib/rate-limit/types").QuotaResult;
            };
            if (body.quota) markBlocked(body.quota);
            setRouteError(body.message ?? "Daily limit reached. Try again later.");
          } catch {
            setRouteError("Daily limit reached. Try again later.");
          }
        } else {
          setRouteError(await parseApiError(response));
        }
        setIsSearchExpanded(true);
        return;
      }

      const data = (await response.json()) as {
        status: string;
        routes: google.maps.DirectionsRoute[];
        geocoded_waypoints?: google.maps.DirectionsGeocodedWaypoint[];
        request?: google.maps.DirectionsRequest;
        quota?: import("@/lib/rate-limit/types").QuotaResult;
      };

      if (data.status !== "OK" || !data.routes?.length) {
        setRouteError("Could not find a route for those locations.");
        return;
      }

      const seen = new Set<string>();
      const uniqueRoutes = data.routes.filter((route) => {
        const headline = getRouteHeadline(route);
        const isDupe = seen.has(headline);
        if (isDupe) return false;
        seen.add(headline);
        return true;
      });

      const limitedRoutes = uniqueRoutes.filter(isRouteWithinCommuteLimits);

      if (limitedRoutes.length === 0) {
        setDirectionsResult(null);
        setRoutes([]);
        setSelectedRouteIndex(null);
        setSelectedRestaurant(null);
        setLightboxRestaurant(null);
        setIsRoutePanelExpanded(true);
        setIsDesktopPanelCollapsed(false);
        setRestaurantCache({});
        setSearchCircleCache({});
        setStopResolutionCache({});
        setRouteError(formatCommuteLimitMessage());
        return;
      }

      setRouteError(null);
      if (data.quota) recordSearch(data.quota);
      setDirectionsResult(
        normalizeDirectionsResult(
          { ...data, routes: limitedRoutes },
          { origin: apiOrigin, destination: apiDestination },
        ),
      );
      setRoutes(limitedRoutes);
      setSelectedRouteIndex(null);
      setSelectedRestaurant(null);
      setLightboxRestaurant(null);
      setIsRoutePanelExpanded(true);
      setIsDesktopPanelCollapsed(false);
      setRestaurantCache({});
      setSearchCircleCache({});
      setStopResolutionCache({});
    } catch (error) {
      if (directionsRequestId !== activeDirectionsRequestIdRef.current) {
        return;
      }
      console.error("Error fetching directions:", error);
      setRouteError("Failed to fetch directions. Please try again.");
    } finally {
      if (directionsRequestId === activeDirectionsRequestIdRef.current) {
        setIsFetchingDirections(false);
      }
    }
  };

  /**
   * Resolves which lat/lng points to use as restaurant search centers for a
   * given route, then kicks off the restaurant search.
   *
   * Strategy (in order):
   *  1. Ask /api/transit-stops for exact stop locations from the city's GTFS
   *     feed(s) when the route has transit steps.
   *  2. If GTFS returns stops: use them directly as search centers.
   *  3. Otherwise (no coverage, miss, or GTFS failure): fall back to sampling
   *     the TRANSIT-only step polyline every 0.5 km.
   */
  const startRestaurantSearch = async (
    route: google.maps.DirectionsRoute,
    routeIndex: number,
  ) => {
    // Always include the route's origin and destination as search points so
    // users also see restaurants near where they start and end their journey.
    const { origin, destination } = getRouteEndpoints(route);
    const originName =
      route.legs[0]?.start_address?.split(",")[0] ?? "Start";
    const destinationName =
      route.legs[route.legs.length - 1]?.end_address?.split(",")[0] ??
      "Destination";
    const originPoint = origin
      ? {
          ...origin,
          name: originName,
          exempt: "endpoint" as const,
          endpointKind: "origin" as const,
        }
      : null;
    const destinationPoint = destination
      ? {
          ...destination,
          name: destinationName,
          exempt: "endpoint" as const,
          endpointKind: "destination" as const,
        }
      : null;

    /** Origin → mid-route stops → destination (sidebar groups follow the trip). */
    const inJourneyOrder = (
      mid: {
        lat: number;
        lng: number;
        name?: string;
        exempt?: "endpoint" | "station";
        routeShortName?: string;
        endpointKind?: "origin" | "destination";
      }[],
    ) => [
      ...(originPoint ? [originPoint] : []),
      ...mid,
      ...(destinationPoint ? [destinationPoint] : []),
    ];

    // Collect transit step data needed for GTFS lookup
    type TransitStepInput = {
      departureLat: number;
      departureLng: number;
      arrivalLat: number;
      arrivalLng: number;
      routeShortName: string;
    };

    const lineMeta = new Map<
      string,
      { headsign?: string; vehicleType?: string }
    >();

    const transitSteps: TransitStepInput[] = route.legs
      .flatMap((leg) => leg.steps)
      .filter((step) => isTransitStep(step))
      .flatMap((step) => {
        const transit = getStepTransit(step);
        if (!transit?.departure_stop?.location || !transit?.arrival_stop?.location) {
          return [];
        }
        const dep = transit.departure_stop.location as unknown as { lat: number; lng: number };
        const arr = transit.arrival_stop.location as unknown as { lat: number; lng: number };
        const routeShortName =
          transit.line?.short_name ?? transit.line?.name ?? "";
        if (routeShortName && !lineMeta.has(routeShortName)) {
          lineMeta.set(routeShortName, {
            headsign: transit.headsign || undefined,
            vehicleType: transit.line?.vehicle?.type,
          });
        }
        return [
          {
            departureLat: dep.lat,
            departureLng: dep.lng,
            arrivalLat: arr.lat,
            arrivalLng: arr.lng,
            routeShortName,
          },
        ];
      });

    // Try GTFS lookup via the server (coverage + feed selection stay server-side)
    if (transitSteps.length === 0) {
      console.warn(`[ride-n-dine] Route ${routeIndex} — no transit steps found, using fallback`);
    } else {
      try {
        const response = await fetch("/api/transit-stops", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ steps: transitSteps }),
        });
        if (response.ok) {
          const data = (await response.json()) as {
            stops: { lat: number; lng: number; name: string; routeShortName?: string }[];
          };
          if (data.stops.length > 0) {
            // Mark rail/major-exchange stops as exempt from proximity dedup.
            // Many agencies include "Station" in rail/exchange names; regular
            // bus stops usually do not.
            const taggedStops = data.stops.map((s) => ({
              ...s,
              exempt: /\bstation\b/i.test(s.name) ? ("station" as const) : undefined,
            }));
            const allPoints = inJourneyOrder(taggedStops);
            console.group(`[ride-n-dine] Route ${routeIndex} — GTFS stop points (${allPoints.length} total)`);
            console.table(
              allPoints.map((p, i) => ({
                "#": i,
                source: p.exempt === "endpoint" ? "endpoint" : "GTFS",
                name: p.name ?? "(unnamed)",
                lat: p.lat.toFixed(5),
                lng: p.lng.toFixed(5),
              })),
            );
            console.groupEnd();
            searchRestaurants(allPoints, routeIndex, "gtfs", lineMeta);
            return;
          } else {
            console.warn(`[ride-n-dine] Route ${routeIndex} — GTFS returned 0 stops, falling back to polyline sampling`);
          }
        }
      } catch (err) {
        console.warn("[ride-n-dine] GTFS stop lookup failed, using fallback:", err);
      }
    }

    // Fallback: sample the transit-only polyline at tight intervals
    const transitPolyline = extractTransitPolyline(route);
    if (transitPolyline.length > 0) {
      const fallbackPoints = computeSearchPoints(transitPolyline, {
        searchIntervalKm: fallbackSearchInterval,
        apiSearchRadiusM: searchRadius,
      });
      const allPoints = inJourneyOrder(fallbackPoints);
      console.group(`[ride-n-dine] Route ${routeIndex} — fallback polyline sample points (${allPoints.length} total)`);
      console.table(
        allPoints.map((p, i) => ({
          "#": i,
          source: p.exempt === "endpoint" ? "endpoint" : "polyline-sample",
          name: (p as { name?: string }).name ?? "(unnamed)",
          lat: p.lat.toFixed(5),
          lng: p.lng.toFixed(5),
        })),
      );
      console.groupEnd();
      searchRestaurants(allPoints, routeIndex, "sampled", lineMeta);
      return;
    }

    // Last resort: use the full route polyline (original behaviour)
    const fullPolyline = extractPolylineCoordinates(route);
    const lastResortPoints = computeSearchPoints(fullPolyline, {
      searchIntervalKm: fallbackSearchInterval,
      apiSearchRadiusM: searchRadius,
    });
    const allLastResort = inJourneyOrder(lastResortPoints);
    console.warn(`[ride-n-dine] Route ${routeIndex} — last-resort full polyline sample (${allLastResort.length} points)`);
    searchRestaurants(allLastResort, routeIndex, "sampled", lineMeta);
  };

  // Handler: User selects a route from the alternatives
  const handleRouteSelect = (routeIndex: number) => {
    setSelectedRouteIndex(routeIndex);
    setIsRoutePanelExpanded(false);
    // Cache hit: already searched this route, reuse results — no API call
    if (restaurantCache[routeIndex] !== undefined) {
      setRouteError(null);
      setIsSearchingRestaurants(false);
      return;
    }
    // Show loading UI immediately — GTFS stop resolution runs before Places fetch.
    setIsSearchingRestaurants(true);
    setRouteError(null);
    const selectedRoute = routes[routeIndex];
    if (!selectedRoute) return;
    void startRestaurantSearch(selectedRoute, routeIndex);
  };

  const searchRestaurants = async (
    stopPoints: {
      lat: number;
      lng: number;
      name?: string;
      exempt?: "endpoint" | "station";
      routeShortName?: string;
      headsign?: string;
      vehicleType?: string;
      endpointKind?: "origin" | "destination";
    }[],
    routeIndex: number,
    stopResolution: StopResolution,
    lineMeta: Map<string, { headsign?: string; vehicleType?: string }>,
  ) => {
    const decoratedStops = stopPoints.map((sp) => {
      const meta = sp.routeShortName
        ? lineMeta.get(sp.routeShortName)
        : undefined;
      return {
        ...sp,
        headsign: sp.headsign ?? meta?.headsign,
        vehicleType: sp.vehicleType ?? meta?.vehicleType,
      };
    });
    setStopResolutionCache((prev) => ({ ...prev, [routeIndex]: stopResolution }));
    const searchId = ++activeRestaurantSearchIdRef.current;
    const searchStartedAt = Date.now();
    setIsSearchingRestaurants(true);

    const finishRestaurantSearch = (id: number) => {
      if (id !== activeRestaurantSearchIdRef.current) {
        return;
      }

      const elapsedMs = Date.now() - searchStartedAt;
      const remainingMs = Math.max(0, minRestaurantLoadingMs - elapsedMs);

      window.setTimeout(() => {
        if (id !== activeRestaurantSearchIdRef.current) {
          return;
        }
        setIsSearchingRestaurants(false);
      }, remainingMs);
    };

    // Dedup strategy:
    //  • "endpoint" stops (origin/destination) — always kept.
    //  • "station" stops (SkyTrain / exchange stations) — kept unless an
    //    endpoint is within STATION_ENDPOINT_DEDUP_M (e.g. the user's
    //    destination IS the station; no need for a second overlapping circle).
    //  • Unmarked stops (bus stops) — dropped if any already-accepted stop is
    //    within BUS_DEDUP_M to collapse same-block stops without touching stations.
    const BUS_DEDUP_M = 150;
    const STATION_ENDPOINT_DEDUP_M = 300;

    const distM = (
      a: { lat: number; lng: number },
      b: { lat: number; lng: number },
    ) => {
      const dLat = (a.lat - b.lat) * 111_320;
      const dLng =
        (a.lng - b.lng) * 111_320 * Math.cos(b.lat * (Math.PI / 180));
      return Math.sqrt(dLat * dLat + dLng * dLng);
    };

    const endpointPoints = decoratedStops.filter((s) => s.exempt === "endpoint");
    const deduped: typeof decoratedStops = [];

    for (const stop of decoratedStops) {
      if (stop.exempt === "endpoint") {
        deduped.push(stop);
        continue;
      }

      if (stop.exempt === "station") {
        // Skip if very close to an endpoint — the endpoint circle covers it.
        const nearEndpoint = endpointPoints.some(
          (ep) => distM(stop, ep) < STATION_ENDPOINT_DEDUP_M,
        );
        if (!nearEndpoint) deduped.push(stop);
        continue;
      }

      // Regular bus stop — skip if too close to any already-accepted stop.
      const tooClose = deduped.some((existing) => distM(stop, existing) < BUS_DEDUP_M);
      if (!tooClose) deduped.push(stop);
    }

    // If over the server limit, spread evenly so the whole route is covered.
    const MAX_POINTS = 25;
    let searchPoints = deduped;
    if (deduped.length > MAX_POINTS) {
      const step = deduped.length / MAX_POINTS;
      searchPoints = Array.from({ length: MAX_POINTS }, (_, i) =>
        deduped[Math.min(Math.round(i * step), deduped.length - 1)],
      );
    }

    console.group(
      `[ride-n-dine] Route ${routeIndex} — search circles (${searchPoints.length} of ${decoratedStops.length} stops)`,
    );
    console.table(
      searchPoints.map((sp, i) => ({
        "#": i,
        name: sp.name ?? "(unnamed)",
        lat: sp.lat.toFixed(5),
        lng: sp.lng.toFixed(5),
      })),
    );
    console.groupEnd();

    const circles: SearchCircle[] = searchPoints.map((sp) => ({
      center: { lat: sp.lat, lng: sp.lng },
      radius: searchRadius,
      name:
        sp.endpointKind === "origin"
          ? "Your start"
          : sp.endpointKind === "destination"
            ? "Your destination"
            : sp.name
              ? formatStopName(sp.name)
              : undefined,
      routeShortName: sp.routeShortName,
      headsign: sp.headsign,
      vehicleType: sp.vehicleType,
      endpointKind: sp.endpointKind,
    }));
    setSearchCircleCache((prev) => ({ ...prev, [routeIndex]: circles }));

    // Tag each search point with its route-order index so restaurants can
    // track which stop they belong to. This index aligns with searchCircles[i].
    const indexedStopPoints = searchPoints.map((sp, i) => ({ ...sp, stopIndex: i }));

    try {
      const response = await fetch("/api/places/nearby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          points: searchPoints,
          radius: searchRadius,
        }),
      });

      if (searchId !== activeRestaurantSearchIdRef.current) {
        return;
      }

      if (!response.ok) {
        setRouteError(await parseApiError(response));
        finishRestaurantSearch(searchId);
        return;
      }

      const data = (await response.json()) as { places: PlaceSearchResult[] };
      processAllResults(
        data.places,
        indexedStopPoints,
        routeIndex,
        searchId,
        stopResolution,
        finishRestaurantSearch,
      );
    } catch (error) {
      if (searchId !== activeRestaurantSearchIdRef.current) {
        return;
      }
      console.error("Error fetching restaurants:", error);
      setRouteError("Failed to fetch restaurants. Please try again.");
      finishRestaurantSearch(searchId);
    }
  };

  const processAllResults = (
    results: PlaceSearchResult[],
    stopPoints: {
      lat: number;
      lng: number;
      name?: string;
      stopIndex: number;
      routeShortName?: string;
      headsign?: string;
      vehicleType?: string;
      endpointKind?: "origin" | "destination";
    }[],
    routeIndex: number,
    searchId: number,
    stopResolution: StopResolution,
    finishRestaurantSearch: (searchId: number) => void,
  ) => {
    if (searchId !== activeRestaurantSearchIdRef.current) {
      return;
    }

    const validStops = stopPoints.filter(
      (s) => typeof s.lat === "number" && !isNaN(s.lat) &&
             typeof s.lng === "number" && !isNaN(s.lng),
    );

    // Transform restaurants — no distance gate, the API search radius is the
    // single source of truth for what counts as "near a stop".
    const restaurants = results
      .map((place): Restaurant | null => {
        // Filter out hotels and lodging
        if (
          place.types?.some(
            (type) =>
              type === "lodging" || type === "hotel" || type === "motel",
          )
        ) {
          return null;
        }

        if (!place.geometry?.location) {
          return null;
        }

        const lat = place.geometry.location.lat;
        const lng = place.geometry.location.lng;

        if (
          typeof lat !== "number" ||
          typeof lng !== "number" ||
          isNaN(lat) ||
          isNaN(lng)
        ) {
          return null;
        }

        // Straight-line distance to nearest stop in metres, and track which
        // stop is nearest so we can group restaurants by stop.
        // Equirectangular approximation — accurate to <0.5% under 400 m.
        let minDistance = Infinity;
        let nearestStop: (typeof validStops)[0] | null = null;
        for (const stop of validStops) {
          const dLat = (lat - stop.lat) * 111_320;
          const dLng =
            (lng - stop.lng) *
            111_320 *
            Math.cos(stop.lat * (Math.PI / 180));
          const d = Math.sqrt(dLat * dLat + dLng * dLng);
          if (d < minDistance) {
            minDistance = d;
            nearestStop = stop;
          }
        }

        const distanceFromRoute = Math.round(minDistance);

        const coverPhoto = place.photos?.[0]?.photo_reference;

        const nearestStopName =
          nearestStop?.endpointKind === "origin"
            ? "Your start"
            : nearestStop?.endpointKind === "destination"
              ? "Your destination"
              : nearestStop?.name
                ? formatStopName(nearestStop.name)
                : stopResolution === "gtfs"
                  ? formatStopName(`Stop ${(nearestStop?.stopIndex ?? 0) + 1}`)
                  : "";
        const nearestStopIndex = nearestStop?.stopIndex ?? 0;

        return {
          placeId: place.place_id || "",
          name: place.name || "Unknown Restaurant",
          location: { lat, lng },
          distanceFromRoute,
          types: place.types || [],
          rating: place.rating,
          userRatingsTotal: place.user_ratings_total,
          priceLevel: place.price_level,
          vicinity: place.vicinity,
          nearestStopName,
          nearestStopIndex,
          detourMinutes: Math.round(distanceFromRoute / 80),
          transitLineName: nearestStop?.routeShortName,
          transitHeadsign: nearestStop?.headsign,
          transitVehicleType: nearestStop?.vehicleType,
          alightHint: formatAlightHint(
            nearestStopName,
            nearestStopIndex,
            stopPoints,
          ) ?? undefined,
          photoReference:
            coverPhoto && isValidPhotoReference(coverPhoto)
              ? coverPhoto
              : undefined,
        };
      })
      .filter((restaurant): restaurant is Restaurant => restaurant !== null);

    // Store in cache so switching back to this route is free
    if (searchId !== activeRestaurantSearchIdRef.current) {
      return;
    }
    setRestaurantCache((prev) => ({ ...prev, [routeIndex]: restaurants }));
    finishRestaurantSearch(searchId);
  };

  const hasTrip = Boolean(originLabel && destinationLabel);
  const searchOpen = isSearchExpanded || !hasTrip;
  const routeListOpen =
    !searchOpen &&
    routes.length > 0 &&
    (selectedRouteIndex === null || isRoutePanelExpanded);
  const restaurantsOpen =
    !searchOpen &&
    selectedRouteIndex !== null &&
    !isRoutePanelExpanded;
  const desktopPanelOpen = routes.length > 0 && !isDesktopPanelCollapsed;

  const submitSearch = (
    origin: string | google.maps.Place,
    destination: string | google.maps.Place,
    oLabel: string,
    dLabel: string,
  ) => {
    setOriginLabel(oLabel);
    setDestinationLabel(dLabel);
    void handleGetDirection(origin, destination);
    setIsSearchExpanded(false);
    setIsDesktopPanelCollapsed(false);
  };

  const openDesktopPanel = () => setIsDesktopPanelCollapsed(false);

  const searchProps = {
    onSearch: submitSearch,
    isLoading: isFetchingDirections,
    searchDisabled:
      !canSearch || isFetchingDirections || isSearchingRestaurants,
    searchBlockedMessage:
      routeError && quota?.remaining !== 0 ? routeError : null,
    defaultOrigin: originLabel,
    defaultDestination: destinationLabel,
    userLocation,
    quota,
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-app-bg">
      <Navbar themeMode={themeMode} onToggleTheme={toggleTheme} />

      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0">
          <RouteMap
            centerCoordinate={{ lat: 49.2827, lng: -123.1207 }}
            zoomLevel={12}
            mapId={mapId}
            colorScheme={themeMode === "dark" ? "DARK" : "LIGHT"}
            directionsResult={directionsResult}
            routes={routes}
            selectedRouteIndex={selectedRouteIndex}
            restaurants={restaurants}
            searchCircles={searchCircles}
            stopGroups={stopGroups}
            selectedStopIndex={selectedStopIndex}
            onStopClick={setSelectedStopIndex}
            showBounds={showBounds}
            selectedRestaurant={selectedRestaurant}
            hoveredRestaurant={hoveredRestaurant}
            onSelectRestaurant={setSelectedRestaurant}
            onOpenPhotos={setLightboxRestaurant}
            desktopOverlay={desktopPanelOpen ? "panel" : "none"}
            onMapClick={() => {
              setIsBottomSheetExpanded(false);
              setSelectedRestaurant(null);
              setHoveredRestaurant(null);
              setSelectedStopIndex(null);
            }}
          />
        </div>

        <div className="pointer-events-none absolute inset-0 z-20 hidden lg:block">
          {routes.length === 0 && (
            <div className="pointer-events-auto absolute left-4 top-4 w-[min(24rem,calc(100%-2rem))]">
              <RouteSearch {...searchProps} />
            </div>
          )}

          {routes.length > 0 && (
            <>
              <aside
                className={`absolute inset-y-0 left-0 flex w-[min(28rem,30vw)] min-w-[22rem] flex-col border-r border-border bg-card-bg transition-transform duration-300 ease-out ${
                  isDesktopPanelCollapsed
                    ? "pointer-events-none -translate-x-full"
                    : "pointer-events-auto translate-x-0"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setIsDesktopPanelCollapsed(true)}
                  className="absolute top-1/2 -right-3 z-10 flex h-8 w-6 -translate-y-1/2 items-center justify-center rounded-r-md border border-l-0 border-border bg-card-bg text-text-secondary shadow-md hover:text-text-primary"
                  aria-label="Hide panel"
                >
                  <svg
                    className="h-4 w-4"
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
                {!restaurantsOpen && (
                  <div className="shrink-0">
                    <RouteSearch
                      embedded
                      collapsed={
                        !isSearchExpanded &&
                        Boolean(originLabel && destinationLabel)
                      }
                      onExpand={() => setIsSearchExpanded(true)}
                      {...searchProps}
                    />
                  </div>
                )}
                {routeListOpen && (
                  <div className="flex min-h-0 flex-1 flex-col">
                    <RouteSelectionPanel
                      embedded
                      routes={routes}
                      selectedRouteIndex={selectedRouteIndex}
                      onRouteSelect={handleRouteSelect}
                    />
                  </div>
                )}
                {restaurantsOpen && selectedRouteIndex !== null && (
                  <>
                    <TripContextBar
                      originLabel={originLabel}
                      destinationLabel={destinationLabel}
                      routeHeadline={getRouteHeadline(routes[selectedRouteIndex])}
                      duration={
                        routes[selectedRouteIndex].legs[0]?.duration?.text
                      }
                      onEditTrip={() => setIsSearchExpanded(true)}
                      onEditRoute={() => setIsRoutePanelExpanded(true)}
                    />
                    <RestaurantSidebar
                      variant="desktop"
                      restaurants={restaurants}
                      stopGroups={stopGroups}
                      stopResolution={stopResolution}
                      selectedStopIndex={selectedStopIndex}
                      onStopClick={setSelectedStopIndex}
                      isSearching={
                        isSearchingRestaurants && selectedRouteIndex !== null
                      }
                      onRestaurantClick={setSelectedRestaurant}
                      onRestaurantHover={setHoveredRestaurant}
                      onPhotoClick={setLightboxRestaurant}
                    />
                  </>
                )}
              </aside>

              {isDesktopPanelCollapsed && (
                <>
                  <div className="pointer-events-auto absolute left-4 top-4 w-[min(24rem,calc(100%-2rem))]">
                    {restaurantsOpen && selectedRouteIndex !== null ? (
                      <TripContextBar
                        floating
                        originLabel={originLabel}
                        destinationLabel={destinationLabel}
                        routeHeadline={getRouteHeadline(routes[selectedRouteIndex])}
                        duration={
                          routes[selectedRouteIndex].legs[0]?.duration?.text
                        }
                        onEditTrip={() => {
                          setIsSearchExpanded(true);
                          openDesktopPanel();
                        }}
                        onEditRoute={() => {
                          setIsRoutePanelExpanded(true);
                          openDesktopPanel();
                        }}
                      />
                    ) : (
                      <div className="overflow-hidden rounded-lg border border-border bg-card-bg shadow-lg">
                        <RouteSearch
                          embedded
                          collapsed={!isSearchExpanded && hasTrip}
                          onExpand={() => {
                            setIsSearchExpanded(true);
                            openDesktopPanel();
                          }}
                          {...searchProps}
                        />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={openDesktopPanel}
                    className="pointer-events-auto absolute top-1/2 left-0 z-10 flex h-8 w-6 -translate-y-1/2 items-center justify-center rounded-r-md border border-l-0 border-border bg-card-bg text-text-secondary shadow-md hover:text-text-primary"
                    aria-label="Show panel"
                  >
                    <svg
                      className="h-4 w-4"
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
                </>
              )}
            </>
          )}
        </div>

        <div className="absolute left-4 right-4 top-4 z-20 lg:hidden">
          <RouteSearch
            collapsed={
              !isSearchExpanded && Boolean(originLabel && destinationLabel)
            }
            onExpand={() => setIsSearchExpanded(true)}
            {...searchProps}
          />
        </div>

          {/* Mobile bottom sheet: routes then restaurants */}
          {(() => {
            const phase =
              selectedRouteIndex !== null
                ? "restaurants"
                : routes.length > 0
                  ? "routes"
                  : null;

            const peekLabel =
              phase === "restaurants" && isSearchingRestaurants
                ? "Searching for restaurants…"
                : phase === "restaurants"
                  ? `${restaurants.length} restaurant${restaurants.length !== 1 ? "s" : ""}`
                  : `${routes.length} route${routes.length !== 1 ? "s" : ""} found`;

            return (
              <BottomSheet
                isVisible={phase !== null}
                isExpanded={isBottomSheetExpanded}
                onToggle={() => setIsBottomSheetExpanded((prev) => !prev)}
                peekLabel={peekLabel}
                peekHeight="5rem"
              >
                {phase === "routes" && (
                  <RouteSelectionPanel
                    mobileMode
                    routes={routes}
                    selectedRouteIndex={selectedRouteIndex}
                    onRouteSelect={handleRouteSelect}
                  />
                )}

                {phase === "restaurants" && isSearchingRestaurants && (
                  <RestaurantSidebar
                    variant="sheet"
                    restaurants={[]}
                    stopGroups={[]}
                    stopResolution={stopResolution}
                    selectedStopIndex={selectedStopIndex}
                    onStopClick={setSelectedStopIndex}
                    onBack={() => setSelectedRouteIndex(null)}
                    isSearching
                    routeHeadline={
                      selectedRouteIndex !== null
                        ? getRouteHeadline(routes[selectedRouteIndex])
                        : undefined
                    }
                    onRestaurantClick={() => {}}
                  />
                )}

                {phase === "restaurants" &&
                  !isSearchingRestaurants &&
                  restaurants.length === 0 && (
                    <p className="text-text-muted text-sm text-center p-8">
                      No restaurants found along this route.
                    </p>
                  )}

                {phase === "restaurants" &&
                  !isSearchingRestaurants &&
                  restaurants.length > 0 && (
                    <RestaurantSidebar
                      variant="sheet"
                      restaurants={restaurants}
                      stopGroups={stopGroups}
                      stopResolution={stopResolution}
                      selectedStopIndex={selectedStopIndex}
                      onStopClick={setSelectedStopIndex}
                      onBack={() => setSelectedRouteIndex(null)}
                      routeHeadline={
                        selectedRouteIndex !== null
                          ? getRouteHeadline(routes[selectedRouteIndex])
                          : undefined
                      }
                      onRestaurantClick={(restaurant) => {
                        setSelectedRestaurant(restaurant);
                        setIsBottomSheetExpanded(false);
                      }}
                      onPhotoClick={setLightboxRestaurant}
                    />
                  )}
              </BottomSheet>
            );
          })()}
      </div>

      {lightboxRestaurant && (
        <PhotoLightbox
          key={lightboxRestaurant.placeId}
          restaurant={lightboxRestaurant}
          onClose={() => setLightboxRestaurant(null)}
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <MapContent />
    </APIProvider>
  );
}

