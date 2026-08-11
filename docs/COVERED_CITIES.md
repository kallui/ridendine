# Covered cities / metro areas

Source of truth for **which municipalities each GTFS feed covers**.

- Runtime registry (bounds + URLs): [`src/lib/gtfs-feeds.ts`](../src/lib/gtfs-feeds.ts)
- One feed usually covers a **region**, not a single city
- Bounds in code are approximate service-area boxes, not legal municipal borders
- Smoke-test each feed locally on this branch before merging to master; remove rows/feeds that fail

| Status | GTFS / data source | Agency | Municipalities / areas covered |
| --- | --- | --- | --- |
| Verified | [TransLink static GTFS](https://gtfs-static.translink.ca/gtfs/google_transit.zip) | TransLink | Metro Vancouver service area, including Vancouver, Burnaby, Richmond, Surrey, New Westminster, Coquitlam, Port Coquitlam, Port Moody, Belcarra, Anmore, North Vancouver (City & District), West Vancouver, Bowen Island, Lions Bay, Pitt Meadows, Maple Ridge, Langley (City & Township), White Rock, Delta, Tsawwassen First Nation, and University Endowment Lands / UBC. Regional modes in the static feed include bus, SeaBus, SkyTrain, and West Coast Express where published. |
| Pending local QA | [TTC GTFS](https://www.toronto.ca/city-government/data-research-maps/open-data/) | Toronto Transit Commission (TTC) | City of Toronto (subway, streetcar, bus). Does not replace GO Transit / regional agencies outside TTC. |
| Pending local QA | [STM GTFS](https://www.stm.info/en/about/developers) | Société de transport de Montréal (STM) | Island of Montréal / STM network (métro, bus). Neighboring ARTMs (e.g. Laval, Longueuil) are separate feeds not included yet. |
| Pending local QA | [King County Metro GTFS](https://kingcounty.gov/en/dept/metro) | King County Metro | King County bus service centered on Seattle, including Seattle, Bellevue, and other Metro-served cities in the county. Sound Transit Link/rail may require additional feeds not registered yet. |
| Pending local QA | [TriMet GTFS](https://developer.trimet.org/) | TriMet | Portland metro district: Portland, Beaverton, Gresham, Hillsboro, and other TriMet-served cities in the Oregon metro area (bus, MAX, WES where in feed). |
| Pending local QA | [CTA GTFS](https://www.transitchicago.com/developers/) | Chicago Transit Authority (CTA) | City of Chicago and CTA service area (L train, bus). Metra / Pace are separate and not included yet. |
| Pending local QA | [MBTA GTFS](https://www.mbta.com/developers/gtfs) | MBTA | Greater Boston MBTA service area (subway, bus, ferry, Commuter Rail where in the static feed), spanning Boston and many surrounding municipalities. |
| Pending local QA | [RTD GTFS](https://www.rtd-denver.com/open-records) | Denver RTD | Denver metro RTD district (bus and rail), including Denver and surrounding RTD member cities/counties in the published feed. |
| Pending local QA | [CapMetro GTFS](https://www.capmetro.org/) | CapMetro | Greater Austin CapMetro service area (bus and rail where published), centered on Austin and nearby served communities. |

## Workflow

1. Keep candidate feeds in `src/lib/gtfs-feeds.ts` so you can run the app locally and smoke-test.
2. Test trips across the **metro**, not only downtown (e.g. Vancouver ↔ Richmond). Use the origin/destination pairs in [`GTFS_TEST_CASES.md`](GTFS_TEST_CASES.md).
3. Mark the row **Verified** here when it passes; remove feed + row if it fails and you are not fixing it yet.
4. Before merging to master, prefer only **Verified** rows (or explicitly accept Pending ones you have personally checked).
