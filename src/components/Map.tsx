"use client";

import { Map as GoogleMap } from "@vis.gl/react-google-maps";
interface MapProps {
  centerCoordinate: { lat: number; lng: number };
  zoomLevel: number;
}

export default function Map({ centerCoordinate, zoomLevel }: MapProps) {
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
