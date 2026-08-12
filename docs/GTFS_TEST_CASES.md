# GTFS smoke-test cases

Manual origin → destination pairs for local QA of each registered feed in [`src/lib/gtfs-feeds.ts`](../src/lib/gtfs-feeds.ts).

Use **transit** mode in RideNDine / Google Directions. For each case, confirm:

1. Server loads the expected feed (check logs for feed id).
2. Stop list comes from GTFS (not polyline fallback) — stop names look like real stops/stations.
3. Restaurant search centers sit on those stops.

Mark results in the **Result** column: `pass` / `fail` / `skip`, and note matcher issues (e.g. Google name ≠ GTFS `route_short_name`).

## Automated smoke (occasional — not CI)

Machine-check GTFS stop matching for these cases (no UI):

```bash
# All cases (slow — downloads feeds, calls Google Directions)
npm run smoke:gtfs

# Filtered (call the CLI directly — most reliable on Windows; npm may swallow --flags)
node scripts/gtfs-smoke/cli.mjs --city=vancouver
node scripts/gtfs-smoke/cli.mjs --id=TL-1
node scripts/gtfs-smoke/cli.mjs --city=toronto --id=TTC-1

# Or via env vars
cross-env SMOKE_CITY=vancouver npm run smoke:gtfs
cross-env SMOKE_CASE=TL-1 npm run smoke:gtfs
```

- Requires `GOOGLE_MAPS_API_KEY` in `.env.local`
- Tries up to **2** Google transit route alternatives per case
- **Pass** if ≥1 of those routes yields **≥2** GTFS stops from the expected feed
- Prints all matched **GTFS stop names** to the console
- Always overwrites:
  - `scripts/gtfs-smoke/reports/last-run.log` — full console / vitest log
  - `scripts/gtfs-smoke/reports/last-report.md` — stop-name review tables
- Optional `--restaurants` samples a few nearby places (extra Places API cost)
- Case definitions: [`src/lib/gtfs-smoke/cases.ts`](../src/lib/gtfs-smoke/cases.ts)
- Slow on first run (downloads GTFS zips); feed indexes stay in-process for later cases in the same run

**Design of the 3 cases per feed**

| # | Intent |
|---|--------|
| 1 | Primary rail / rapid corridor (name-matching stress) |
| 2 | Cross-municipality or suburb ↔ core (bounds + regional coverage) |
| 3 | Bus-heavy or secondary corridor (short-name matching) |

---

## TransLink — Metro Vancouver (`translink`)

| ID | Intent | Origin | Destination | Notes |
| --- | --- | --- | --- | --- |
| TL-1 | SkyTrain core | Waterfront Station, Vancouver, BC | Metrotown Station, Burnaby, BC | Expo Line; station naming / “Station” suffix |
| TL-2 | Cross-municipality rail | Commercial-Broadway Station, Vancouver, BC | Richmond–Brighouse Station, Richmond, BC | Canada Line across Vancouver → Richmond |
| TL-3 | Major bus corridor | UBC Bus Loop, Vancouver, BC | Joyce–Collingwood Station, Vancouver, BC | 99 B-Line style corridor; bus short-name match |

---

## TTC + GO — Toronto / GTA (`ttc` + `go-transit`)

| ID | Intent | Origin | Destination | Notes |
| --- | --- | --- | --- | --- |
| TTC-1 | Subway core | Union Station, Toronto, ON | Bloor-Yonge Station, Toronto, ON | Line 1; dense downtown |
| TTC-2 | Cross-city subway | Kipling Station, Toronto, ON | Kennedy Station, Toronto, ON | Line 2 end-to-end-ish; long stop sequence |
| TTC-3 | Streetcar / bus mix | Spadina Station, Toronto, ON | Distillery District, Toronto, ON | Often streetcar-heavy; short-name quirks |
| GO-1 | GO Lakeshore core | Union Station, Toronto, ON | Oakville GO, Oakville, ON | Regional rail via `go-transit` |

---

## STM + REM — Montreal (`stm` + `rem`)

| ID | Intent | Origin | Destination | Notes |
| --- | --- | --- | --- | --- |
| STM-1 | Métro core | Berri-UQAM Station, Montreal, QC | McGill Station, Montreal, QC | Short Green/Orange area hop |
| STM-2 | Cross-island métro | Honoré-Beaugrand Station, Montreal, QC | Angrignon Station, Montreal, QC | Green Line across the island |
| STM-3 | Bus + métro edge | Côte-Vertu Station, Montreal, QC | Jean-Talon Market, Montreal, QC | Orange Line north + local last mile |
| REM-1 | REM light metro | Gare Centrale, Montreal, QC | Brossard Station, Brossard, QC | REM South Shore (not STM) |

