/** Photo handle from legacy Nearby Search / Place Details. */
export type PlacePhotoRef = {
  photo_reference: string;
  html_attributions?: string[];
  height?: number;
  width?: number;
};

/** Serializable place result from Google Places Nearby Search (REST). */
export type PlaceSearchResult = {
  place_id?: string;
  name?: string;
  geometry?: { location: { lat: number; lng: number } };
  types?: string[];
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  vicinity?: string;
  photos?: PlacePhotoRef[];
};

/** User-contributed Google photo shown in the restaurant gallery. */
export type PlacePhoto = {
  photoReference: string;
  htmlAttributions: string[];
};

export type WaypointInput =
  | string
  | { lat: number; lng: number }
  | { placeId: string };
