import { readFile } from "fs/promises";
import path from "path";
import { unzipSync } from "fflate";
import { formatStopName } from "@/lib/format-stop-name";
import type { GtfsFeedSource } from "@/lib/gtfs-feeds";

// ---- Types ----------------------------------------------------------------

type StopInfo = { lat: number; lng: number; name: string };

export type TransitStopPoint = {
  lat: number;
  lng: number;
  name: string;
  routeShortName?: string;
};

type GtfsIndex = {
  /** stop_id → location + name */
  stops: Map<string, StopInfo>;
  /** route_short_name and/or route_long_name aliases → route_ids */
  routesByShortName: Map<string, string[]>;
  /**
   * route_id → direction_id → unique trip patterns (ordered stop_ids).
   * Multiple patterns matter for branching rail (e.g. MBTA Red Line Ashmont vs Braintree).
   */
  routeStops: Map<string, Map<number, string[][]>>;
};

/** Bump when the cooked JSON format changes in the future, so old files are ignored. */
export const GTFS_INDEX_VERSION = 1 as const;

// Type for the cooked JSON map of the GTFS data
export type SerializedGtfsIndex = {
  v: typeof GTFS_INDEX_VERSION;
  stops: Record<string, StopInfo>;
  routesByShortName: Record<string, string[]>;
  routeStops: Record<string, Record<string, string[][]>>;
};

/** True if value is a plain object (not null / array). */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Maps → JSON-safe objects so we can write current.json. */
export function serializeGtfsIndex(idx: GtfsIndex): SerializedGtfsIndex {
  const routeStops: SerializedGtfsIndex["routeStops"] = {};
  for (const [routeId, dirs] of idx.routeStops) {
    const dirObj: Record<string, string[][]> = {};
    for (const [dir, patterns] of dirs) {
      dirObj[String(dir)] = patterns;
    }
    routeStops[routeId] = dirObj;
  }
  return {
    v: GTFS_INDEX_VERSION,
    stops: Object.fromEntries(idx.stops),
    routesByShortName: Object.fromEntries(idx.routesByShortName),
    routeStops,
  };
}

/** JSON-safe objects → Maps; throws if v is missing or not current. */
export function deserializeGtfsIndex(data: unknown): GtfsIndex {
  if (!isRecord(data) || data.v !== GTFS_INDEX_VERSION) {
    throw new Error("invalid or outdated GTFS index JSON");
  }
  if (
    !isRecord(data.stops) ||
    !isRecord(data.routesByShortName) ||
    !isRecord(data.routeStops)
  ) {
    throw new Error("invalid GTFS index JSON");
  }

  const routeStops = new Map<string, Map<number, string[][]>>();
  for (const [routeId, dirs] of Object.entries(data.routeStops)) {
    if (!isRecord(dirs)) continue;
    const dirMap = new Map<number, string[][]>();
    for (const [dir, patterns] of Object.entries(dirs)) {
      if (Array.isArray(patterns))
        dirMap.set(Number(dir), patterns as string[][]);
    }
    routeStops.set(routeId, dirMap);
  }

  return {
    stops: new Map(Object.entries(data.stops)) as Map<string, StopInfo>,
    routesByShortName: new Map(Object.entries(data.routesByShortName)) as Map<
      string,
      string[]
    >,
    routeStops,
  };
}

// ---GTFS LRU  --------------------------------------------------------
const MAX_HOT_FEEDS = Number(process.env.MAX_HOT_FEEDS ?? 3); // max # of feeds inside in memory (RAM)

// LRU = Least Recently Used, we keep the most recently used feeds in memory
// cachedIndexes is a ordered map, with oldest feed at the beginning and newest at the end
function remember(id: string, idx: GtfsIndex) {
  // If feed is already in memory, and used, then move it to the end of map (most recently used)
  cachedIndexes.delete(id);
  cachedIndexes.set(id, idx);

  // If # of feeds in memory is greater than MAX_HOT_FEEDS, then remove oldest feed (first item in map)
  while (cachedIndexes.size > MAX_HOT_FEEDS) {
    const oldest = cachedIndexes.keys().next().value;
    if (oldest === undefined) break;
    cachedIndexes.delete(oldest);
    console.log(`[GTFS] LRU evict ${oldest} (hot=${cachedIndexes.size})`);
  }
}

// ---- Parse mutex --------------------------------------------------------
// Mutex = mutual exclusion: only one parse runs at a time (saves RAM).
// Callers line up. parseLock = "bathroom is free". Starts already free.
let parseLock = Promise.resolve();

