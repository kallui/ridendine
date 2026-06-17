import { isWithinMetroVancouver } from "@/lib/geo-bounds";
import {
  getGtfsIndex,
  getStopsBetween,
  type TransitStepInput,
  type TransitStopPoint,
} from "@/lib/server/gtfs";

type RequestBody = {
  steps?: TransitStepInput[];
};

export async function POST(request: Request) {
  let body: RequestBody;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!Array.isArray(body.steps) || body.steps.length === 0) {
    return Response.json({ stops: [] });
  }

  // Only attempt GTFS lookup for Metro Vancouver routes.
  const firstStep = body.steps[0];
  if (!isWithinMetroVancouver(firstStep.departureLat, firstStep.departureLng)) {
    return Response.json({ stops: [] });
  }

  try {
    const index = await getGtfsIndex();

    const seen = new Set<string>();
    const stops: TransitStopPoint[] = [];

    for (const step of body.steps) {
      console.log(
        `[transit-stops] step routeShortName="${step.routeShortName}" ` +
          `dep=(${step.departureLat},${step.departureLng}) arr=(${step.arrivalLat},${step.arrivalLng})`,
      );
      const stepStops = getStopsBetween(index, step);
      console.log(
        `[transit-stops] → ${stepStops.length} stops returned for "${step.routeShortName}"`,
      );
      for (const stop of stepStops) {
        const key = `${stop.lat.toFixed(5)},${stop.lng.toFixed(5)}`;
        if (!seen.has(key)) {
          seen.add(key);
          stops.push(stop);
        }
      }
    }

    return Response.json({ stops });
  } catch (err) {
    // GTFS failure → return empty so the client falls back to polyline sampling
    console.error("[transit-stops] GTFS lookup failed:", err);
    return Response.json({ stops: [] });
  }
}
