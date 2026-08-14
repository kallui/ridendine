/**
 * Worst-case GTFS load bench (not CI).
 *
 * 5 cold cities × 5 concurrent getGtfsIndex calls, all started together.
 * Same-city waiters share loadPromises; different cities queue on the parse mutex.
 *
 *   npm run bench:gtfs-load
 *
 * Env (optional):
 *   GTFS_DIR=./data/gtfs   (also read from .env.local)
 *   MAX_HOT_FEEDS=3
 *   BENCH_CITIES=5
 *   BENCH_REQUESTS=5
 */
import { existsSync, readFileSync } from "fs";
import { access } from "fs/promises";
import path from "path";

function loadEnvLocal() {
  const file = path.resolve(".env.local");
  if (!existsSync(file)) return;
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
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

loadEnvLocal();
process.env.GTFS_DIR ??= "./data/gtfs";
process.env.MAX_HOT_FEEDS ??= "3";

const CITY_COUNT = Number(process.env.BENCH_CITIES ?? 5);
const REQUESTS = Number(process.env.BENCH_REQUESTS ?? 5);

async function zipExists(dir: string, feedId: string) {
  try {
    await access(path.join(path.resolve(dir), feedId, "current.zip"));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const dir = process.env.GTFS_DIR!;
  const { GTFS_CITIES } = await import("../src/lib/gtfs-feeds");
  const { getGtfsIndex } = await import("../src/lib/server/gtfs");

  const feeds = [];
  for (const city of GTFS_CITIES) {
    const feed = city.feeds[0];
    if (!feed) continue;
    if (!(await zipExists(dir, feed.id))) {
      console.warn(`skip ${city.id} (${feed.id}) — no current.zip`);
      continue;
    }
    feeds.push({ cityId: city.id, cityName: city.name, feed });
    if (feeds.length >= CITY_COUNT) break;
  }

  if (feeds.length === 0) {
    console.error(
      `No zips under ${path.resolve(dir)}. Run: npx tsx scripts/sync-gtfs.ts`,
    );
    process.exit(1);
  }

  console.log(
    `bench: ${feeds.length} cities × ${REQUESTS} concurrent requests (all at once)`,
  );
  console.log(
    `GTFS_DIR=${path.resolve(dir)} MAX_HOT_FEEDS=${process.env.MAX_HOT_FEEDS}`,
  );
  console.log(`feeds: ${feeds.map((f) => f.feed.id).join(", ")}`);
  console.log("");

  type Row = {
    city: string;
    feed: string;
    n: number;
    started: number;
    ms: number;
    ok: boolean;
    error?: string;
  };

  const jobs: Array<(wall0: number) => Promise<Row>> = [];
  for (const f of feeds) {
    for (let n = 1; n <= REQUESTS; n++) {
      const city = f.cityId;
      const feedId = f.feed.id;
      const feed = f.feed;
      jobs.push(async (wall0) => {
        const started = Date.now() - wall0;
        try {
          await getGtfsIndex(feed);
          return {
            city,
            feed: feedId,
            n,
            started,
            ms: Date.now() - wall0 - started,
            ok: true,
          };
        } catch (e) {
          return {
            city,
            feed: feedId,
            n,
            started,
            ms: Date.now() - wall0 - started,
            ok: false,
            error: e instanceof Error ? e.message : String(e),
          };
        }
      });
    }
  }

  const wall0 = Date.now();
  const rows = await Promise.all(jobs.map((j) => j(wall0)));
  const wallMs = Date.now() - wall0;

  console.log(
    "city".padEnd(14),
    "feed".padEnd(20),
    "n".padStart(2),
    "start".padStart(6),
    "wait_ms".padStart(10),
    "ok",
  );
  for (const r of [...rows].sort((a, b) => a.ms - b.ms || a.feed.localeCompare(b.feed))) {
    console.log(
      r.city.padEnd(14),
      r.feed.padEnd(20),
      String(r.n).padStart(2),
      String(r.started).padStart(6),
      String(r.ms).padStart(10),
      r.ok ? "ok" : `FAIL ${r.error}`,
    );
  }

  console.log(
    "\nper city (min / max / avg wait_ms) — same-city waiters should cluster (shared parse)",
  );
  for (const f of feeds) {
    const group = rows.filter((r) => r.feed === f.feed.id && r.ok);
    if (group.length === 0) continue;
    const times = group.map((r) => r.ms);
    const sum = times.reduce((a, b) => a + b, 0);
    console.log(
      `  ${f.feed.id.padEnd(20)} min=${Math.min(...times)} max=${Math.max(...times)} avg=${Math.round(sum / times.length)}`,
    );
  }

  const failed = rows.filter((r) => !r.ok).length;
  console.log(
    `\nwall clock: ${wallMs} ms  (${failed} failed / ${rows.length} requests)`,
  );
  console.log(
    "expect: cities finish one after another (parse mutex); LRU evict logs after MAX_HOT_FEEDS",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
