import type { PlaceSearchResult, WaypointInput } from "@/lib/places-types";

function getApiKey(): string {
  const key =
    process.env.GOOGLE_MAPS_API_KEY ??
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) {
    throw new Error("GOOGLE_MAPS_API_KEY is not configured");
  }
  return key;
}

export function formatWaypoint(waypoint: WaypointInput): string {
  if (typeof waypoint === "string") {
    return waypoint;
  }
  if ("placeId" in waypoint) {
    return `place_id:${waypoint.placeId}`;
  }
  return `${waypoint.lat},${waypoint.lng}`;
}

type DirectionsApiResponse = {
  status: string;
  routes?: google.maps.DirectionsRoute[];
  geocoded_waypoints?: google.maps.DirectionsGeocodedWaypoint[];
  request?: google.maps.DirectionsRequest;
  error_message?: string;
};

export async function fetchDirections(
  origin: WaypointInput,
  destination: WaypointInput,
): Promise<DirectionsApiResponse> {
  const url = new URL(
    "https://maps.googleapis.com/maps/api/directions/json",
  );
  url.searchParams.set("origin", formatWaypoint(origin));
  url.searchParams.set("destination", formatWaypoint(destination));
  url.searchParams.set("mode", "transit");
  url.searchParams.set("alternatives", "true");
  url.searchParams.set("key", getApiKey());

  const response = await fetch(url.toString(), {
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Directions API HTTP ${response.status}`);
  }

  return response.json();
}

type NearbySearchResponse = {
  status: string;
  results?: PlaceSearchResult[];
  error_message?: string;
};

export async function fetchNearbyRestaurants(
  location: { lat: number; lng: number },
  radius: number,
): Promise<PlaceSearchResult[]> {
  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
  );
  url.searchParams.set("location", `${location.lat},${location.lng}`);
  url.searchParams.set("radius", String(radius));
  url.searchParams.set("type", "restaurant");
  url.searchParams.set("key", getApiKey());

  const response = await fetch(url.toString(), {
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Places API HTTP ${response.status}`);
  }

  const data: NearbySearchResponse = await response.json();

  if (data.status === "ZERO_RESULTS") {
    return [];
  }

  if (data.status !== "OK" || !data.results) {
    throw new Error(data.error_message ?? `Places API status: ${data.status}`);
  }

  return data.results;
}

/**
 * Runs many Google Nearby Search calls for one user restaurant fetch.
 * Rate limiting counts this whole batch as a single user action.
 */
export async function fetchNearbyRestaurantsBatch(
  points: { lat: number; lng: number }[],
  radius: number,
  concurrency = 3,
): Promise<PlaceSearchResult[]> {
  const byPlaceId = new Map<string, PlaceSearchResult>();
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < points.length) {
      const index = nextIndex;
      nextIndex += 1;
      const point = points[index];

      try {
        const results = await fetchNearbyRestaurants(point, radius);
        results.forEach((place) => {
          if (place.place_id) {
            byPlaceId.set(place.place_id, place);
          }
        });
      } catch (error) {
        console.error("Nearby search failed for point", point, error);
      }
    }
  };

  const workerCount = Math.min(concurrency, points.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return Array.from(byPlaceId.values());
}
