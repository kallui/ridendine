import type {
  PlacePhoto,
  PlaceSearchResult,
  WaypointInput,
} from "@/lib/places-types";
import { isValidPhotoReference } from "@/lib/place-photo";

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
  next_page_token?: string;
  error_message?: string;
};

/** Google Nearby Search returns up to 20 results per page. */
export const NEARBY_SEARCH_PAGE_SIZE = 20;

/** Legacy Nearby Search allows up to 3 pages (60 results) per circle. */
export const NEARBY_SEARCH_MAX_PAGES = 3;

/**
 * Fetch pages 2–3 of Nearby Search (up to 60 results per circle).
 * Off by default — each extra page is a billable call × every stop on the route.
 * Set NEARBY_SEARCH_PAGINATION=true to enable.
 */
export function isNearbySearchPaginationEnabled(): boolean {
  return process.env.NEARBY_SEARCH_PAGINATION === "true";
}

/** Google requires a short delay before a next_page_token becomes valid. */
export const NEARBY_PAGE_TOKEN_DELAY_MS = 2000;

const NEARBY_PAGE_TOKEN_MAX_RETRIES = 2;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchNearbyPage(
  location: { lat: number; lng: number },
  radius: number,
  pageToken?: string,
): Promise<NearbySearchResponse> {
  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
  );

  if (pageToken) {
    url.searchParams.set("pagetoken", pageToken);
  } else {
    url.searchParams.set("location", `${location.lat},${location.lng}`);
    url.searchParams.set("radius", String(radius));
    url.searchParams.set("type", "restaurant");
  }
  url.searchParams.set("key", getApiKey());

  const response = await fetch(url.toString(), {
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Places API HTTP ${response.status}`);
  }

  return response.json();
}

async function fetchNearbyPageWithTokenRetry(
  location: { lat: number; lng: number },
  radius: number,
  pageToken: string,
): Promise<NearbySearchResponse> {
  let lastData: NearbySearchResponse | undefined;

  for (let attempt = 0; attempt <= NEARBY_PAGE_TOKEN_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(NEARBY_PAGE_TOKEN_DELAY_MS);
    }

    lastData = await fetchNearbyPage(location, radius, pageToken);
    if (lastData.status !== "INVALID_REQUEST") {
      return lastData;
    }
  }

  return lastData!;
}

function shouldFetchNextPage(
  pageResults: PlaceSearchResult[],
  nextPageToken: string | undefined,
  pagesFetched: number,
): boolean {
  if (!isNearbySearchPaginationEnabled()) {
    return false;
  }

  return (
    pagesFetched < NEARBY_SEARCH_MAX_PAGES &&
    pageResults.length === NEARBY_SEARCH_PAGE_SIZE &&
    Boolean(nextPageToken)
  );
}

export async function fetchNearbyRestaurants(
  location: { lat: number; lng: number },
  radius: number,
): Promise<PlaceSearchResult[]> {
  const allResults: PlaceSearchResult[] = [];
  let pageToken: string | undefined;
  let pagesFetched = 0;

  while (pagesFetched < NEARBY_SEARCH_MAX_PAGES) {
    if (pageToken) {
      await sleep(NEARBY_PAGE_TOKEN_DELAY_MS);
    }

    const data = pageToken
      ? await fetchNearbyPageWithTokenRetry(location, radius, pageToken)
      : await fetchNearbyPage(location, radius);

    if (data.status === "ZERO_RESULTS") {
      return pagesFetched === 0 ? [] : allResults;
    }

    if (data.status !== "OK" || !data.results) {
      if (pagesFetched === 0) {
        throw new Error(data.error_message ?? `Places API status: ${data.status}`);
      }
      break;
    }

    allResults.push(...data.results);
    pagesFetched += 1;

    if (!shouldFetchNextPage(data.results, data.next_page_token, pagesFetched)) {
      break;
    }

    pageToken = data.next_page_token;
  }

  return allResults;
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

const MAX_PLACE_PHOTOS = 10;

type PlaceDetailsResponse = {
  status: string;
  result?: {
    photos?: Array<{
      photo_reference?: string;
      html_attributions?: string[];
    }>;
  };
  error_message?: string;
};

/** Photo references for the Google Maps user gallery (up to 10). */
export async function fetchPlacePhotos(placeId: string): Promise<PlacePhoto[]> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "photos");
  url.searchParams.set("key", getApiKey());

  const response = await fetch(url.toString(), {
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    throw new Error(`Place Details HTTP ${response.status}`);
  }

  const data = (await response.json()) as PlaceDetailsResponse;
  if (data.status !== "OK") {
    if (data.status === "ZERO_RESULTS" || data.status === "NOT_FOUND") {
      return [];
    }
    throw new Error(data.error_message ?? `Place Details status: ${data.status}`);
  }

  return (data.result?.photos ?? [])
    .filter(
      (photo): photo is { photo_reference: string; html_attributions?: string[] } =>
        typeof photo.photo_reference === "string" &&
        isValidPhotoReference(photo.photo_reference),
    )
    .slice(0, MAX_PLACE_PHOTOS)
    .map((photo) => ({
      photoReference: photo.photo_reference,
      htmlAttributions: photo.html_attributions ?? [],
    }));
}

export async function fetchPlacePhotoMedia(
  photoReference: string,
  maxWidth: number,
): Promise<{ body: ArrayBuffer; contentType: string }> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/photo");
  url.searchParams.set("photo_reference", photoReference);
  url.searchParams.set("maxwidth", String(maxWidth));
  url.searchParams.set("key", getApiKey());

  const response = await fetch(url.toString(), {
    redirect: "follow",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Place Photo HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    throw new Error("Place Photo did not return an image");
  }

  return {
    body: await response.arrayBuffer(),
    contentType: contentType.split(";")[0]!.trim(),
  };
}
