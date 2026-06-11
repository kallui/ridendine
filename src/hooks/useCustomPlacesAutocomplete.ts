import { useState, useRef, useEffect, useCallback } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { AUTOCOMPLETE_DEBOUNCE_MS } from "@/lib/client/search-guards";

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
  userLocation?: google.maps.LatLngLiteral | null;
}) {
  const [initialInput] = useState(options?.initialInput ?? "");
  const [input, setInput] = useState(options?.initialInput ?? "");
  const [debouncedInput, setDebouncedInput] = useState(options?.initialInput ?? "");
  const [predictions, setPredictions] = useState<AutocompletePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [selectedPrediction, setSelectedPredictionState] =
    useState<AutocompletePrediction | null>(null);
  const placesLib = useMapsLibrary("places");
  const shouldFetchPredictions =
    !!debouncedInput &&
    !!placesLib &&
    !(initialInput && debouncedInput === initialInput);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedInput(input);
    }, AUTOCOMPLETE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [input]);
  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  // Build location bias from passed-in userLocation, falling back to Vancouver
  const locationBias: google.maps.LatLngBoundsLiteral = options?.userLocation
    ? (() => {
        const { lat, lng } = options.userLocation;
        const delta = 0.1;
        return { north: lat + delta, south: lat - delta, east: lng + delta, west: lng - delta };
      })()
    : VANCOUVER_BIAS;

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
      input: debouncedInput,
      sessionToken: sessionTokenRef.current ?? undefined,
      locationBias: locationBias,
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
  }, [debouncedInput, placesLib, shouldFetchPredictions]);

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