function withParseLock<T>(fn: () => Promise<T>): Promise<T> {
  // Wait for whoever is currently parsing, then run fn.
  // 2nd fn = if the previous job failed, still run ours (don't skip the line).
  const run = parseLock.then(fn, fn);

  // Advance the lock to "this job finished". Always resolves, value discarded:
  // - success handler: don't keep the huge GTFS result on the lock (memory)
  // - fail handler: don't leave a rejected lock (that would block everyone forever)
  parseLock = run.then(
    () => undefined,
    () => undefined,
  );
  return run; // caller gets the real result/error; the lock only means "vacant"
}

// ---- Per-feed cache -------------------------------------------------------
const cachedIndexes = new Map<string, GtfsIndex>(); // feeds already parsed (in RAM, LRU-capped)
const loadPromises = new Map<string, Promise<GtfsIndex>>(); // currently loading — 2 TTC requests share 1 parse

export async function getGtfsIndex(feed: GtfsFeedSource): Promise<GtfsIndex> {
  // 1. Already in RAM? Bump LRU (mark as most recently used) and return it.
  const cached = cachedIndexes.get(feed.id);
  if (cached) {
    remember(feed.id, cached);
    return cached;
  }

  // 2. Already loading this feed? Join that in-flight promise (don't start a 2nd parse).
  const inFlight = loadPromises.get(feed.id);
  if (inFlight) return inFlight;

  // 3. First request for this feed: wait our turn on the parse mutex, then load.
  const promise = withParseLock(() => loadGtfs(feed))
    .then((idx) => {
      remember(feed.id, idx); // put in LRU cache
      loadPromises.delete(feed.id); // no longer in-flight
      return idx;
    })
    .catch((err) => {
      loadPromises.delete(feed.id); // failed — drop so a later retry can try again
      throw err;
    });

  loadPromises.set(feed.id, promise); // others arriving now will hit step 2
  return promise;
}

// ---- GTFS loading ---------------------------------------------------------

function findZipEntry(
  files: Record<string, Uint8Array>,
  filename: string,
): Uint8Array | undefined {
  if (files[filename]) return files[filename];

  const suffix = `/${filename}`;
  for (const [path, buf] of Object.entries(files)) {
    if (path.endsWith(suffix) || path === filename) return buf;
  }

  return undefined;
}

