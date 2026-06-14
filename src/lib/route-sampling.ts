import * as turf from "@turf/turf";

export type RouteSamplingConfig = {
  searchIntervalKm: number;
  apiSearchRadiusM: number;
};

export function computeSearchPoints(
  polylineCoordinates: google.maps.LatLngLiteral[],
  config: RouteSamplingConfig,
): google.maps.LatLngLiteral[] {
  const turfCoords = polylineCoordinates.map((c) => [c.lng, c.lat]);
  const routeLine = turf.lineString(turfCoords);
  const routeLength = turf.length(routeLine, { units: "kilometers" });

  const candidateDistancesKm: number[] = [];
  for (
    let distance = 0;
    distance < routeLength;
    distance += config.searchIntervalKm
  ) {
    candidateDistancesKm.push(distance);
  }
  candidateDistancesKm.push(routeLength);

  const minCenterSpacingKm = Math.max(
    config.searchIntervalKm * 0.6,
    (config.apiSearchRadiusM / 1000) * 1.15,
  );
  const searchPoints: google.maps.LatLngLiteral[] = [];

  const shouldAddCenter = (center: google.maps.LatLngLiteral) => {
    const candidatePoint = turf.point([center.lng, center.lat]);
    return !searchPoints.some((existing) => {
      const existingPoint = turf.point([existing.lng, existing.lat]);
      const centerDistanceKm = turf.distance(candidatePoint, existingPoint, {
        units: "kilometers",
      });
      return centerDistanceKm < minCenterSpacingKm;
    });
  };

  candidateDistancesKm.forEach((distance) => {
    const point = turf.along(routeLine, distance, { units: "kilometers" });
    const [lng, lat] = point.geometry.coordinates;
    const center = { lat, lng };
    if (shouldAddCenter(center)) {
      searchPoints.push(center);
    }
  });

  if (searchPoints.length === 0) {
    const point = turf.along(routeLine, 0, { units: "kilometers" });
    const [lng, lat] = point.geometry.coordinates;
    searchPoints.push({ lat, lng });
  }

  return searchPoints;
}
