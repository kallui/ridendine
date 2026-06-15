export function createRoute(overrides?: {
  durationSec?: number;
  distanceM?: number;
  steps?: google.maps.DirectionsStep[];
}): google.maps.DirectionsRoute {
  const durationSec = overrides?.durationSec ?? 1800;
  const distanceM = overrides?.distanceM ?? 10_000;

  return {
    legs: [
      {
        duration: { value: durationSec, text: `${durationSec / 60} mins` },
        distance: { value: distanceM, text: `${distanceM / 1000} km` },
        steps: overrides?.steps ?? [],
        start_location: { lat: 40.7128, lng: -74.006 },
        end_location: { lat: 40.758, lng: -73.9855 },
      },
    ],
  } as unknown as google.maps.DirectionsRoute;
}

export function createLongRoute(): google.maps.DirectionsRoute {
  return createRoute({ durationSec: 7200, distanceM: 80_000 });
}
