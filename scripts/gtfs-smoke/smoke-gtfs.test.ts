/**
 * Occasional GTFS stop-matching smoke suite (not for CI).
 *
 * Usage:
 *   node scripts/gtfs-smoke/cli.mjs
 *   node scripts/gtfs-smoke/cli.mjs --city=vancouver
 *   node scripts/gtfs-smoke/cli.mjs --id=TL-1
 *   node scripts/gtfs-smoke/cli.mjs --id=TL-1 --restaurants
 *
 * Writes a reviewable report to scripts/gtfs-smoke/reports/last-report.md
 *
 * Pass: among up to 2 Google transit routes, ≥1 yields ≥2 GTFS stops
 * from the expected feed.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { isRouteWithinCommuteLimits } from "@/lib/commute-limits";
import {
  getStepTransit,
  isTransitStep,
} from "@/lib/directions-normalize";
import { GTFS_CITIES, resolveFeedsForPoint } from "@/lib/gtfs-feeds";
import { GTFS_SMOKE_CASES, type GtfsSmokeCase } from "@/lib/gtfs-smoke/cases";
import {
  fetchDirections,
  fetchNearbyRestaurants,
} from "@/lib/server/google-maps";
import {
  getGtfsIndex,
  getStopsBetween,
  type TransitStepInput,
} from "@/lib/server/gtfs";

const MIN_GTFS_STOPS = 2;
const MAX_ROUTES_TO_TRY = 2;
const REPORT_DIR = path.resolve(process.cwd(), "scripts/gtfs-smoke/reports");
const REPORT_PATH = path.join(REPORT_DIR, "last-report.md");

type StopRow = {
  name: string;
  lat: number;
  lng: number;
  routeShortName?: string;
};

type RouteGtfsResult = {
  routeIndex: number;
  googleLineNames: string[];
  transitStepCount: number;
  feedIdsTried: string[];
  gtfsStopCount: number;
  stops: StopRow[];
  matched: boolean;
  detail: string;
  restaurants?: { name: string; vicinity?: string; nearStop: string }[];
};

type CaseReport = {
  id: string;
  intent: string;
  origin: string;
  destination: string;
  expectedFeedId: string;
  passed: boolean;
  notes?: string;
  routes: RouteGtfsResult[];
};

const caseReports: CaseReport[] = [];

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const raw of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  if (hit) return hit.slice(prefix.length);
  const idx = process.argv.indexOf(`--${name}`);
  if (idx >= 0 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith("--")) {
    return process.argv[idx + 1];
  }
  return undefined;
}

function hasFlag(name: string): boolean {
  return (
    process.argv.includes(`--${name}`) ||
    process.env[`SMOKE_${name.toUpperCase()}`] === "true"
  );
}

function latLngFromStopLocation(
  location: unknown,
): { lat: number; lng: number } | null {
  if (!location || typeof location !== "object") return null;
  const loc = location as {
    lat?: number | (() => number);
    lng?: number | (() => number);
  };
  const lat = typeof loc.lat === "function" ? loc.lat() : loc.lat;
  const lng = typeof loc.lng === "function" ? loc.lng() : loc.lng;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function extractTransitSteps(
  route: google.maps.DirectionsRoute,
): TransitStepInput[] {
  const steps: TransitStepInput[] = [];
  for (const leg of route.legs ?? []) {
    for (const step of leg.steps ?? []) {
      if (!isTransitStep(step)) continue;
      const transit = getStepTransit(step);
      const dep = latLngFromStopLocation(transit?.departure_stop?.location);
      const arr = latLngFromStopLocation(transit?.arrival_stop?.location);
      if (!dep || !arr) continue;
      steps.push({
        departureLat: dep.lat,
        departureLng: dep.lng,
        arrivalLat: arr.lat,
        arrivalLng: arr.lng,
        routeShortName:
          transit?.line?.short_name ?? transit?.line?.name ?? "",
      });
    }
  }
  return steps;
}

async function evaluateRouteGtfs(
  route: google.maps.DirectionsRoute,
  routeIndex: number,
  expectedFeedId: string,
  withRestaurants: boolean,
): Promise<RouteGtfsResult> {
  const transitSteps = extractTransitSteps(route);
  const googleLineNames = transitSteps.map(
    (s) => s.routeShortName || "(unnamed)",
  );

  if (transitSteps.length === 0) {
    return {
      routeIndex,
      googleLineNames: [],
      transitStepCount: 0,
      feedIdsTried: [],
      gtfsStopCount: 0,
      stops: [],
      matched: false,
      detail: "no transit steps on route",
    };
  }

  const first = transitSteps[0];
  const feeds = resolveFeedsForPoint(first.departureLat, first.departureLng);
  const feedIdsTried = feeds.map((f) => f.id);

  if (!feeds.some((f) => f.id === expectedFeedId)) {
    return {
      routeIndex,
      googleLineNames,
      transitStepCount: transitSteps.length,
      feedIdsTried,
      gtfsStopCount: 0,
      stops: [],
      matched: false,
      detail: `expected feed "${expectedFeedId}" not resolved for dep (${first.departureLat.toFixed(4)},${first.departureLng.toFixed(4)}); got [${feedIdsTried.join(", ")}]`,
    };
  }

  const feed = feeds.find((f) => f.id === expectedFeedId)!;
  const index = await getGtfsIndex(feed);

  const seen = new Set<string>();
  const stops: StopRow[] = [];
  for (const step of transitSteps) {
    const found = getStopsBetween(index, step);
    for (const s of found) {
      const key = `${s.lat.toFixed(5)},${s.lng.toFixed(5)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      stops.push({
        name: s.name,
        lat: s.lat,
        lng: s.lng,
        routeShortName: s.routeShortName ?? step.routeShortName,
      });
    }
  }

  const gtfsStopCount = stops.length;
  const matched = gtfsStopCount >= MIN_GTFS_STOPS;

  let restaurants: RouteGtfsResult["restaurants"];
  if (withRestaurants && matched && stops.length > 0) {
    restaurants = [];
    const sampleStops = [
      stops[0],
      stops[Math.floor(stops.length / 2)],
      stops[stops.length - 1],
    ].filter(Boolean);
    const uniqueSample = new Map<string, StopRow>();
    for (const s of sampleStops) {
      uniqueSample.set(`${s.lat.toFixed(5)},${s.lng.toFixed(5)}`, s);
    }
    for (const s of uniqueSample.values()) {
      try {
        const places = await fetchNearbyRestaurants(
          { lat: s.lat, lng: s.lng },
          500,
        );
        for (const p of places.slice(0, 3)) {
          restaurants.push({
            name: p.name ?? "(unnamed)",
            vicinity: p.vicinity,
            nearStop: s.name,
          });
        }
      } catch (err) {
        restaurants.push({
          name: `(places error near ${s.name})`,
          vicinity: err instanceof Error ? err.message : String(err),
          nearStop: s.name,
        });
      }
    }
  }

  return {
    routeIndex,
    googleLineNames,
    transitStepCount: transitSteps.length,
    feedIdsTried,
    gtfsStopCount,
    stops,
    matched,
    restaurants,
    detail: matched
      ? `matched ${gtfsStopCount} GTFS stops via ${expectedFeedId}`
      : `only ${gtfsStopCount} GTFS stops (need ≥${MIN_GTFS_STOPS}) via ${expectedFeedId}; Google lines: ${googleLineNames.join(" | ")}`,
  };
}

function formatCaseMarkdown(report: CaseReport): string {
  const lines: string[] = [];
  lines.push(`## ${report.id} — ${report.passed ? "PASS" : "FAIL"}`);
  lines.push("");
  lines.push(`- **Intent:** ${report.intent}`);
  lines.push(`- **OD:** ${report.origin} → ${report.destination}`);
  lines.push(`- **Expected feed:** \`${report.expectedFeedId}\``);
  if (report.notes) lines.push(`- **Notes:** ${report.notes}`);
  lines.push("");

  for (const route of report.routes) {
    lines.push(`### Route [${route.routeIndex}] — ${route.matched ? "matched" : "no match"}`);
    lines.push("");
    lines.push(`- Google line names: ${route.googleLineNames.map((n) => `\`${n}\``).join(", ") || "(none)"}`);
    lines.push(`- Transit steps: ${route.transitStepCount}`);
    lines.push(`- Feeds resolved: ${route.feedIdsTried.map((f) => `\`${f}\``).join(", ") || "(none)"}`);
    lines.push(`- GTFS stops: **${route.gtfsStopCount}**`);
    lines.push(`- Detail: ${route.detail}`);
    lines.push("");

    if (route.stops.length > 0) {
      lines.push("| # | Stop name | Lat | Lng | Line |");
      lines.push("| --- | --- | --- | --- | --- |");
      route.stops.forEach((s, i) => {
        lines.push(
          `| ${i + 1} | ${s.name.replace(/\|/g, "/")} | ${s.lat.toFixed(5)} | ${s.lng.toFixed(5)} | ${s.routeShortName ?? ""} |`,
        );
      });
      lines.push("");
    }

    if (route.restaurants && route.restaurants.length > 0) {
      lines.push("**Sample restaurants (opt-in):**");
      lines.push("");
      lines.push("| Near stop | Restaurant | Vicinity |");
      lines.push("| --- | --- | --- |");
      for (const r of route.restaurants) {
        lines.push(
          `| ${r.nearStop.replace(/\|/g, "/")} | ${r.name.replace(/\|/g, "/")} | ${(r.vicinity ?? "").replace(/\|/g, "/")} |`,
        );
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

function writeReport() {
  mkdirSync(REPORT_DIR, { recursive: true });
  const passed = caseReports.filter((c) => c.passed).length;
  const failed = caseReports.length - passed;
  const header = [
    `# GTFS smoke report`,
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Summary: **${passed} passed**, **${failed} failed**, ${caseReports.length} cases`,
    "",
    "Review stop names below — they should look like real agency stops/stations, not random addresses.",
    "",
    "---",
    "",
  ].join("\n");

  const body = caseReports.map(formatCaseMarkdown).join("\n---\n\n");
  writeFileSync(REPORT_PATH, header + body, "utf8");
  console.log(`\n📄 Report written: ${REPORT_PATH}\n`);
}

loadEnvLocal();

(globalThis as unknown as { google: unknown }).google = {
  maps: {
    TravelMode: {
      TRANSIT: "TRANSIT",
      WALKING: "WALKING",
      DRIVING: "DRIVING",
      BICYCLING: "BICYCLING",
    },
  },
};

const cityFilter = (parseArg("city") ?? process.env.SMOKE_CITY)?.toLowerCase();
const caseFilter = (parseArg("case") ?? process.env.SMOKE_CASE)?.toUpperCase();
const withRestaurants =
  hasFlag("restaurants") || process.env.SMOKE_RESTAURANTS === "true";

const cases = GTFS_SMOKE_CASES.filter((c) => {
  if (cityFilter && c.regionId.toLowerCase() !== cityFilter) return false;
  if (caseFilter && c.id.toUpperCase() !== caseFilter) return false;
  return true;
});

const regionsInRegistry = new Set(GTFS_CITIES.map((c) => c.id));

afterAll(() => {
  if (caseReports.length > 0) writeReport();
});

describe("GTFS smoke (manual / occasional)", () => {
  it("has at least one case selected", () => {
    expect(
      cases.length,
      `No smoke cases matched filters city=${cityFilter ?? "*"} case=${caseFilter ?? "*"}`,
    ).toBeGreaterThan(0);
  });

  it("all selected cases reference registered regions/feeds", () => {
    for (const c of cases) {
      expect(regionsInRegistry.has(c.regionId), c.id).toBe(true);
      const region = GTFS_CITIES.find((r) => r.id === c.regionId)!;
      expect(
        region.feeds.some((f) => f.id === c.expectedFeedId),
        `${c.id} feed ${c.expectedFeedId}`,
      ).toBe(true);
    }
  });

  for (const smokeCase of cases) {
    it(
      `${smokeCase.id}: ${smokeCase.intent} (${smokeCase.origin} → ${smokeCase.destination})`,
      async () => {
        await runSmokeCase(smokeCase);
      },
      600_000,
    );
  }
});

async function runSmokeCase(smokeCase: GtfsSmokeCase) {
  const key =
    process.env.GOOGLE_MAPS_API_KEY ??
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  expect(key, "Set GOOGLE_MAPS_API_KEY in .env.local").toBeTruthy();

  console.log(
    `\n══ ${smokeCase.id} ══ ${smokeCase.origin} → ${smokeCase.destination}`,
  );
  if (withRestaurants) {
    console.log("  (restaurants sampling enabled)");
  }

  const directions = await fetchDirections(
    smokeCase.origin,
    smokeCase.destination,
  );

  expect(
    directions.status,
    directions.error_message ?? `Directions status ${directions.status}`,
  ).toBe("OK");
  expect(directions.routes?.length ?? 0).toBeGreaterThan(0);

  const candidateRoutes = (directions.routes ?? [])
    .map((route, routeIndex) => ({ route, routeIndex }))
    .filter(({ route }) => isRouteWithinCommuteLimits(route))
    .filter(({ route }) => extractTransitSteps(route).length > 0)
    .slice(0, MAX_ROUTES_TO_TRY);

  expect(
    candidateRoutes.length,
    "No transit routes within commute limits",
  ).toBeGreaterThan(0);

  const results: RouteGtfsResult[] = [];
  for (const { route, routeIndex } of candidateRoutes) {
    const result = await evaluateRouteGtfs(
      route,
      routeIndex,
      smokeCase.expectedFeedId,
      withRestaurants,
    );
    results.push(result);

    console.log(
      `  route[${routeIndex}] steps=${result.transitStepCount} gtfsStops=${result.gtfsStopCount} matched=${result.matched}`,
    );
    console.log(`    Google lines: ${result.googleLineNames.join(" | ") || "(none)"}`);
    console.log(`    ${result.detail}`);
    if (result.stops.length > 0) {
      console.log("    GTFS stops:");
      for (const [i, s] of result.stops.entries()) {
        console.log(
          `      ${String(i + 1).padStart(2, " ")}. ${s.name}${s.routeShortName ? `  [${s.routeShortName}]` : ""}`,
        );
      }
    }
    if (result.restaurants && result.restaurants.length > 0) {
      console.log("    Sample restaurants:");
      for (const r of result.restaurants) {
        console.log(`      - ${r.name} (near ${r.nearStop})`);
      }
    }
  }

  const matchedCount = results.filter((r) => r.matched).length;
  const passed = matchedCount >= 1;

  caseReports.push({
    id: smokeCase.id,
    intent: smokeCase.intent,
    origin: smokeCase.origin,
    destination: smokeCase.destination,
    expectedFeedId: smokeCase.expectedFeedId,
    passed,
    notes: smokeCase.notes,
    routes: results,
  });

  expect(
    matchedCount,
    [
      `${smokeCase.id} failed GTFS matching on ${results.length} route(s) tried.`,
      ...results.map((r) => `  - route[${r.routeIndex}]: ${r.detail}`),
      smokeCase.notes ? `  note: ${smokeCase.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  ).toBeGreaterThanOrEqual(1);

  console.log(
    `  ✓ pass (${matchedCount}/${results.length} routes matched with ≥${MIN_GTFS_STOPS} GTFS stops)`,
  );
}
