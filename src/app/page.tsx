"use client";

import Map from "@/components/Map";
import Navbar from "@/components/Navbar";
import RouteSearch from "@/components/RouteSearch";
import RestaurantSidebar from "@/components/RestaurantSidebar";
import RouteSelectionPanel from "@/components/RouteSelectionPanel";
import BottomSheet from "@/components/BottomSheet";
import { getRouteHeadline } from "@/components/RouteOptionCard";
import { APIProvider } from "@vis.gl/react-google-maps";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCustomPlacesAutocomplete } from "@/hooks/useCustomPlacesAutocomplete";
import { ThemedAutocompleteInput } from "@/components/ThemedAutocompleteInput";
import {
  formatCommuteLimitMessage,
  isRouteWithinCommuteLimits,
} from "@/lib/rate-limit-config";
import {
  parseApiError,
  useRouteSearchGuards,
} from "@/lib/client/search-guards";
import { normalizeDirectionsResult } from "@/lib/directions-normalize";
import { extractPolylineCoordinates } from "@/lib/directions-paths";
import type { PlaceSearchResult } from "@/lib/places-types";
import { computeSearchPoints } from "@/lib/route-sampling";
import * as turf from "@turf/turf";

export type Restaurant = {
  placeId: string;
  name: string;
  location: { lat: number; lng: number };
  distanceFromRoute: number;
  types: string[];
  rating?: number; // 1.0 to 5.0
  userRatingsTotal?: number; // Number of reviews
  priceLevel?: number; // 0 to 4 (0=free, 1=$, 2=$$, 3=$$$, 4=$$$$)
  vicinity?: string; // Short address like "123 Main St, San Francisco"
};

export type SearchCircle = {
  center: google.maps.LatLngLiteral;
  radius: number;
};

type ThemeMode = "light" | "dark";

