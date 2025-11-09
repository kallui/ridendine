"use client";

import Map from "@/components/Map";
import Navbar from "@/components/Navbar";
import RouteSearch from "@/components/RouteSearch";
import { APIProvider } from "@vis.gl/react-google-maps";

export default function Home() {
  console.log(
    "API Key loaded:",
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? "YES ✅" : "NO ❌"
  );

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <div className="h-screen w-screen flex flex-col">
        <Navbar />
        <div className="flex-1 relative">
          <Map
            centerCoordinate={{ lat: 37.7749, lng: -122.4194 }}
            zoomLevel={12}
          />
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-[calc(100%-2rem)] max-w-sm sm:left-4 sm:translate-x-0 sm:w-96">
            <RouteSearch />
          </div>
        </div>
      </div>
    </APIProvider>
  );
}
