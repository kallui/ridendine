import { useEffect, useRef, useState } from "react";

export function usePlacesAutocomplete() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedPlace, setSelectedPlace] =
    useState<google.maps.places.PlaceResult | null>(null);

  useEffect(() => {
    // Check if input exists
    if (!inputRef.current) return;

    if (typeof google === "undefined") {
      console.log("Google Maps not loaded yet");
      return;
    }

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ["formatted_address", "geometry", "name", "place_id"], // Only get needed fields (saves $)
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      setSelectedPlace(place);
    });

    return () => {
      google.maps.event.clearInstanceListeners(autocomplete);
    };
  }, []);

  return { inputRef, selectedPlace };
}
