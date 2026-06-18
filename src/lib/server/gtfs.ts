import RBush from "rbush";
import { unzipSync } from "fflate";

const GTFS_URL =
  "https://gtfs-static.translink.ca/gtfs/google_transit.zip";

// ---- Types ----------------------------------------------------------------

type StopInfo = { lat: number; lng: number; name: string };

interface RBushStopItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  stopId: string;
}

export type TransitStopPoint = { lat: number; lng: number; name: string };

type GtfsIndex = {
  /** stop_id → location + name */
  stops: Map<string, StopInfo>;
  /** Spatial index for nearest-stop lookups */
  tree: RBush<RBushStopItem>;
  /** route_short_name → route_ids (usually one, but can be several) */
  routesByShortName: Map<string, string[]>;
  /** route_id → direction_id (0 | 1) → ordered stop_ids */
  routeStops: Map<string, Map<number, string[]>>;
};

// ---- Singleton cache -------------------------------------------------------

let cachedIndex: GtfsIndex | null = null;
let loadPromise: Promise<GtfsIndex> | null = null;

export async function getGtfsIndex(): Promise<GtfsIndex> {
  if (cachedIndex) return cachedIndex;
  if (loadPromise) return loadPromise;

  loadPromise = loadGtfs()
    .then((idx) => {
      cachedIndex = idx;
      loadPromise = null;
      return idx;
    })
    .catch((err) => {
      loadPromise = null;
      throw err;
    });

  return loadPromise;
}

// ---- GTFS loading ---------------------------------------------------------

async function loadGtfs(): Promise<GtfsIndex> {
  const t = Date.now();
  console.log("[GTFS] Fetching TransLink GTFS zip…");

  const res = await fetch(GTFS_URL, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`GTFS fetch failed: HTTP ${res.status}`);

  const zipBuffer = new Uint8Array(await res.arrayBuffer());
  const files = unzipSync(zipBuffer);

  const decode = (name: string): string => {
    const buf = files[name];
    if (!buf) throw new Error(`GTFS zip is missing expected file: ${name}`);
    return new TextDecoder("utf-8").decode(buf);
  };

  console.log("[GTFS] Parsing CSV files…");

  const stops = parseStops(decode("stops.txt"));
  const { routesByShortName, tripInfo } = parseRoutesAndTrips(
    decode("routes.txt"),
    decode("trips.txt"),
  );
  const routeStops = parseStopTimes(decode("stop_times.txt"), tripInfo);

  // Build spatial index (bulk-load is much faster than individual inserts)
  const tree = new RBush<RBushStopItem>();
  const items: RBushStopItem[] = [];
  for (const [stopId, { lat, lng }] of stops) {
    items.push({ minX: lng, minY: lat, maxX: lng, maxY: lat, stopId });
  }
  tree.load(items);

  const ms = Date.now() - t;
  console.log(
    `[GTFS] Ready — ${stops.size} stops, ${routesByShortName.size} routes (${ms} ms)`,
  );

  return { stops, tree, routesByShortName, routeStops };
}

// ---- CSV helpers ----------------------------------------------------------

/** Split a CSV header line into trimmed column names. */
function parseHeader(line: string): string[] {
  return line
    .replace(/\r$/, "")
    .split(",")
    .map((h) => h.trim().replace(/^"|"$/g, ""));
}

/**
 * Parse a single CSV data line into an object keyed by header names.
 * Handles quoted fields that contain commas.
 */
function parseCsvRow(
  line: string,
  headers: string[],
): Record<string, string> {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  values.push(current.trim());

  const row: Record<string, string> = {};
  headers.forEach((h, i) => {
    row[h] = values[i] ?? "";
  });
  return row;
}

// ---- File parsers ----------------------------------------------------------

function parseStops(csv: string): Map<string, StopInfo> {
  const lines = csv.split("\n");
  const headers = parseHeader(lines[0]);
  const result = new Map<string, StopInfo>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const row = parseCsvRow(line, headers);
    const lat = parseFloat(row.stop_lat);
    const lng = parseFloat(row.stop_lon);
    if (!isNaN(lat) && !isNaN(lng)) {
      result.set(row.stop_id, { lat, lng, name: row.stop_name ?? "" });
    }
  }

  return result;
}