async function readGtfsZip(feed: GtfsFeedSource): Promise<Uint8Array> {
  const dir = process.env.GTFS_DIR;
  // Try to read from GTFS dir first, if doesnt exist then fetch from URL (HTTP)
  if (dir) {
    const file = path.join(path.resolve(dir), feed.id, "current.zip");
    console.log(`[GTFS] Reading ${feed.id} from ${file}`);
    return new Uint8Array(await readFile(file));
  }

  console.log(`[GTFS] Fetching ${feed.name} (${feed.id})…`);
  const res = await fetch(feed.url, { next: { revalidate: 0 } });
  if (!res.ok) {
    throw new Error(`GTFS fetch failed for ${feed.id}: HTTP ${res.status}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

export function buildGtfsIndexFromZip(zipBuffer: Uint8Array): GtfsIndex {
  const files = unzipSync(zipBuffer);

  const decode = (name: string): string => {
    const buf = findZipEntry(files, name);
    if (!buf) throw new Error(`GTFS zip is missing expected file: ${name}`);
    return new TextDecoder("utf-8").decode(buf);
  };

  const stops = parseStops(decode("stops.txt"));
  const { routesByShortName, tripInfo } = parseRoutesAndTrips(
    decode("routes.txt"),
    decode("trips.txt"),
  );
  const routeStops = parseStopTimes(decode("stop_times.txt"), tripInfo);
  return { stops, routesByShortName, routeStops };
}

function logReady(feedId: string, idx: GtfsIndex, source: string, ms: number) {
  console.log(
    `[GTFS] Ready (${feedId}) from ${source} — ${idx.stops.size} stops, ${idx.routesByShortName.size} routes (${ms} ms)`,
  );
}

// load the cooked JSON map from .json file, and parse it into a GtfsIndex object
async function loadCookedIndex(
  dir: string,
  feedId: string,
): Promise<GtfsIndex | null> {
  const file = path.join(path.resolve(dir), feedId, "current.json");
  try {
    const idx = deserializeGtfsIndex(JSON.parse(await readFile(file, "utf8")));
    console.log(`[GTFS] Reading ${feedId} from ${file}`);
    return idx;
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? e.code : undefined;
    if (code === "ENOENT") {
      console.log(`[GTFS] no current.json for ${feedId}, parsing zip`);
    } else {
      console.warn(
        `[GTFS] current.json unusable for ${feedId}, parsing zip:`,
        e,
      );
    }
    return null;
  }
}

async function loadGtfs(feed: GtfsFeedSource): Promise<GtfsIndex> {
  const t = Date.now();
  const dir = process.env.GTFS_DIR;

  if (dir) {
    const cooked = await loadCookedIndex(dir, feed.id);
    if (cooked) {
      logReady(feed.id, cooked, "current.json", Date.now() - t);
      return cooked;
    }
  }

  const idx = buildGtfsIndexFromZip(await readGtfsZip(feed));
  logReady(feed.id, idx, "zip", Date.now() - t);
  return idx;
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
function parseCsvRow(line: string, headers: string[]): Record<string, string> {
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
  // routes.txt → name aliases → route_id (short and/or long; MBTA subway
  // often has empty short_name and long_name like "Red Line")
  const routesLines = routesCsv.split("\n");
  const routesHeaders = parseHeader(routesLines[0]);
  const routesByShortName = new Map<string, string[]>();

  const addNameAlias = (name: string, routeId: string) => {
    const key = name.trim();
    if (!key) return;
    const existing = routesByShortName.get(key) ?? [];
    if (!existing.includes(routeId)) existing.push(routeId);
    routesByShortName.set(key, existing);
  };

  for (let i = 1; i < routesLines.length; i++) {
    const line = routesLines[i].trim();
    if (!line) continue;
    const row = parseCsvRow(line, routesHeaders);
    if (!row.route_id) continue;
    const shortName = row.route_short_name?.trim() ?? "";
    const longName = row.route_long_name?.trim() ?? "";
    // Index both so Google "B" and "Green Line B" both resolve.
    if (shortName) addNameAlias(shortName, row.route_id);
    if (longName) addNameAlias(longName, row.route_id);
  }

  // trips.txt → trip_id → { route_id, direction_id }
  const tripsLines = tripsCsv.split("\n");
  const tripsHeaders = parseHeader(tripsLines[0]);
  const tripInfo = new Map<string, { routeId: string; directionId: number }>();

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
): Map<string, Map<number, string[][]>> {
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

  // Pass 2 — keep every unique stop sequence per (route_id, direction_id).
  // Branching lines (MBTA Red Ashmont vs Braintree) need more than the single
  // longest trip or end stations on the shorter branch never match.
  const routeStops = new Map<string, Map<number, string[][]>>();
  const seenSig = new Map<string, Set<string>>();

  for (const [tripId, stops] of allTripStops) {
    const info = tripInfo.get(tripId);
    if (!info) continue;

    stops.sort((a, b) => a.seq - b.seq);
    const stopIds = stops.map((s) => s.stopId);
    if (stopIds.length === 0) continue;

    const sigKey = `${info.routeId}:${info.directionId}`;
    const sig = stopIds.join("\0");
    let sigs = seenSig.get(sigKey);
    if (!sigs) {
      sigs = new Set();
      seenSig.set(sigKey, sigs);
    }
    if (sigs.has(sig)) continue;
    sigs.add(sig);

    const dirMap =
      routeStops.get(info.routeId) ?? new Map<number, string[][]>();
    const patterns = dirMap.get(info.directionId) ?? [];
    patterns.push(stopIds);
    dirMap.set(info.directionId, patterns);
    routeStops.set(info.routeId, dirMap);
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
 * Using the route's own stop list avoids "orphan stop" IDs — stops that exist
 * in stops.txt with coordinates but are not scheduled in any trip's stop_times
 * (e.g. TransLink IDs like JYSES, GVSDS, 99xxx). By searching only the stops
 * that actually belong to this route we always find the correct platform stop,
 * regardless of what other stops are geographically near.
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
 * For each route in routeIds, try every direction/pattern and return the stops
 * between the closest dep and arr (in sequence order). Prefers the pattern that
 * yields the most in-between stops when several match (fuller branch).
 */
function tryRouteIds(
  index: GtfsIndex,
  routeIds: string[],
  depLat: number,
  depLng: number,
  arrLat: number,
  arrLng: number,
): string[] | null {
  let best: string[] | null = null;

  for (const routeId of routeIds) {
    const directions = index.routeStops.get(routeId);
    if (!directions) continue;
    for (const patterns of directions.values()) {
      for (const stopIds of patterns) {
        const dep = findClosestInRoute(index, stopIds, depLat, depLng);
        const arr = findClosestInRoute(index, stopIds, arrLat, arrLng);
        if (dep && arr && dep.idx <= arr.idx) {
          const slice = stopIds.slice(dep.idx, arr.idx + 1);
          if (!best || slice.length > best.length) best = slice;
        }
      }
    }
  }
  return best;
}

/** Matching tiers for getStopsBetween (run in order when several are requested). */
export type GtfsMatchTier = "exact" | "fuzzy" | "scan";

const ALL_MATCH_TIERS: GtfsMatchTier[] = ["exact", "fuzzy", "scan"];

/**
 * Returns every transit stop (in order) between the departure and arrival
 * stops of a single transit step.
 *
 * Three tiers, each using route-aware closest-stop matching to avoid orphan IDs:
 *  1. Exact route short-name lookup.
 *  2. Case-insensitive / substring name match (e.g. "SkyTrain Expo Line" ↔ "Expo Line").
 *  3. Full route scan — ignores route name, finds any route whose stop sequence
 *     runs from a stop near dep to a stop near arr in the right order.
 *
 * Pass `tiers` to run a subset (used so multi-feed metros can try exact on every
 * feed before any feed's fuzzy/scan — e.g. Sound Transit "1 Line" before Metro "1").
 */
export function getStopsBetween(
  index: GtfsIndex,
  step: TransitStepInput,
  options?: { tiers?: GtfsMatchTier[] },
): TransitStopPoint[] {
  const tiers = options?.tiers ?? ALL_MATCH_TIERS;
  const toPoints = (
    stopIds: string[],
    routeShortName?: string,
  ): TransitStopPoint[] =>
    stopIds
      .map((id): TransitStopPoint | null => {
        const s = index.stops.get(id);
        if (!s) return null;
        const point: TransitStopPoint = {
          lat: s.lat,
          lng: s.lng,
          name: formatStopName(s.name),
        };
        if (routeShortName !== undefined) point.routeShortName = routeShortName;
        return point;
      })
      .filter((s): s is TransitStopPoint => s !== null);

  for (const tier of tiers) {
    if (tier === "exact") {
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
          return toPoints(stopIds, step.routeShortName);
        }
      }
      continue;
    }

    if (tier === "fuzzy") {
      if (!step.routeShortName) continue;
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
          return toPoints(stopIds, step.routeShortName);
        }
      }
      continue;
    }

    // tier === "scan"
    console.warn(
      `[GTFS] "${step.routeShortName}" — no name match, trying full route scan ` +
        `dep=(${step.departureLat},${step.departureLng}) arr=(${step.arrivalLat},${step.arrivalLng})`,
    );

    for (const [, directions] of index.routeStops) {
      for (const patterns of directions.values()) {
        for (const stopIds of patterns) {
          const dep = findClosestInRoute(
            index,
            stopIds,
            step.departureLat,
            step.departureLng,
            500,
          );
          const arr = findClosestInRoute(
            index,
            stopIds,
            step.arrivalLat,
            step.arrivalLng,
            500,
          );
          if (dep && arr && dep.idx <= arr.idx) {
            console.log(
              `[GTFS] "${step.routeShortName}" matched via full route scan → ${arr.idx - dep.idx + 1} stops`,
            );
            return toPoints(
              stopIds.slice(dep.idx, arr.idx + 1),
              step.routeShortName,
            );
          }
        }
      }
    }
  }

  if (tiers.length === ALL_MATCH_TIERS.length) {
    console.error(
      `[GTFS] "${step.routeShortName}" — all tiers failed ` +
        `dep=(${step.departureLat},${step.departureLng}) arr=(${step.arrivalLat},${step.arrivalLng})`,
    );
  }
  return [];
}

/**
 * Multi-feed match: try exact on every feed, then fuzzy, then scan.
 * Prevents a weaker fuzzy hit (Metro bus "1") from beating an exact Link name.
 */
export async function getStopsBetweenFeeds(
  feeds: GtfsFeedSource[],
  step: TransitStepInput,
): Promise<{ stops: TransitStopPoint[]; feedId?: string }> {
  for (const tier of ALL_MATCH_TIERS) {
    for (const feed of feeds) {
      try {
        const index = await getGtfsIndex(feed);
        const found = getStopsBetween(index, step, { tiers: [tier] });
        if (found.length > 0) {
          return { stops: found, feedId: feed.id };
        }
      } catch (err) {
        console.warn(`[GTFS] feed ${feed.id} failed (${tier}):`, err);
      }
    }
  }
  return { stops: [] };
}
