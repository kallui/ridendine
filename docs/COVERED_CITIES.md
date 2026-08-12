# Covered cities / metro areas

Source of truth for **which municipalities each GTFS feed covers**.

- Runtime registry (bounds + URLs): [`src/lib/gtfs-feeds.ts`](../src/lib/gtfs-feeds.ts)
- One feed usually covers a **region**, not a single city
- Bounds in code are approximate service-area boxes, not legal municipal borders
- Follow-ups (Metra, Pierce/CT, STL/RTL, AWS): [`TODO.md`](TODO.md)

| Status | GTFS / data source | Agency | Municipalities / areas covered |
| --- | --- | --- | --- |
| Verified | [TransLink static GTFS](https://gtfs-static.translink.ca/gtfs/google_transit.zip) | TransLink | Metro Vancouver service area, including Vancouver, Burnaby, Richmond, Surrey, New Westminster, Coquitlam, Port Coquitlam, Port Moody, Belcarra, Anmore, North Vancouver (City & District), West Vancouver, Bowen Island, Lions Bay, Pitt Meadows, Maple Ridge, Langley (City & Township), White Rock, Delta, Tsawwassen First Nation, and University Endowment Lands / UBC. Regional modes in the static feed include bus, SeaBus, SkyTrain, and West Coast Express where published. |
| Verified | [TTC](https://www.toronto.ca/city-government/data-research-maps/open-data/) + [GO Transit](https://assets.metrolinx.com/raw/upload/v1683228856/Documents/Metrolinx/Open%20Data/GO-GTFS.zip) | TTC + GO | Toronto / near-GTA: TTC city network + GO regional rail/bus where Google uses GO. |
| Verified | [STM](https://www.stm.info/en/about/developers) + [REM](https://gtfs.gpmmom.ca/gtfs/gtfs.zip) | STM + REM | Montréal island (STM) + REM light metro. STL/RTL (Laval/Longueuil) not registered yet. |
| Verified | [Sound Transit](https://www.soundtransit.org/GTFS-rail/40_gtfs.zip) + [King County Metro](https://kingcounty.gov/en/dept/metro) | Sound Transit + Metro | Seattle / Puget Sound: Link/Sounder/T Line + Metro buses. Pierce / Community Transit later. |
| Verified | [TriMet GTFS](https://developer.trimet.org/) | TriMet | Portland metro (bus, MAX, WES). |
| Verified | [CTA](https://www.transitchicago.com/developers/) + [Pace](https://www.pacebus.com/gtfsdownload) | CTA + Pace | Chicago L/bus + Pace suburban bus. **Metra**: free API key + license at [metra.com/developers](https://www.metra.com/developers) — add after signup (not paid). |
| Verified | [MBTA GTFS](https://www.mbta.com/developers/gtfs) | MBTA | Greater Boston (subway, bus, ferry, Commuter Rail in static feed). |
| Verified | [RTD GTFS](https://www.rtd-denver.com/open-records) | Denver RTD | Denver / RTD metro including DIA and Littleton–Mineral. |
| Verified | [CapMetro GTFS](https://data.texas.gov/dataset/CapMetro-GTFS/r4v4-vz24) | CapMetro | Austin CapMetro (bus + MetroRail). Static `r4v4-vz24` only. |

## Workflow

1. Keep feeds in `src/lib/gtfs-feeds.ts`; smoke with [`GTFS_TEST_CASES.md`](GTFS_TEST_CASES.md) / `npm run smoke:gtfs`.
2. Mark **Verified** after smoke + UI QA; remove feed + row if abandoned.
3. Prefer only **Verified** rows on `master`.
