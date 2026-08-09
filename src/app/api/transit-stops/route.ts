import { hasGtfsCoverage, resolveFeedsForPoint } from "@/lib/gtfs-feeds";
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

  const firstStep = body.steps[0];
  if (!hasGtfsCoverage(firstStep.departureLat, firstStep.departureLng)) {
    return Response.json({ stops: [] });
  }

  const feeds = resolveFeedsForPoint(
    firstStep.departureLat,
    firstStep.departureLng,
  );
  if (feeds.length === 0) {
    return Response.json({ stops: [] });
  }

  try {
    const seen = new Set<string>();
    const stops: TransitStopPoint[] = [];

    for (const step of body.steps) {
      console.log(
        `[transit-stops] step routeShortName="${step.routeShortName}" ` +
          `dep=(${step.departureLat},${step.departureLng}) arr=(${step.arrivalLat},${step.arrivalLng})`,
      );

      let stepStops: TransitStopPoint[] = [];

      for (const feed of feeds) {
        try {
          const index = await getGtfsIndex(feed);
          const found = getStopsBetween(index, step);
          if (found.length > 0) {
            stepStops = found;
            console.log(
              `[transit-stops] → ${found.length} stops from ${feed.id} for "${step.routeShortName}"`,
            );
            break;
          }
        } catch (err) {
          console.warn(`[transit-stops] feed ${feed.id} failed for step:`, err);
        }
      }

      if (stepStops.length === 0) {
        console.log(
          `[transit-stops] → 0 stops returned for "${step.routeShortName}"`,
        );
      }

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
    console.error("[transit-stops] GTFS lookup failed:", err);
    return Response.json({ stops: [] });
  }
}
