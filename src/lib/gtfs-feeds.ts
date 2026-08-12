/**
 * Curated GTFS feed registry for metro regions under active support.
 *
 * Each entry is a transit agency service area (often many municipalities),
 * not a single city. Bounds are approximate boxes used for coverage checks.
 *
 * See docs/COVERED_CITIES.md for which municipalities each feed covers.
 * Verify feeds locally on this branch before merging to master; remove any
 * that fail smoke tests rather than shipping broken coverage.
 *
 * Planned set (this branch): TransLink; TTC + GO; STM + REM; Sound Transit +
 * King County Metro; TriMet; CTA + Pace (Metra after free API key); MBTA; RTD;
 * CapMetro.
 */

export type GtfsBounds = {
  north: number;
  south: number;
  west: number;
  east: number;
};

export type GtfsFeedSource = {
  /** Unique id used for in-memory cache keys */
  id: string;
  /** Agency or operator name */
  name: string;
  url: string;
};

export type GtfsCity = {
  id: string;
  name: string;
  country: string;
  bounds: GtfsBounds;
  feeds: GtfsFeedSource[];
};

/** Metro feeds for this branch. Keep in sync with docs/COVERED_CITIES.md. */
export const GTFS_CITIES: GtfsCity[] = [
  // ── Canada ──────────────────────────────────────────────────────────────
  {
    id: "vancouver",
    name: "Metro Vancouver",
    country: "CA",
    bounds: { north: 49.6, south: 49.0, west: -123.3, east: -122.2 },
    feeds: [
      {
        id: "translink",
        name: "TransLink",
        url: "https://gtfs-static.translink.ca/gtfs/google_transit.zip",
      },
    ],
  },
  {
    id: "toronto",
    name: "Toronto / GTA",
    country: "CA",
    // City + near-core GO (Mississauga / Oakville / Pearson fringe).
    bounds: { north: 43.95, south: 43.45, west: -79.9, east: -79.05 },
    feeds: [
      {
        id: "ttc",
        name: "Toronto Transit Commission",
        url: "https://ckan0.cf.opendata.inter.prod-toronto.ca/dataset/7795b45e-e65a-4465-81fc-c36b9dfff169/resource/cfb6b2b8-6191-41e3-bda1-b175c51148cb/download/TTC%20Routes%20and%20Schedules%20Data.zip",
      },
      {
        id: "go-transit",
        name: "GO Transit",
        url: "https://assets.metrolinx.com/raw/upload/v1683228856/Documents/Metrolinx/Open Data/GO-GTFS.zip",
      },
    ],
  },
  {
    id: "montreal",
    name: "Montreal metro",
    country: "CA",
    // Island + REM branches (e.g. Brossard / Deux-Montagnes fringe).
    bounds: { north: 45.68, south: 45.35, west: -74.05, east: -73.4 },
    feeds: [
      {
        id: "stm",
        name: "Société de transport de Montréal",
        url: "https://www.stm.info/sites/default/files/gtfs/gtfs_stm.zip",
      },
      {
        id: "rem",
        name: "Réseau express métropolitain",
        url: "https://gtfs.gpmmom.ca/gtfs/gtfs.zip",
      },
    ],
  },

  // ── United States ───────────────────────────────────────────────────────
  {
    id: "seattle",
    name: "Seattle / Puget Sound",
    country: "US",
    // Includes Seattle + Eastside (Bellevue/Redmond) for Link 2 Line / Metro.
    bounds: { north: 47.82, south: 47.4, west: -122.44, east: -122.08 },
    feeds: [
      // Sound Transit first so Link exact names ("1 Line", "2 Line") win before
      // Metro fuzzy could treat Google "1 Line" as Metro bus "1".
      {
        id: "sound-transit",
        name: "Sound Transit",
        url: "https://www.soundtransit.org/GTFS-rail/40_gtfs.zip",
      },
      {
        id: "king-county-metro",
        name: "King County Metro",
        url: "http://metro.kingcounty.gov/gtfs/google_transit.zip",
      },
    ],
  },
  {
    id: "portland",
    name: "Portland metro",
    country: "US",
    bounds: { north: 45.65, south: 45.43, west: -122.84, east: -122.47 },
    feeds: [
      {
        id: "trimet",
        name: "TriMet",
        url: "http://developer.trimet.org/schedule/gtfs.zip",
      },
    ],
  },
  {
    id: "chicago",
    name: "Chicago metro",
    country: "US",
    // CTA core + Pace suburbs. Metra (commuter rail) after free API key signup.
    bounds: { north: 42.35, south: 41.45, west: -88.25, east: -87.4 },
    feeds: [
      {
        id: "cta",
        name: "Chicago Transit Authority",
        url: "http://www.transitchicago.com/downloads/sch_data/google_transit.zip",
      },
      {
        id: "pace",
        name: "Pace Suburban Bus",
        url: "https://www.pacebus.com/gtfsdownload",
      },
    ],
  },
  {
    id: "boston",
    name: "Boston",
    country: "US",
    bounds: { north: 42.42, south: 42.23, west: -71.19, east: -70.99 },
    feeds: [
      {
        id: "mbta",
        name: "MBTA",
        url: "https://cdn.mbta.com/MBTA_GTFS.zip",
      },
    ],
  },
  {
    id: "denver",
    name: "Denver / RTD metro",
    country: "US",
    // Includes DIA (east) and southwest rail suburbs (Littleton–Mineral ~39.58).
    bounds: { north: 39.95, south: 39.5, west: -105.15, east: -104.65 },
    feeds: [
      {
        id: "rtd",
        name: "Denver RTD",
        url: "https://www.rtd-denver.com/files/gtfs/google_transit.zip",
      },
    ],
  },
  {
    id: "austin",
    name: "Austin",
    country: "US",
    bounds: { north: 30.51, south: 30.12, west: -97.94, east: -97.56 },
    feeds: [
      {
        id: "capmetro",
        name: "CapMetro",
        // Static schedule zip (r4v4-vz24). Do not use cuc7-ywmd — that dataset is
        // GTFS-Realtime JSON and fflate fails with "invalid zip data".
        url: "https://data.texas.gov/download/r4v4-vz24/application/zip",
      },
    ],
  },
];

export function isWithinBounds(
  lat: number,
  lng: number,
  bounds: GtfsBounds,
): boolean {
  return (
    lat >= bounds.south &&
    lat <= bounds.north &&
    lng >= bounds.west &&
    lng <= bounds.east
  );
}

/** Metro regions whose bounding box contains the point and have at least one feed. */
export function resolveCitiesForPoint(lat: number, lng: number): GtfsCity[] {
  return GTFS_CITIES.filter(
    (city) => city.feeds.length > 0 && isWithinBounds(lat, lng, city.bounds),
  );
}

/** Flat list of feeds for all matching regions (deduped by feed id). */
export function resolveFeedsForPoint(lat: number, lng: number): GtfsFeedSource[] {
  const seen = new Set<string>();
  const feeds: GtfsFeedSource[] = [];

  for (const city of resolveCitiesForPoint(lat, lng)) {
    for (const feed of city.feeds) {
      if (!seen.has(feed.id)) {
        seen.add(feed.id);
        feeds.push(feed);
      }
    }
  }

  return feeds;
}

/** True when the point is inside a registered metro region with GTFS feeds. */
export function hasGtfsCoverage(lat: number, lng: number): boolean {
  return resolveFeedsForPoint(lat, lng).length > 0;
}
