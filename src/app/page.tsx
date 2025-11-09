"use client";

import Map from "@/components/Map";
import Navbar from "@/components/Navbar";
import RouteSearch from "@/components/RouteSearch";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import { useState } from "react";
import * as turf from "@turf/turf";

type Restaurant = {
  placeId: string;
  name: string;
  location: { lat: number; lng: number };
  distanceFromRoute: number;
  types: string[];
};

function MapContent() {
  const [route, setRoute] = useState<google.maps.DirectionsResult | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isSearchingRestaurants, setIsSearchingRestaurants] = useState(false);
  const [searchBounds, setSearchBounds] =
    useState<google.maps.LatLngBoundsLiteral | null>(null);
  const [showBounds, setShowBounds] = useState(false);

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

    // Search for restaurants within 500m of route
    searchRestaurants(polylineCoordinates, 500);

    return polylineCoordinates;
  };

  const searchRestaurants = (
    polylineCoordinates: google.maps.LatLngLiteral[],
    searchRadiusMeters: number
  ) => {
    if (!placesLib) {
      console.error("Places library not loaded yet");
      return;
    }

    setIsSearchingRestaurants(true);

    // Calculate bounding box for route
    const maxLat = Math.max(...polylineCoordinates.map((coord) => coord.lat));
    const minLat = Math.min(...polylineCoordinates.map((coord) => coord.lat));
    const maxLng = Math.max(...polylineCoordinates.map((coord) => coord.lng));
    const minLng = Math.min(...polylineCoordinates.map((coord) => coord.lng));

    // Add buffer around route (convert meters to degrees)
    const bufferInDegrees = searchRadiusMeters / 111000;

    const bounds = {
      north: maxLat + bufferInDegrees,
      south: minLat - bufferInDegrees,
      east: maxLng + bufferInDegrees,
      west: minLng - bufferInDegrees,
    };

    // Search for restaurants in bounding box
    const service = new placesLib.PlacesService(document.createElement("div"));
    service.nearbySearch(
      { bounds: bounds, type: "restaurant" },
      (results, status) => {
        if (status === placesLib.PlacesServiceStatus.OK && results) {
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

                // Filter: Keep only within search radius
                if (distance > searchRadiusMeters) {
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
            .filter(
              (restaurant): restaurant is Restaurant => restaurant !== null
            );

          console.log(
            `Found ${restaurants.length} restaurants within ${searchRadiusMeters}m`
          );
          setRestaurants(restaurants);
        } else {
          console.error("Places search failed:", status);
        }

        setIsSearchingRestaurants(false);
      }
    );
  };

  return (
    <div className="h-screen w-screen flex flex-col">
      <Navbar />
      <div className="flex-1 relative">
        <Map
          centerCoordinate={{ lat: 37.7749, lng: -122.4194 }}
          zoomLevel={12}
          route={route}
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
