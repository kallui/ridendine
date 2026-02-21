import { useEffect, useState, useCallback } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";

// Metro Vancouver bounding box — fallback if geolocation is denied
const VANCOUVER_BOUNDS = {
  north: 49.4,
  south: 49.0,
  east: -122.5,
  west: -123.3,
};

// Builds a LatLngBounds centered on a point with a ~10km radius box
function makeBoundsAround(
  lat: number,
  lng: number,
): google.maps.LatLngBoundsLiteral {
  const delta = 0.1; // ~10km
  return {
    north: lat + delta,
    south: lat - delta,
    east: lng + delta,
    west: lng - delta,
  };
}

export function usePlacesAutocomplete() {
  const [inputEl, setInputEl] = useState<HTMLInputElement | null>(null);
  const inputRef = useCallback(
    (el: HTMLInputElement | null) => setInputEl(el),
    [],
  );

  const [selectedPlace, setSelectedPlace] =
    useState<google.maps.places.PlaceResult | null>(null);
  const placesLib = useMapsLibrary("places");

  // Get user's location once for bounds bias. Starts as Vancouver fallback.
  const [bounds, setBounds] =
    useState<google.maps.LatLngBoundsLiteral>(VANCOUVER_BOUNDS);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setBounds(makeBoundsAround(pos.coords.latitude, pos.coords.longitude)),
      () => {}, // silently keep Vancouver fallback on denial
    );
  }, []);

  useEffect(() => {
    if (!inputEl || !placesLib) return;

    const autocomplete = new placesLib.Autocomplete(inputEl, {
      fields: ["formatted_address", "geometry", "name", "place_id"],
      bounds: new google.maps.LatLngBounds(
        { lat: bounds.south, lng: bounds.west },
        { lat: bounds.north, lng: bounds.east },
      ),
      strictBounds: false,
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      setSelectedPlace(place);
    });

    return () => {
      google.maps.event.clearInstanceListeners(autocomplete);
    };
  }, [inputEl, placesLib, bounds]);

  return { inputRef, selectedPlace };
}