function parseRoutesAndTrips(
  routesCsv: string,
  tripsCsv: string,
): {
  routesByShortName: Map<string, string[]>;
  tripInfo: Map<string, { routeId: string; directionId: number }>;
} {
  // routes.txt → route_id ↔ short_name
  const routesLines = routesCsv.split("\n");
  const routesHeaders = parseHeader(routesLines[0]);
  const routesByShortName = new Map<string, string[]>();

  for (let i = 1; i < routesLines.length; i++) {
    const line = routesLines[i].trim();
    if (!line) continue;
    const row = parseCsvRow(line, routesHeaders);
    const shortName =
      row.route_short_name?.trim() || row.route_long_name?.trim() || "";
    if (!shortName || !row.route_id) continue;
    const existing = routesByShortName.get(shortName) ?? [];
    existing.push(row.route_id);
    routesByShortName.set(shortName, existing);
  }

  // trips.txt → trip_id → { route_id, direction_id }
  const tripsLines = tripsCsv.split("\n");
  const tripsHeaders = parseHeader(tripsLines[0]);
  const tripInfo = new Map<
    string,
    { routeId: string; directionId: number }
  >();

  for (let i = 1; i < tripsLines.length; i++) {
    const line = tripsLines[i].trim();
    if (!line) continue;
    const row = parseCsvRow(line, tripsHeaders);
    if (!row.trip_id || !row.route_id) continue;
    tripInfo.set(row.trip_id, {
      routeId: row.route_id,
      directionId: parseInt(row.direction_id ?? "0", 10) || 0,
    });
  }

  return { routesByShortName, tripInfo };
}

function parseStopTimes(
  csv: string,
  tripInfo: Map<string, { routeId: string; directionId: number }>,
): Map<string, Map<number, string[]>> {
  const lines = csv.split("\n");
  const headers = parseHeader(lines[0]);

  // Pass 1 — collect stop sequences for every trip
  const allTripStops = new Map<
    string,
    Array<{ seq: number; stopId: string }>
  >();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const row = parseCsvRow(line, headers);
    const { trip_id: tripId, stop_id: stopId, stop_sequence: seqStr } = row;
    if (!tripId || !stopId) continue;
    const seq = parseInt(seqStr, 10);
    if (isNaN(seq)) continue;

    let arr = allTripStops.get(tripId);
    if (!arr) {
      arr = [];
      allTripStops.set(tripId, arr);
    }
    arr.push({ seq, stopId });
  }

  // Pass 2 — for each (route_id, direction_id), keep the canonical trip
  // (the one that serves the most stops, i.e. the full-length trip).
  const bestTrip = new Map<string, { tripId: string; count: number }>();

  for (const [tripId, stops] of allTripStops) {
    const info = tripInfo.get(tripId);
    if (!info) continue;
    const key = `${info.routeId}:${info.directionId}`;
    const current = bestTrip.get(key);
    if (!current || stops.length > current.count) {
      bestTrip.set(key, { tripId, count: stops.length });
    }
  }

  // Build final index: route_id → Map<direction_id → stop_ids[]>
  const routeStops = new Map<string, Map<number, string[]>>();

  for (const [key, { tripId }] of bestTrip) {
    const colonIdx = key.indexOf(":");
    const routeId = key.slice(0, colonIdx);
    const directionId = parseInt(key.slice(colonIdx + 1), 10);

    const stops = allTripStops.get(tripId) ?? [];
    stops.sort((a, b) => a.seq - b.seq);
    const stopIds = stops.map((s) => s.stopId);

    const dirMap = routeStops.get(routeId) ?? new Map<number, string[]>();
    dirMap.set(directionId, stopIds);
    routeStops.set(routeId, dirMap);
  }

  return routeStops;
}

// ---- Public query API -----------------------------------------------------

export type TransitStepInput = {
  departureLat: number;
  departureLng: number;
  arrivalLat: number;
  arrivalLng: number;
  routeShortName: string;
};

/**
 * Within a single route's stop sequence, find the stop closest to (lat, lng).
 *
 * Using the route's own stop list (not the global R-tree) avoids "orphan stop"
 * IDs — stops that exist in stops.txt with coordinates but are not scheduled in
 * any trip's stop_times (e.g. TransLink IDs like JYSES, GVSDS, 99xxx).  By
 * searching only the stops that actually belong to this route we always find the
 * correct platform stop, regardless of what other stops are geographically near.
 *
 * Returns null when the closest stop exceeds maxDistM (default 1 km).
 */
function findClosestInRoute(
  index: GtfsIndex,
  stopIds: string[],
  lat: number,
  lng: number,
  maxDistM = 1_000,
): { idx: number; stopId: string } | null {
  let bestDist = Infinity;
  let bestIdx = -1;
  let bestStopId = "";

  for (let i = 0; i < stopIds.length; i++) {
    const s = index.stops.get(stopIds[i]);
    if (!s) continue;
    const dLat = (lat - s.lat) * 111_320;
    const dLng = (lng - s.lng) * 111_320 * Math.cos(s.lat * (Math.PI / 180));
    const d = Math.sqrt(dLat * dLat + dLng * dLng);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
      bestStopId = stopIds[i];
    }
  }

  if (bestIdx === -1 || bestDist > maxDistM) return null;
  return { idx: bestIdx, stopId: bestStopId };
}

