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
};

export type WaypointInput =
  | string
  | { lat: number; lng: number }
  | { placeId: string };
