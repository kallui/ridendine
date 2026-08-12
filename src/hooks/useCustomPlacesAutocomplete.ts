import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { AUTOCOMPLETE_DEBOUNCE_MS } from "@/lib/search-config";

export type AutocompletePrediction = {
  description: string;
  place_id: string;
};

/** ~10km box around a point for Places locationBias. */
function biasAround(
  lat: number,
  lng: number,
): google.maps.LatLngBoundsLiteral {
  const delta = 0.1;
  return {
    north: lat + delta,
    south: lat - delta,
    east: lng + delta,
    west: lng - delta,
  };
}

/**
 * Places autocomplete for origin/destination.
 * Biases toward GPS when available; otherwise omits locationBias so results
 * are not stuck on a single metro (e.g. old Vancouver-only fallback).
 */
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

  const locationBias = useMemo((): google.maps.LatLngBoundsLiteral | undefined => {
    if (!options?.userLocation) return undefined;
    const { lat, lng } = options.userLocation;
    return biasAround(lat, lng);
  }, [options?.userLocation]);

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

    const request: google.maps.places.AutocompleteRequest = {
      input: debouncedInput,
      sessionToken: sessionTokenRef.current ?? undefined,
    };
    if (locationBias) {
      request.locationBias = locationBias;
    }

    google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(
      request,
    )
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
  }, [debouncedInput, placesLib, shouldFetchPredictions, locationBias]);

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