function MapContent() {
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  // === HERO/RESULTS STATE ===
  const [viewState, setViewState] = useState<"hero" | "results">("hero");
  const [originLabel, setOriginLabel] = useState("");
  const [destinationLabel, setDestinationLabel] = useState("");
  // User's current location (declared first so it can be passed to the hook)
  const [userLocation, setUserLocation] =
    useState<google.maps.LatLngLiteral | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  // Destination autocomplete (hero view)
  const {
    input,
    setInput,
    predictions,
    loading: autocompleteLoading,
    activeIndex,
    setActiveIndex,
    selectedPrediction,
    setSelectedPrediction,
  } = useCustomPlacesAutocomplete({ userLocation });
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isFetchingDirections, setIsFetchingDirections] = useState(false);
  const {
    canSearch,
    dailyLimitReached,
    count: searchCount,
    dailyLimit,
    recordSearch,
  } = useRouteSearchGuards();
  // === SEARCH CONFIGURATION ===
  const turfFilterDistance = 750; // Turf.js filter: keep restaurants within this distance from route (meters)
  const apiSearchRadius = 1300; // API search radius: cast wider net, then filter with Turf.js (meters)
  const searchInterval = 2.5; // Sample points along route every X km for API searches
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
  const [isSearchingRestaurants, setIsSearchingRestaurants] = useState(false);
  const showBounds = true;
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);
  const activeDirectionsRequestIdRef = useRef(0);
  const activeRestaurantSearchIdRef = useRef(0);

  // === MOBILE BOTTOM SHEET ===
  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // Theme: system-aware default + persistent manual toggle
  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = window.localStorage.getItem("ride-n-dine-theme");
    if (saved === "light" || saved === "dark") {
      setThemeMode(saved);
      document.documentElement.setAttribute("data-theme", saved);
      return;
    }

    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const initialMode: ThemeMode = prefersDark ? "dark" : "light";
    setThemeMode(initialMode);
    document.documentElement.setAttribute("data-theme", initialMode);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.setAttribute("data-theme", themeMode);
    window.localStorage.setItem("ride-n-dine-theme", themeMode);
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === "dark" ? "light" : "dark"));
  };

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

  // Auto-switch to results view when a search is performed (POC: when routes appear)
  useEffect(() => {
    if (routes.length > 0 && viewState === "hero") {
      setViewState("results");
    }
    if (routes.length > 0) {
      setIsSearchExpanded(false); // collapse form when new results arrive
    }
  }, [routes.length, viewState]);

  // Mobile: open sheet when routes arrive, then peek after a route is chosen.
  useEffect(() => {
    if (routes.length > 0 && viewState === "results") {
      setIsBottomSheetExpanded(true);
    }
  }, [routes.length, viewState]);

  useEffect(() => {
    if (selectedRouteIndex !== null) {
      setIsBottomSheetExpanded(false);
    }
  }, [selectedRouteIndex]);

  // Derived: restaurants/circles for the currently selected route (or empty if none selected)
  const restaurants =
    selectedRouteIndex !== null
      ? (restaurantCache[selectedRouteIndex] ?? [])
      : [];
  const searchCircles =
    selectedRouteIndex !== null
      ? (searchCircleCache[selectedRouteIndex] ?? [])
      : [];

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
        setRouteError(await parseApiError(response));
        setViewState("results");
        setIsSearchExpanded(true);
        return;
      }

      const data = (await response.json()) as {
        status: string;
        routes: google.maps.DirectionsRoute[];
        geocoded_waypoints?: google.maps.DirectionsGeocodedWaypoint[];
        request?: google.maps.DirectionsRequest;
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
        setRestaurantCache({});
        setSearchCircleCache({});
        setViewState("results");
        setRouteError(formatCommuteLimitMessage());
        return;
      }

      setRouteError(null);
      recordSearch();
      setDirectionsResult(
        normalizeDirectionsResult(
          { ...data, routes: limitedRoutes },
          { origin: apiOrigin, destination: apiDestination },
        ),
      );
      setRoutes(limitedRoutes);
      setSelectedRouteIndex(null);
      setSelectedRestaurant(null);
      setRestaurantCache({});
      setSearchCircleCache({});
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

  const extractPolylineFromRoute = (
    route: google.maps.DirectionsRoute,
    routeIndex: number,
  ) => {
    const polylineCoordinates = extractPolylineCoordinates(route);
    searchRestaurants(polylineCoordinates, turfFilterDistance, routeIndex);
    return polylineCoordinates;
  };

  // Handler: User selects a route from the alternatives
  const handleRouteSelect = (routeIndex: number) => {
    setSelectedRouteIndex(routeIndex);
    // Cache hit: already searched this route, reuse results — no API call
    if (restaurantCache[routeIndex] !== undefined) {
      setRouteError(null);
      return;
    }
    // Cache miss: first time selecting this route, search now
    const selectedRoute = routes[routeIndex];
    setRouteError(null);
    extractPolylineFromRoute(selectedRoute, routeIndex);
  };

  const searchRestaurants = async (
    polylineCoordinates: google.maps.LatLngLiteral[],
    filterDistance: number,
    routeIndex: number,
  ) => {
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

    const searchPoints = computeSearchPoints(polylineCoordinates, {
      searchIntervalKm: searchInterval,
      apiSearchRadiusM: apiSearchRadius,
    });

    const circles: SearchCircle[] = searchPoints.map((center) => ({
      center,
      radius: apiSearchRadius,
    }));
    setSearchCircleCache((prev) => ({ ...prev, [routeIndex]: circles }));

    try {
      const response = await fetch("/api/places/nearby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          points: searchPoints,
          radius: apiSearchRadius,
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
        polylineCoordinates,
        filterDistance,
        routeIndex,
        searchId,
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
    polylineCoordinates: google.maps.LatLngLiteral[],
    filterDistance: number,
    routeIndex: number,
    searchId: number,
    finishRestaurantSearch: (searchId: number) => void,
  ) => {
    if (searchId !== activeRestaurantSearchIdRef.current) {
      return;
    }

    // Validate coordinates
    const validCoordinates = polylineCoordinates.filter(
      (c) =>
        typeof c.lat === "number" &&
        typeof c.lng === "number" &&
        !isNaN(c.lat) &&
        !isNaN(c.lng),
    );

    if (validCoordinates.length < 2) {
      console.error("Not enough valid coordinates");
      finishRestaurantSearch(searchId);
      return;
    }

    // Create Turf.js line for distance calculations
    const turfCoords = validCoordinates.map((c) => [c.lng, c.lat]);
    let routeLine = turf.lineString(turfCoords);

    // Simplify line to avoid precision issues
    try {
      routeLine = turf.simplify(routeLine, {
        tolerance: 0.0001,
        highQuality: false,
      });
    } catch (e) {
      console.warn("Could not simplify line:", e);
    }

    // Filter and transform restaurants
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

        try {
          // Calculate distance from route
          const restaurantPoint = turf.point([lng, lat]);
          const distance = turf.pointToLineDistance(
            restaurantPoint,
            routeLine,
            { units: "meters" },
          );

          // Filter: Keep only within filter distance
          if (distance > filterDistance) {
            return null;
          }

          // Transform to Restaurant type
          return {
            placeId: place.place_id || "",
            name: place.name || "Unknown Restaurant",
            location: { lat, lng },
            distanceFromRoute: Math.round(distance),
            types: place.types || [],
            rating: place.rating,
            userRatingsTotal: place.user_ratings_total,
            priceLevel: place.price_level,
            vicinity: place.vicinity,
          };
        } catch {
          // Silently skip restaurants that cause errors
          return null;
        }
      })
      .filter((restaurant): restaurant is Restaurant => restaurant !== null);

    // Store in cache so switching back to this route is free
    if (searchId !== activeRestaurantSearchIdRef.current) {
      return;
    }
    setRestaurantCache((prev) => ({ ...prev, [routeIndex]: restaurants }));
    finishRestaurantSearch(searchId);
  };

  // When user selects a destination in hero:
  // 1) run directions once location + routes library are ready, or
  // 2) fall back to manual origin entry if location is unavailable.
  useEffect(() => {
    if (!selectedPrediction) return;

    setDestinationLabel(selectedPrediction.description);

    if (userLocation) {
      setOriginLabel("Current Location");
      handleGetDirection(userLocation, {
        placeId: selectedPrediction.place_id,
      });
      return;
    }

    if (locationError) {
      setOriginLabel("");
      setViewState("results");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPrediction, userLocation, locationError]);

  return (
    <div className="h-screen w-screen flex flex-col bg-app-bg relative overflow-hidden">
      {/* Map always visible in background */}
      <div className="absolute inset-0 z-0">
        <Map
          centerCoordinate={{ lat: 49.2827, lng: -123.1207 }}
          zoomLevel={12}
          mapId={mapId}
          colorScheme={themeMode === "dark" ? "DARK" : "LIGHT"}
          directionsResult={directionsResult}
          routes={routes}
          selectedRouteIndex={selectedRouteIndex}
          restaurants={restaurants}
          searchCircles={searchCircles}
          showBounds={showBounds}
          selectedRestaurant={selectedRestaurant}
          onSelectRestaurant={setSelectedRestaurant}
          onMapClick={() => { setIsBottomSheetExpanded(false); setSelectedRestaurant(null); }}
        />
      </div>

      {/* AnimatePresence for Hero overlay */}
      <AnimatePresence>
        {viewState === "hero" && (
          <motion.div
            key="hero"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="absolute inset-0 z-20 flex items-center justify-center"
          >
            <motion.div
              layoutId="search-bar"
              className="bg-card-bg/85 backdrop-blur-xl border border-border shadow-2xl rounded-2xl px-8 py-8 md:py-12 flex flex-col items-center gap-4 md:gap-8 w-[86vw] max-w-xl mx-auto"
            >
              <h1 className="text-2xl md:text-5xl font-bold text-text-primary text-center tracking-tight">
                Hungry on your commute?
              </h1>
              <div className="w-full flex flex-col gap-4">
                <ThemedAutocompleteInput
                  value={input}
                  onChange={setInput}
                  predictions={predictions}
                  loading={autocompleteLoading}
                  onSelect={(prediction) => {
                    setSelectedPrediction(prediction);
                  }}
                  activeIndex={activeIndex}
                  setActiveIndex={setActiveIndex}
                />
                {locationError && (
                  <span className="text-red-400 text-sm text-center mt-2">
                    {locationError}
                  </span>
                )}
                {routeError && (
                  <span className="text-amber-300 text-sm text-center mt-2">
                    {routeError}
                  </span>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navbar always on top */}
      <Navbar themeMode={themeMode} onToggleTheme={toggleTheme} />

      {/* Left panel: search bar morphs from hero, then route selector appears below */}
      <AnimatePresence>
        {viewState === "results" && (
          <motion.div
            key="results-left-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-20 left-4 right-4 z-20 lg:top-20 lg:left-8 lg:right-auto lg:w-md lg:max-w-[90vw] flex flex-col gap-3 lg:max-h-[calc(100vh-6rem)]"
          >
          <motion.div layoutId="search-bar">
              <RouteSearch
                collapsed={
                  !isSearchExpanded &&
                  Boolean(originLabel && destinationLabel)
                }
                onExpand={() => setIsSearchExpanded(true)}
                onSearch={(o, d, oLabel, dLabel) => {
                  setOriginLabel(oLabel);
                  setDestinationLabel(dLabel);
                  void handleGetDirection(o, d);
                  setIsSearchExpanded(false);
                }}
                isLoading={isFetchingDirections}
                searchDisabled={
                  !canSearch || isFetchingDirections || isSearchingRestaurants
                }
                searchBlockedMessage={
                  routeError && !dailyLimitReached ? routeError : null
                }
                defaultOrigin={originLabel}
                defaultDestination={destinationLabel}
                userLocation={userLocation}
                searchCount={searchCount}
                dailyLimit={dailyLimit}
                dailyLimitReached={dailyLimitReached}
              />
            </motion.div>
            {routes.length > 0 && (
              <div className="hidden lg:block flex-1 min-h-0">
                <RouteSelectionPanel
                  routes={routes}
                  selectedRouteIndex={selectedRouteIndex}
                  onRouteSelect={handleRouteSelect}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results UI: restaurant sidebar (right rail), only in results view */}
      {viewState === "results" && (
        <>
          {/* Desktop sidebar */}
          <RestaurantSidebar
            variant="desktop"
            restaurants={restaurants}
            onRestaurantClick={setSelectedRestaurant}
          />

          {/* Mobile bottom sheet flow: routes -> restaurants */}
          {(() => {
            const phase =
              selectedRouteIndex !== null
                ? "restaurants"
                : routes.length > 0
                  ? "routes"
                  : null;

            const peekLabel =
              phase === "restaurants" && isSearchingRestaurants
                ? "Finding restaurants..."
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
                  <p className="text-text-muted text-sm text-center p-8">
                    Finding restaurants...
                  </p>
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
                    />
                  )}
              </BottomSheet>
            );
          })()}
        </>
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