---

## Seattle / Puget Sound (`sound-transit` + `king-county-metro`)

| ID | Intent | Origin | Destination | Notes |
| --- | --- | --- | --- | --- |
| SEA-1 | Link light rail spine | Westlake Station, Seattle, WA | University of Washington Station, Seattle, WA | Expect Google `1 Line` / `2 Line` → Sound Transit GTFS |
| SEA-2 | Link Eastside / cross-lake | Bellevue Transit Center, Bellevue, WA | Westlake Station, Seattle, WA | Typically `2 Line`; Bellevue inside metro bounds |
| SEA-3 | Neighborhood bus | Columbia City, Seattle, WA | Downtown Seattle, WA | Metro bus corridor (e.g. `7`); multi-feed matcher tries ST then Metro |

---

## TriMet — Portland metro (`trimet`)

| ID | Intent | Origin | Destination | Notes |
| --- | --- | --- | --- | --- |
| PDX-1 | MAX core | Pioneer Courthouse Square, Portland, OR | Gateway Transit Center, Portland, OR | MAX light rail naming |
| PDX-2 | Cross-metro MAX | Beaverton Transit Center, Beaverton, OR | Gresham Central Transit Center, Gresham, OR | West ↔ east suburb via MAX |
| PDX-3 | Frequent bus | Portland State University, Portland, OR | Alberta Arts District, Portland, OR | Bus-heavy inner-city hop |

---

## CTA + Pace — Chicago metro (`cta` + `pace`)

| ID | Intent | Origin | Destination | Notes |
| --- | --- | --- | --- | --- |
| CTA-1 | L train core | Chicago Union Station, Chicago, IL | The Loop (State/Lake), Chicago, IL | Short downtown L / bus; station naming |
| CTA-2 | Long L corridor | O'Hare Airport, Chicago, IL | The Loop, Chicago, IL | Blue Line; long stop list |
| CTA-3 | South Side / bus+L | Midway Airport, Chicago, IL | Millennium Park, Chicago, IL | Orange Line style corridor |
| PACE-1 | Pace suburban bus | Evanston, IL | Howard Station, Chicago, IL | Suburb ↔ CTA edge; Metra still needs free API key |

---

## MBTA — Boston (`mbta`)

| ID | Intent | Origin | Destination | Notes |
| --- | --- | --- | --- | --- |
| MBTA-1 | Subway core | Harvard Station, Cambridge, MA | South Station, Boston, MA | Red Line trunk; longer OD so Google reliably returns transit |
| MBTA-2 | Cross-branch subway | Alewife Station, Cambridge, MA | Ashmont Station, Boston, MA | Red Line Ashmont branch (multi-pattern trip index) |
| MBTA-3 | Green Line / bus mix | Boston College Station, Boston, MA | Government Center, Boston, MA | Green Line branch naming (B/C/D/E + long names) |

---

## RTD — Denver (`rtd`)

| ID | Intent | Origin | Destination | Notes |
| --- | --- | --- | --- | --- |
| RTD-1 | Rail core | Union Station, Denver, CO | Denver Airport (DEN), Denver, CO | A Line; airport rail naming |
| RTD-2 | Suburb ↔ downtown rail | Littleton–Mineral Station, Littleton, CO | Union Station, Denver, CO | C/D Line southwest; Littleton inside metro bounds |
| RTD-3 | Bus mall / local | Civic Center Station, Denver, CO | Cherry Creek, Denver, CO | Shorter bus-oriented hop |

---

## CapMetro — Austin (`capmetro`)

| ID | Intent | Origin | Destination | Notes |
| --- | --- | --- | --- | --- |
| ATX-1 | Rail / transit spine | Downtown Station (Austin), Austin, TX | Kramer Station, Austin, TX | Red Line / rail naming if offered |
| ATX-2 | North ↔ core | Domain, Austin, TX | Downtown Austin, TX | Common commute; bus or rail |
| ATX-3 | South / bus corridor | South Congress (SoCo), Austin, TX | UT Austin, Austin, TX | Bus-heavy corridor across the river |

---

## Results log (optional)

Copy a row when you run a case:

| Case ID | Date | Result | Feed seen in logs | Notes |
| --- | --- | --- | --- | --- |
| TL-1 | | | | |
| … | | | | |
