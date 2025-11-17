"use client";

import Map from "@/components/Map";
import Navbar from "@/components/Navbar";
import RouteSearch from "@/components/RouteSearch";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import { useState } from "react";
import * as turf from "@turf/turf";

export type Restaurant = {
  placeId: string;
  name: string;
  location: { lat: number; lng: number };
  distanceFromRoute: number;
  types: string[];
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
  const [route, setRoute] = useState<google.maps.DirectionsResult | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isSearchingRestaurants, setIsSearchingRestaurants] = useState(false);
  const [searchCircles, setSearchCircles] = useState<SearchCircle[]>([]);
  const [showBounds, setShowBounds] = useState(true);

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
      },
      (result, status) => {
        if (status === routeLib.DirectionsStatus.OK && result) {
          setRoute(result);
          extractPolylineFromRoute(result);
        } else {
          console.error("Error fetching directions:", status);
        }
      }
    );
  };

  const extractPolylineFromRoute = (result: google.maps.DirectionsResult) => {
    const steps = result.routes[0].legs[0].steps;

    // Extract coordinates from all steps (walking + transit)
    const polylineCoordinates = steps
      .filter((step) => step.path && step.path.length > 0)
      .flatMap((step) =>
        step.path.map((coord) => ({
          lat: coord.lat(),
          lng: coord.lng(),
        }))
      );

    // Search for restaurants within 1000m of route
    searchRestaurants(polylineCoordinates, turfFilterDistance);

    return polylineCoordinates;
  };

  const searchRestaurants = (
    polylineCoordinates: google.maps.LatLngLiteral[],
    filterDistance: number
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

    // Store search circles for visualization (show API search radius)
    const circles: SearchCircle[] = searchPoints.map((center) => ({
      center,
      radius: apiSearchRadius,
    }));
    setSearchCircles(circles);

    console.log(
      `Route is ${routeLength.toFixed(1)}km, will make ${
        searchPoints.length
      } Places API calls`
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
              filterDistance
            );
          }
        }
      );
    });
  };

  const processAllResults = (
    results: google.maps.places.PlaceResult[],
    polylineCoordinates: google.maps.LatLngLiteral[],
    filterDistance: number
  ) => {
    console.log(
      `Collected ${results.length} unique restaurants from all searches`
    );

    // Validate coordinates
    const validCoordinates = polylineCoordinates.filter(
      (c) =>
        typeof c.lat === "number" &&
        typeof c.lng === "number" &&
        !isNaN(c.lat) &&
        !isNaN(c.lng)
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
            { units: "meters" }
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
          };
        } catch {
          // Silently skip restaurants that cause errors
          return null;
        }
      })
      .filter((restaurant): restaurant is Restaurant => restaurant !== null);

    console.log(
      `Searched ${apiSearchRadius}m radius, filtered to ${restaurants.length} restaurants within ${filterDistance}m of route`
    );
    setRestaurants(restaurants);
    setIsSearchingRestaurants(false);
  };

  return (
    <div className="h-screen w-screen flex flex-col">
      <Navbar />
      <div className="flex-1 relative">
        <Map
          centerCoordinate={{ lat: 37.7749, lng: -122.4194 }}
          zoomLevel={12}
          route={route}
          restaurants={restaurants}
          searchCircles={searchCircles}
          showBounds={showBounds}
        />
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-[calc(100%-2rem)] max-w-sm sm:left-4 sm:translate-x-0 sm:w-96">
          <RouteSearch onSearch={handleGetDirection} isLoading={!routeLib} />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  console.log(
    "API Key loaded:",
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? "YES" : "NO"
  );

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <MapContent />
    </APIProvider>
  );
}
