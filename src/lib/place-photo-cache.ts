import type { PlacePhoto } from "@/lib/places-types";

const cache = new Map<string, PlacePhoto[]>();
const inflight = new Map<string, Promise<PlacePhoto[]>>();

export function getCachedPlacePhotos(placeId: string): PlacePhoto[] | undefined {
  return cache.get(placeId);
}

export function coverAsPhotos(coverPhotoReference?: string): PlacePhoto[] {
  if (!coverPhotoReference) return [];
  return [{ photoReference: coverPhotoReference, htmlAttributions: [] }];
}

export function initialPlacePhotos(
  placeId: string,
  coverPhotoReference?: string,
): PlacePhoto[] {
  const cached = getCachedPlacePhotos(placeId);
  if (cached && cached.length > 0) return cached;
  return coverAsPhotos(coverPhotoReference);
}

export async function loadPlacePhotos(placeId: string): Promise<PlacePhoto[]> {
  const cached = cache.get(placeId);
  if (cached) return cached;

  const pending = inflight.get(placeId);
  if (pending) return pending;

  const request = fetch(
    `/api/places/details?placeId=${encodeURIComponent(placeId)}`,
  )
    .then(async (response) => {
      if (!response.ok) {
        throw new Error("Failed to load place photos");
      }
      const data = (await response.json()) as { photos?: PlacePhoto[] };
      const photos = data.photos ?? [];
      cache.set(placeId, photos);
      return photos;
    })
    .finally(() => {
      inflight.delete(placeId);
    });

  inflight.set(placeId, request);
  return request;
}
