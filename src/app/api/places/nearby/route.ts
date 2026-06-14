import { fetchNearbyRestaurantsBatch } from "@/lib/server/google-maps";

type NearbyRequestBody = {
  points?: { lat: number; lng: number }[];
  radius?: number;
};

export async function POST(request: Request) {
  let body: NearbyRequestBody;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.points?.length) {
    return Response.json(
      { error: "missing_fields", message: "At least one search point is required." },
      { status: 400 },
    );
  }

  if (body.points.length > 25) {
    return Response.json(
      { error: "too_many_points", message: "Too many search points in one request." },
      { status: 400 },
    );
  }

  const radius = body.radius ?? 1300;
  if (radius < 100 || radius > 5000) {
    return Response.json(
      { error: "invalid_radius", message: "Radius must be between 100 and 5000 meters." },
      { status: 400 },
    );
  }

  try {
    const places = await fetchNearbyRestaurantsBatch(body.points, radius);
    return Response.json({ places });
  } catch (error) {
    console.error("Places API error:", error);
    return Response.json(
      { error: "places_error", message: "Failed to fetch restaurants." },
      { status: 500 },
    );
  }
}
