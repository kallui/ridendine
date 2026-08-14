import { mkdir, rename, writeFile } from "fs/promises";
import path from "path";
import { unzipSync } from "fflate";
import { GTFS_CITIES } from "../src/lib/gtfs-feeds";

const ROOT = process.env.GTFS_DIR ?? "/var/lib/ridendine/gtfs";
const REQUIRED = ["stops.txt", "routes.txt", "trips.txt", "stop_times.txt"];
const ATTEMPTS = 3;

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
      console.warn(`retry ${i}/${ATTEMPTS} ${label}:`, e);
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

async function syncFeed(id: string, url: string) {
  const dir = path.join(ROOT, id);
  await mkdir(dir, { recursive: true });

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());

  if (!hasGtfsFiles(bytes)) throw new Error("not a valid GTFS zip");

  const incoming = path.join(dir, "incoming.zip");
  const current = path.join(dir, "current.zip");
  const previous = path.join(dir, "previous.zip");

  await writeFile(incoming, bytes);

  // last-good: current → previous, then incoming → current
  try {
    await rename(current, previous);
  } catch {
    /* no current yet */
  }
  await rename(incoming, current);
}

async function main() {
  for (const city of GTFS_CITIES) {
    for (const feed of city.feeds) {
      try {
        await withRetry(feed.id, () => syncFeed(feed.id, feed.url));
        console.log("ok", feed.id);
      } catch (e) {
        console.error("FAIL", feed.id, e);
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

