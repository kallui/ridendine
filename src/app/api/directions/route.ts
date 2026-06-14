import { fetchDirections } from "@/lib/server/google-maps";
import {
  formatCommuteLimitMessage,
  isRouteWithinCommuteLimits,
} from "@/lib/rate-limit-config";
import {
  checkRouteSearchLimit,
  rateLimitResponse,
} from "@/lib/server/rate-limit";
import { getClientIp, getOrCreateSessionId } from "@/lib/server/session";
import type { WaypointInput } from "@/lib/places-types";

type DirectionsRequestBody = {
  origin?: WaypointInput;
  destination?: WaypointInput;
};

export async function POST(request: Request) {
  let body: DirectionsRequestBody;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.origin || !body.destination) {
    return Response.json(
      { error: "missing_fields", message: "Origin and destination are required." },
      { status: 400 },
    );
  }

  const sessionId = await getOrCreateSessionId();
  const identifier = `${getClientIp(request)}:${sessionId}`;
  const rateLimit = await checkRouteSearchLimit(identifier);

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const data = await fetchDirections(body.origin, body.destination);

    if (data.status !== "OK" || !data.routes) {
      return Response.json(
        {
          error: "directions_failed",
          status: data.status,
          message: data.error_message ?? "Could not find a route.",
        },
        { status: 502 },
      );
    }

    const routes = data.routes.filter(isRouteWithinCommuteLimits);

    if (routes.length === 0) {
      return Response.json(
        {
          error: "route_too_long",
          message: formatCommuteLimitMessage(),
        },
        { status: 422 },
      );
    }

    return Response.json({
      status: data.status,
      routes,
      geocoded_waypoints: data.geocoded_waypoints,
      request: data.request,
    });
  } catch (error) {
    console.error("Directions API error:", error);
    return Response.json(
      { error: "directions_error", message: "Failed to fetch directions." },
      { status: 500 },
    );
  }
}
