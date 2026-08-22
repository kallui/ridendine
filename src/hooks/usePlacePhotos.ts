"use client";

import { useEffect, useState } from "react";
import type { PlacePhoto } from "@/lib/places-types";
import {
  initialPlacePhotos,
  loadPlacePhotos,
} from "@/lib/place-photo-cache";

export function usePlacePhotos(
  placeId: string,
  coverPhotoReference?: string,
): PlacePhoto[] {
  const [photos, setPhotos] = useState<PlacePhoto[]>(() =>
    initialPlacePhotos(placeId, coverPhotoReference),
  );

  useEffect(() => {
    let cancelled = false;

    void loadPlacePhotos(placeId)
      .then((next) => {
        if (!cancelled && next.length > 0) {
          setPhotos(next);
        }
      })
      .catch(() => {
        /* keep cover fallback */
      });

    return () => {
      cancelled = true;
    };
  }, [placeId]);

  return photos;
}
