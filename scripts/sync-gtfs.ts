/**
 * Download agency GTFS zips and cook them into current.json indexes.
 *
 *   npx tsx scripts/sync-gtfs.ts
 *   npx tsx scripts/sync-gtfs.ts --index-only   (rebuild JSON from existing zips)
 *
 * Weekly cook runs on GitHub Actions (sync-gtfs.yml), then rsyncs to Lightsail.
 */
import { existsSync } from "fs";
import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import { unzipSync } from "fflate";
import { GTFS_CITIES } from "../src/lib/gtfs-feeds";
import {
  buildGtfsIndexFromZip,
  serializeGtfsIndex,
} from "../src/lib/server/gtfs";

const LIGHTSAIL_DIR = "/var/lib/ridendine/gtfs";
const LOCAL_DIR = "./data/gtfs";
const ROOT = existsSync(LIGHTSAIL_DIR) ? LIGHTSAIL_DIR : LOCAL_DIR;
const REQUIRED = ["stops.txt", "routes.txt", "trips.txt", "stop_times.txt"];
const ATTEMPTS = 3;
const INDEX_ONLY = process.argv.includes("--index-only");

function log(msg: string) {
  console.log(`[GTFS] ${msg}`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(label: string, fn: () => Promise<void>) {
  let last: unknown;
  for (let i = 1; i <= ATTEMPTS; i++) {
    try {
      await fn();
      return;
    } catch (e) {
      last = e;
      console.warn(`[GTFS] retry ${i}/${ATTEMPTS} ${label}:`, e);
      if (i < ATTEMPTS) await sleep(2000 * i);
    }
  }
  throw last;
}

function hasGtfsFiles(zipBytes: Uint8Array): boolean {
  const files = unzipSync(zipBytes);
  const names = Object.keys(files);
  return REQUIRED.every((need) =>
    names.some((n) => n === need || n.endsWith("/" + need)),
  );
}

async function rotateCurrent(
  dir: string,
  ext: "zip" | "json",
  contents: Uint8Array | string,
) {
  const incoming = path.join(dir, `incoming.${ext}`);
  const current = path.join(dir, `current.${ext}`);
  const previous = path.join(dir, `previous.${ext}`);

  await writeFile(incoming, contents);

  try {
    await rename(current, previous);
  } catch {
    /* no current yet */
  }
  await rename(incoming, current);
}

async function writeCookedIndex(id: string, zipBytes: Uint8Array) {
  const dir = path.join(ROOT, id);
  log(`Cooking ${id}`);
  const idx = buildGtfsIndexFromZip(zipBytes);
  await rotateCurrent(dir, "json", JSON.stringify(serializeGtfsIndex(idx)));
}

async function syncFeed(id: string, url: string) {
  const dir = path.join(ROOT, id);
  await mkdir(dir, { recursive: true });

  log(`Downloading ${id} zip`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());

  if (!hasGtfsFiles(bytes)) throw new Error("not a valid GTFS zip");

  await rotateCurrent(dir, "zip", bytes);
  await writeCookedIndex(id, bytes);
}

async function indexExisting(id: string) {
  const file = path.join(ROOT, id, "current.zip");
  const bytes = new Uint8Array(await readFile(file));
  await writeCookedIndex(id, bytes);
}

async function main() {
  log(`${path.resolve(ROOT)}${INDEX_ONLY ? " (--index-only)" : ""}`);

  const passed: string[] = [];
  const failed: string[] = [];

  for (const city of GTFS_CITIES) {
    for (const feed of city.feeds) {
      try {
        if (INDEX_ONLY) {
          await indexExisting(feed.id);
        } else {
          await withRetry(feed.id, () => syncFeed(feed.id, feed.url));
        }
        log(`OK ${feed.id}`);
        passed.push(feed.id);
      } catch (e) {
        console.error(`[GTFS] FAIL ${feed.id}`, e);
        failed.push(feed.id);
      }
    }
  }

  const total = passed.length + failed.length;
  if (failed.length === 0) {
    log(`All ${total} passed`);
  } else {
    log(`${passed.length} passed, ${failed.length} failed`);
    log("failed:");
    for (const id of failed) log(`- ${id}`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("[GTFS]", e);
  process.exit(1);
});
