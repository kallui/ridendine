"use client";

import { Map as GoogleMap, useMap } from "@vis.gl/react-google-maps";
import { useEffect, useRef } from "react";

interface MapProps {
  centerCoordinate: { lat: number; lng: number };
  zoomLevel: number;
  route?: google.maps.DirectionsResult | null;
}

export default function Map({ centerCoordinate, zoomLevel, route }: MapProps) {
  const map = useMap();
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(
    null
  );

  useEffect(() => {
    console.log("Map useEffect triggered:", {
      hasMap: !!map,
      hasRoute: !!route,
    });

    if (!map) return;

    if (!directionsRendererRef.current) {
      console.log("Creating DirectionsRenderer");
      directionsRendererRef.current = new google.maps.DirectionsRenderer();
      directionsRendererRef.current.setMap(map);
    }

    if (route && directionsRendererRef.current) {
      console.log("Setting directions on map");
      directionsRendererRef.current.setDirections(route);
    }
  }, [map, route]);

  return (
    <GoogleMap
      style={{ width: "100vw", height: "100vh" }}
      defaultCenter={centerCoordinate}
      defaultZoom={zoomLevel}
      gestureHandling="greedy"
      disableDefaultUI
    />
  );
}
