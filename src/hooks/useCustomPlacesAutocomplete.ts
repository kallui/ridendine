import { useState, useRef, useEffect, useCallback } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";

// Metro Vancouver fallback bounds
const VANCOUVER_BIAS: google.maps.LatLngBoundsLiteral = {
  north: 49.4,
  south: 49.0,
  east: -122.5,
  west: -123.3,
};

export type AutocompletePrediction = {
  description: string;
  place_id: string;
};

export function useCustomPlacesAutocomplete(options?: {
  initialInput?: string;
}) {
  const [initialInput] = useState(options?.initialInput ?? "");
  const [input, setInput] = useState(options?.initialInput ?? "");
  const [predictions, setPredictions] = useState<AutocompletePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [selectedPrediction, setSelectedPredictionState] =
    useState<AutocompletePrediction | null>(null);
  const placesLib = useMapsLibrary("places");
  const shouldFetchPredictions =
    !!input && !!placesLib && !(initialInput && input === initialInput);
  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const locationBiasRef =
    useRef<google.maps.LatLngBoundsLiteral>(VANCOUVER_BIAS);

  // Get user location once for biasing results; falls back to Vancouver
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const delta = 0.1; // ~10 km
      locationBiasRef.current = {
        north: lat + delta,
        south: lat - delta,
        east: lng + delta,
        west: lng - delta,
      };
    });
  }, []);

  // Create a session token once the places library is ready
  useEffect(() => {
    if (!placesLib) return;
    sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
  }, [placesLib]);

  useEffect(() => {
    if (!shouldFetchPredictions) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });

    google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input,
      sessionToken: sessionTokenRef.current ?? undefined,
      locationBias: locationBiasRef.current,
    })
      .then(({ suggestions }) => {
        if (cancelled) return;
        setPredictions(
          suggestions
            .filter((s) => s.placePrediction !== null)
            .map((s) => ({
              description: s.placePrediction!.text.text,
              place_id: s.placePrediction!.placeId,
            })),
        );
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setPredictions([]);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [input, placesLib, shouldFetchPredictions]);

  // Rotate session token after each selection (correct billing grouping)
  const setSelectedPrediction = useCallback(
    (prediction: AutocompletePrediction | null) => {
      setSelectedPredictionState(prediction);
      if (prediction && placesLib) {
        sessionTokenRef.current =
          new google.maps.places.AutocompleteSessionToken();
      }
    },
    [placesLib],
  );

  return {
    input,
    setInput,
    predictions: shouldFetchPredictions ? predictions : [],
    loading: shouldFetchPredictions ? loading : false,
    activeIndex,
    setActiveIndex,
    selectedPrediction,
    setSelectedPrediction,
  };
}
