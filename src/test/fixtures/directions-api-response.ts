import { createRoute } from "@/test/fixtures/directions-route";

export function createDirectionsApiResponse(
  route?: google.maps.DirectionsRoute,
) {
  return {
    status: "OK",
    routes: [route ?? createRoute()],
    geocoded_waypoints: [],
    request: {},
  };
}

export function createDirectionsApiFailure(status = "ZERO_RESULTS") {
  return {
    status,
    error_message: "No route found.",
  };
}
