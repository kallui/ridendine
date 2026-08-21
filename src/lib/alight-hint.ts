export type AlightStop = {
  routeShortName?: string;
  headsign?: string;
  vehicleType?: string;
  endpointKind?: "origin" | "destination";
};

/** Numeric bus codes like 49 or 9 get a "Bus" prefix; named lines do not. */
const NUMERIC_LINE = /^\d+[A-Za-z]?$/;
const BUS_VEHICLE = /^(BUS|INTERCITY_BUS|TROLLEYBUS)$/i;

export function formatTransitLineLabel(opts: {
  routeShortName: string;
  headsign?: string;
  vehicleType?: string;
}): string {
  const name = opts.routeShortName.trim();
  if (!name) return "";

  const alreadyPrefixed = /^(bus|train|skytrain)\b/i.test(name);
  const busPrefix =
    !alreadyPrefixed &&
    NUMERIC_LINE.test(name) &&
    BUS_VEHICLE.test(opts.vehicleType ?? "");
  const label = busPrefix ? `Bus ${name}` : name;
  const head = opts.headsign?.trim();
  return head ? `${label} (${head})` : label;
}

function uniqueLinesThrough(
  nearestStopIndex: number,
  stops: AlightStop[],
): AlightStop[] {
  const lines: AlightStop[] = [];
  const end = Math.min(
    Math.max(nearestStopIndex, 0),
    Math.max(stops.length - 1, 0),
  );
  for (let i = 0; i <= end; i++) {
    const name = stops[i]?.routeShortName?.trim();
    if (!name) continue;
    const prev = lines[lines.length - 1];
    if (prev?.routeShortName === name) continue;
    lines.push({
      routeShortName: name,
      headsign: stops[i]?.headsign,
      vehicleType: stops[i]?.vehicleType,
    });
  }
  return lines;
}

function formatLineList(lines: AlightStop[]): string {
  return lines
    .map((line) =>
      formatTransitLineLabel({
        routeShortName: line.routeShortName!,
        headsign: line.headsign,
        vehicleType: line.vehicleType,
      }),
    )
    .join(", then ");
}

/**
 * Compact “how to get off here” line from origin through the restaurant’s stop.
 * Unique consecutive line names only; skips when there is no real stop name.
 * Origin/destination search points use start/end copy — they are not transit stops.
 */
export function formatAlightHint(
  nearestStopName: string,
  nearestStopIndex: number,
  stops: AlightStop[],
): string | null {
  const nearest = stops[nearestStopIndex];
  if (nearest?.endpointKind === "origin") {
    return "Near your start";
  }
  if (nearest?.endpointKind === "destination") {
    const destLines = uniqueLinesThrough(nearestStopIndex, stops);
    if (destLines.length === 0) return "Near your destination";
    return `Take ${formatLineList(destLines)} · near your destination`;
  }

  if (!nearestStopName) return null;

  const lines = uniqueLinesThrough(nearestStopIndex, stops);
  if (lines.length === 0) {
    return `Get off at ${nearestStopName}`;
  }

  return `Take ${formatLineList(lines)} · get off at ${nearestStopName}`;
}
