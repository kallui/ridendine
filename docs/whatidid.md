# Optimize GTFS load: 17s → 45ms

Worst-case cold load for 5 cities at once. Weekly precompute + JSON on disk, instead of parsing GTFS zips on the request.

## Before

A search needed every stop between Google’s board/alight points. That data lives in agency GTFS, not in Directions.

On a miss we unzipped the feed and parsed huge CSVs (`stop_times.txt` especially) **during the request**. One city: **2–5 seconds**. Only one city could parse at a time (RAM mutex on a 2 GB box). Five cold cities at once: the last person waited for everyone ahead.

LRU kicking cities out of RAM was **not** the slow part. Re-parsing the zip was.

This zip-on-request design also did not fit Vercel serverless: no durable disk, no warm process, easy to hit time/memory limits.

## After

Weekly sync (`npm run sync:gtfs`) still downloads `current.zip`, then cooks the three maps we actually query into `current.json` next to it:

- `stops` — id → lat/lng/name
- `routesByShortName` — “Expo Line” → route ids
- `routeStops` — ordered stop lists per route (including branches)

A request reads JSON into the LRU (~10–15 ms). Missing/old JSON still falls back to parsing the zip.

Data lives **outside git** (`GTFS_DIR`): `./data/gtfs` on a laptop, `/var/lib/ridendine/gtfs` on Lightsail.

## Bench (5 cold cities × 5 requests, all at once)

|                                 | Zip parse | Cooked JSON |
| ------------------------------- | --------- | ----------- |
| One city (e.g. TransLink / TTC) | 2–5 s     | 11–15 ms    |
| Last city in line (TriMet)      | ~17 s     | 45 ms       |
| Whole burst (25 requests)       | **17 s**  | **45 ms**   |

Same-city extras still share one load. Mutex still lines cities up; each turn is now a JSON read. LRU still evicts RAM copies — reloading is cheap.

JSON is also small: TransLink **~1 MB** vs **16 MB** zip; STM **~0.9 MB** vs **43 MB** zip.

## Commands

```bash
npm run sync:gtfs         # download zips + cook JSON
npm run sync:gtfs-index   # cook JSON from zips you already have
npm run bench:gtfs-load   # worst-case timing (not CI)
```
