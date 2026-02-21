"use client";

import Map from "@/components/Map";
import Navbar from "@/components/Navbar";
import RouteSearch from "@/components/RouteSearch";
import RestaurantSidebar from "@/components/RestaurantSidebar";
import RouteSelectionPanel from "@/components/RouteSelectionPanel";
import BottomSheet from "@/components/BottomSheet";
import { getRouteHeadline } from "@/components/RouteOptionCard";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import { useState, useEffect } from "react";
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

function MapContent() {
  // === SEARCH CONFIGURATION ===
  const turfFilterDistance = 750; // Turf.js filter: keep restaurants within this distance from route (meters)
  const apiSearchRadius = 1300; // API search radius: cast wider net, then filter with Turf.js (meters)
  const searchInterval = 2.5; // Sample points along route every X km for API searches

  // === STATE ===
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
  const [showBounds, setShowBounds] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);

  // === MOBILE BOTTOM SHEET ===
  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false);

  // Auto-expand the sheet when new routes arrive (user just searched)
  useEffect(() => {
    if (routes.length > 0) setIsBottomSheetExpanded(true);
  }, [routes.length]);

  // Auto-peek when a route is selected (switches sheet from routes → restaurants view)
  useEffect(() => {
    if (selectedRouteIndex !== null) setIsBottomSheetExpanded(false);
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

  // === MAP LIBRARIES ===
  const routeLib = useMapsLibrary("routes");
  const placesLib = useMapsLibrary("places");

  const handleGetDirection = (origin: string, destination: string) => {
    if (!routeLib) {
      console.error("Routes library not loaded yet");
      return;
    }

    const directionsService = new routeLib.DirectionsService();

    directionsService.route(
      {
        origin: origin,
        destination: destination,
        travelMode: routeLib.TravelMode.TRANSIT,
        provideRouteAlternatives: true, // Request 2-3 alternative routes
      },
      (result, status) => {
        if (status === routeLib.DirectionsStatus.OK && result) {
          // Deduplicate routes by headline + duration — Google returns the same
          // route at different departure times, which are identical for our purposes
          const seen = new Set<string>();
          const uniqueRoutes = result.routes.filter((route) => {
            const headline = getRouteHeadline(route);
            const isDupe = seen.has(headline);
            console.log(
              `Route: "${headline}" → ${isDupe ? "DUPLICATE, skipped" : "kept"}`,
            );
            if (isDupe) return false;
            seen.add(headline);
            return true;
          });
          console.log(
            `Dedup: ${result.routes.length} raw → ${uniqueRoutes.length} unique`,
          );
          setDirectionsResult(result);
          setRoutes(uniqueRoutes);
          // Don't search restaurants yet - wait for user to pick a route
          setSelectedRouteIndex(null);
          setRestaurantCache({}); // Clear cache on new search
          setSearchCircleCache({});
        } else {
          console.error("Error fetching directions:", status);
        }
      },
    );
  };

  const extractPolylineFromRoute = (
    route: google.maps.DirectionsRoute,
    routeIndex: number,
  ) => {
    const steps = route.legs[0].steps;

    // Extract coordinates from all steps (walking + transit)
    const polylineCoordinates = steps
      .filter((step) => step.path && step.path.length > 0)
      .flatMap((step) =>
        step.path.map((coord) => ({
          lat: coord.lat(),
          lng: coord.lng(),
        })),
      );

    // Search for restaurants within filter distance of route
    searchRestaurants(polylineCoordinates, turfFilterDistance, routeIndex);

    return polylineCoordinates;
  };

  // Handler: User selects a route from the alternatives
  const handleRouteSelect = (routeIndex: number) => {
    setSelectedRouteIndex(routeIndex);
    // Cache hit: already searched this route, reuse results — no API call
    if (restaurantCache[routeIndex] !== undefined) {
      console.log(
        `%c✅ Route ${routeIndex}: CACHE HIT — ${restaurantCache[routeIndex].length} restaurants (no API call)`,
        "color: #10b981; font-weight: bold",
      );
      return;
    }
    // Cache miss: first time selecting this route, search now
    console.log(
      `%c🔍 Route ${routeIndex}: CACHE MISS — calling Places API...`,
      "color: #f59e0b; font-weight: bold",
    );
    const selectedRoute = routes[routeIndex];
    extractPolylineFromRoute(selectedRoute, routeIndex);
  };

  const searchRestaurants = (
    polylineCoordinates: google.maps.LatLngLiteral[],
    filterDistance: number,
    routeIndex: number,
  ) => {
    if (!placesLib) {
      console.error("Places library not loaded yet");
      return;
    }

    setIsSearchingRestaurants(true);

    // Create Turf.js line from route
    const turfCoords = polylineCoordinates.map((c) => [c.lng, c.lat]);
    const routeLine = turf.lineString(turfCoords);
    const routeLength = turf.length(routeLine, { units: "kilometers" });

    // Sample points along route for API searches
    const numSearches = Math.ceil(routeLength / searchInterval);
    const searchPoints: google.maps.LatLngLiteral[] = [];

    for (let i = 0; i <= numSearches; i++) {
      const distance = i * searchInterval;
      const point = turf.along(routeLine, distance, { units: "kilometers" });
      const [lng, lat] = point.geometry.coordinates;
      searchPoints.push({ lat, lng });
    }

    // Store search circles in cache for this route
    const circles: SearchCircle[] = searchPoints.map((center) => ({
      center,
      radius: apiSearchRadius,
    }));
    setSearchCircleCache((prev) => ({ ...prev, [routeIndex]: circles }));

    console.log(
      `Route ${routeIndex}: ${routeLength.toFixed(1)}km, making ${
        searchPoints.length
      } Places API calls`,
    );

    // Perform multiple searches and collect all results
    const allPlaces: { [key: string]: google.maps.places.PlaceResult } = {};
    const service = new placesLib.PlacesService(document.createElement("div"));
    let completedSearches = 0;

    searchPoints.forEach((point) => {
      service.nearbySearch(
        {
          location: point,
          radius: apiSearchRadius, // Use wider API search radius
          type: "restaurant",
        },
        (results, status) => {
          completedSearches++;

          if (status === placesLib.PlacesServiceStatus.OK && results) {
            // Add results to object (deduplicates by place_id)
            results.forEach((place) => {
              if (place.place_id) {
                allPlaces[place.place_id] = place;
              }
            });
          }

          // Wait for all searches to complete
          if (completedSearches === searchPoints.length) {
            processAllResults(
              Object.values(allPlaces),
              polylineCoordinates,
              filterDistance,
              routeIndex,
            );
          }
        },
      );
    });
  };

  const processAllResults = (
    results: google.maps.places.PlaceResult[],
    polylineCoordinates: google.maps.LatLngLiteral[],
    filterDistance: number,
    routeIndex: number,
  ) => {
    console.log(
      `Collected ${results.length} unique restaurants from all searches`,
    );

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
      setIsSearchingRestaurants(false);
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

        if (!place.geometry || !place.geometry.location) {
          return null;
        }

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();

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

    console.log(
      `Route ${routeIndex}: searched ${apiSearchRadius}m radius, found ${restaurants.length} restaurants within ${filterDistance}m`,
    );

    // Store in cache so switching back to this route is free
    setRestaurantCache((prev) => ({ ...prev, [routeIndex]: restaurants }));
    setIsSearchingRestaurants(false);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-app-bg">
      <Navbar />
      <div className="flex-1 relative">
        <Map
          centerCoordinate={{ lat: 49.2827, lng: -123.1207 }}
          zoomLevel={12}
          directionsResult={directionsResult}
          routes={routes}
          selectedRouteIndex={selectedRouteIndex}
          restaurants={restaurants}
          searchCircles={searchCircles}
          showBounds={showBounds}
          selectedRestaurant={selectedRestaurant}
          onSelectRestaurant={setSelectedRestaurant}
          onMapClick={() => setIsBottomSheetExpanded(false)}
        />
        {/* Left column: search bar always on top, route panel fills remaining space */}
        <div className="absolute top-4 left-4 right-4 bottom-10 z-10 sm:right-auto sm:w-96 flex flex-col gap-2 pointer-events-none">
          <div className="pointer-events-auto">
            <RouteSearch onSearch={handleGetDirection} isLoading={!routeLib} />
          </div>

          {/* Route Selection Panel — desktop only (mobile uses BottomSheet) */}
          {routes.length > 0 && (
            <div className="hidden sm:flex pointer-events-auto flex-1 min-h-0">
              <RouteSelectionPanel
                routes={routes}
                selectedRouteIndex={selectedRouteIndex}
                onRouteSelect={handleRouteSelect}
                onBack={() => {
                  setRoutes([]);
                  setDirectionsResult(null);
                  setSelectedRouteIndex(null);
                  setRestaurantCache({});
                  setSearchCircleCache({});
                }}
              />
            </div>
          )}
        </div>

        {/* Restaurant Sidebar — desktop only (hidden on mobile via variant prop) */}
        <RestaurantSidebar
          variant="desktop"
          restaurants={restaurants}
          onRestaurantClick={(restaurant) => setSelectedRestaurant(restaurant)}
        />

        {/* Mobile Bottom Sheet — sm:hidden inside BottomSheet, so only shows on mobile */}
        {(() => {
          // Determine what phase we're in so we know what to show
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
                ? `${restaurants.length} restaurant${
                    restaurants.length !== 1 ? "s" : ""
                  }`
                : `${routes.length} route${
                    routes.length !== 1 ? "s" : ""
                  } found`;

          const backHandler = () => {
            setRoutes([]);
            setDirectionsResult(null);
            setSelectedRouteIndex(null);
            setRestaurantCache({});
            setSearchCircleCache({});
          };

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
                  onBack={backHandler}
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
      </div>
    </div>
  );
}

export default function Home() {
  console.log(
    "API Key loaded:",
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? "YES" : "NO",
  );

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <MapContent />
    </APIProvider>
  );
}
