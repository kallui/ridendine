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
 * Planned set (this branch): TransLink, TTC, STM, King County Metro, TriMet,
 * CTA, MBTA, RTD, CapMetro. Not included: NYC, LA/SF multi-feed, Asia, etc.
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
    name: "Toronto",
    country: "CA",
    bounds: { north: 43.95, south: 43.58, west: -79.64, east: -79.12 },
    feeds: [
      {
        id: "ttc",
        name: "Toronto Transit Commission",
        url: "https://ckan0.cf.opendata.inter.prod-toronto.ca/dataset/7795b45e-e65a-4465-81fc-c36b9dfff169/resource/cfb6b2b8-6191-41e3-bda1-b175c51148cb/download/TTC%20Routes%20and%20Schedules%20Data.zip",
      },
    ],
  },
  {
    id: "montreal",
    name: "Montreal",
    country: "CA",
    bounds: { north: 45.7, south: 45.41, west: -73.95, east: -73.47 },
    feeds: [
      {
        id: "stm",
        name: "Société de transport de Montréal",
        url: "https://www.stm.info/sites/default/files/gtfs/gtfs_stm.zip",
      },
    ],
  },

  // ── United States ───────────────────────────────────────────────────────
  {
    id: "seattle",
    name: "Seattle / King County",
    country: "US",
    bounds: { north: 47.78, south: 47.48, west: -122.44, east: -122.22 },
    feeds: [
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
    name: "Chicago",
    country: "US",
    bounds: { north: 42.07, south: 41.64, west: -87.94, east: -87.52 },
    feeds: [
      {
        id: "cta",
        name: "Chicago Transit Authority",
        url: "http://www.transitchicago.com/downloads/sch_data/google_transit.zip",
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
    name: "Denver",
    country: "US",
    bounds: { north: 39.92, south: 39.61, west: -105.11, east: -104.73 },
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
        url: "https://data.texas.gov/download/cuc7-ywmd/application%2Fzip",
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