/**
 * For each route in routeIds, try both directions and return the stops between
 * the closest dep stop and closest arr stop (in sequence order).
 */
function tryRouteIds(
  index: GtfsIndex,
  routeIds: string[],
  depLat: number,
  depLng: number,
  arrLat: number,
  arrLng: number,
): string[] | null {
  for (const routeId of routeIds) {
    const directions = index.routeStops.get(routeId);
    if (!directions) continue;
    for (const stopIds of directions.values()) {
      const dep = findClosestInRoute(index, stopIds, depLat, depLng);
      const arr = findClosestInRoute(index, stopIds, arrLat, arrLng);
      if (dep && arr && dep.idx <= arr.idx) {
        return stopIds.slice(dep.idx, arr.idx + 1);
      }
    }
  }
  return null;
}

/**
 * Returns every transit stop (in order) between the departure and arrival
 * stops of a single transit step.
 *
 * Three tiers, each using route-aware closest-stop matching to avoid orphan IDs:
 *  1. Exact route short-name lookup.
 *  2. Case-insensitive / substring name match (e.g. "SkyTrain Expo Line" ↔ "Expo Line").
 *  3. Full route scan — ignores route name, finds any route whose stop sequence
 *     runs from a stop near dep to a stop near arr in the right order.
 */
export function getStopsBetween(
  index: GtfsIndex,
  step: TransitStepInput,
): TransitStopPoint[] {
  const toPoints = (stopIds: string[]): TransitStopPoint[] =>
    stopIds
      .map((id) => {
        const s = index.stops.get(id);
        return s ? { lat: s.lat, lng: s.lng, name: s.name } : null;
      })
      .filter((s): s is TransitStopPoint => s !== null);

  // Tier 1 — exact short-name match
  const exactIds = index.routesByShortName.get(step.routeShortName) ?? [];
  if (exactIds.length > 0) {
    const stopIds = tryRouteIds(
      index,
      exactIds,
      step.departureLat,
      step.departureLng,
      step.arrivalLat,
      step.arrivalLng,
    );
    if (stopIds) {
      console.log(
        `[GTFS] "${step.routeShortName}" matched exactly → ${stopIds.length} stops`,
      );
      return toPoints(stopIds);
    }
  }

  // Tier 2 — case-insensitive / substring name match
  if (step.routeShortName) {
    const needleLower = step.routeShortName.toLowerCase();
    const fuzzyIds: string[] = [];
    for (const [storedName, ids] of index.routesByShortName) {
      const hayLower = storedName.toLowerCase();
      if (
        hayLower === needleLower ||
        hayLower.includes(needleLower) ||
        needleLower.includes(hayLower)
      ) {
        fuzzyIds.push(...ids);
      }
    }
    if (fuzzyIds.length > 0) {
      const stopIds = tryRouteIds(
        index,
        fuzzyIds,
        step.departureLat,
        step.departureLng,
        step.arrivalLat,
        step.arrivalLng,
      );
      if (stopIds) {
        console.log(
          `[GTFS] "${step.routeShortName}" matched via fuzzy name → ${stopIds.length} stops`,
        );
        return toPoints(stopIds);
      }
    }
  }

  // Tier 3 — full route scan: find any route whose stop sequence runs
  // from a stop near dep to a stop near arr in order.
  console.warn(
    `[GTFS] "${step.routeShortName}" — no name match, trying full route scan ` +
      `dep=(${step.departureLat},${step.departureLng}) arr=(${step.arrivalLat},${step.arrivalLng})`,
  );

  for (const [, directions] of index.routeStops) {
    for (const stopIds of directions.values()) {
      const dep = findClosestInRoute(index, stopIds, step.departureLat, step.departureLng, 500);
      const arr = findClosestInRoute(index, stopIds, step.arrivalLat, step.arrivalLng, 500);
      if (dep && arr && dep.idx <= arr.idx) {
        console.log(
          `[GTFS] "${step.routeShortName}" matched via full route scan → ${arr.idx - dep.idx + 1} stops`,
        );
        return toPoints(stopIds.slice(dep.idx, arr.idx + 1));
      }
    }
  }

  console.error(
    `[GTFS] "${step.routeShortName}" — all tiers failed ` +
      `dep=(${step.departureLat},${step.departureLng}) arr=(${step.arrivalLat},${step.arrivalLng})`,
  );
  return [];
}
