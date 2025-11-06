"use client";

import { useEffect, useRef } from "react";

interface MapProps {
  centerCoordinate: { lat: number; lng: number };
  zoomLevel: number;
}

export default function Map({ centerCoordinate, zoomLevel }: MapProps) {
  // Ref for the map container
  const mapRef = useRef<HTMLDivElement>(null);
  // Ref for the map instance
  const mapInstanceRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    // Make sure the container exists
    if (!mapRef.current) return;

    // Make sure Google Maps is loaded
    if (typeof google === "undefined") {
      console.log("Google Maps not loaded yet");
      return;
    }

    // Create the map - SIMPLE approach, no importLibrary!
    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: centerCoordinate,
      zoom: zoomLevel,
      mapTypeControl: false,
    });

    console.log("Map created!", mapInstanceRef.current);

    return () => {
      mapInstanceRef.current = null;
    };
  }, [centerCoordinate, zoomLevel]);

  return (
    <div ref={mapRef} className="w-full h-full" aria-label="Interactive map" />
  );
}
