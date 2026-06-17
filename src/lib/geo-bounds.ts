/** Approximate bounding box for the TransLink service area (Metro Vancouver). */
const METRO_VANCOUVER_BOUNDS = {
  north: 49.6,
  south: 49.0,
  west: -123.3,
  east: -122.2,
};

export function isWithinMetroVancouver(lat: number, lng: number): boolean {
  return (
    lat >= METRO_VANCOUVER_BOUNDS.south &&
    lat <= METRO_VANCOUVER_BOUNDS.north &&
    lng >= METRO_VANCOUVER_BOUNDS.west &&
    lng <= METRO_VANCOUVER_BOUNDS.east
  );
}
