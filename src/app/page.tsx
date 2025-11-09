"use client";

import Map from "@/components/Map";
import Navbar from "@/components/Navbar";
import RouteSearch from "@/components/RouteSearch";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import { useState } from "react";

function MapContent() {
  const [route, setRoute] = useState<google.maps.DirectionsResult | null>(null);
  const routeLib = useMapsLibrary("routes");

  console.log("routeLib loaded:", !!routeLib);

  const handleGetDirection = (origin: string, destination: string) => {
    console.log("handleGetDirection called with:", { origin, destination });

    if (!routeLib) {
      console.error("routeLib is not loaded yet");
      return;
    }

    const directionsService = new routeLib.DirectionsService();
    console.log("Calling Directions API...");

    directionsService.route(
      {
        origin: origin,
        destination: destination,
        travelMode: routeLib.TravelMode.TRANSIT,
      },
      (result, status) => {
        console.log("API Response:", { status, hasResult: !!result });

        if (status === routeLib.DirectionsStatus.OK && result) {
          console.log("Route found successfully, setting state");
          setRoute(result);
        } else {
          console.error("Error fetching directions. Status:", status);
        }
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
