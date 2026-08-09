/**
 * Curated GTFS feed registry for supported cities.
 *
 * Each city defines a bounding box and one or more agency GTFS zip URLs.
 * Add or edit entries here — no database or external API required.
 *
 * Feed URLs are official open-data endpoints from each transit agency.
 * Cities without a public GTFS feed are listed for reference; they fall back
 * to polyline sampling until a feed URL is added.
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

/** All supported cities, grouped by region for easy browsing. */
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
    id: "los-angeles",
    name: "Los Angeles",
    country: "US",
    bounds: { north: 34.35, south: 33.7, west: -118.67, east: -117.65 },
    feeds: [
      {
        id: "la-metro-bus",
        name: "LA Metro Bus",
        url: "https://gitlab.com/LACMTA/gtfs_bus/-/raw/master/gtfs_bus.zip",
      },
      {
        id: "la-metro-rail",
        name: "LA Metro Rail",
        url: "https://gitlab.com/LACMTA/gtfs_rail/-/raw/master/gtfs_rail.zip",
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
    id: "houston",
    name: "Houston",
    country: "US",
    bounds: { north: 30.11, south: 29.52, west: -95.79, east: -95.01 },
    feeds: [
      {
        id: "houston-metro",
        name: "METRO Houston",
        url: "https://metro.resourcespace.com/pages/download.php?ref=4835&ext=zip",
      },
    ],
  },
  {
    id: "phoenix",
    name: "Phoenix",
    country: "US",
    bounds: { north: 33.75, south: 33.29, west: -112.32, east: -111.62 },
    feeds: [
      {
        id: "valley-metro",
        name: "Valley Metro",
        url: "https://www.phoenixopendata.com/dataset/3eae9a4a-98b9-40c8-8df7-8c00c1756235/resource/28ccc0a5-49c8-495c-b91f-193de5ce2cb7/download/googletransit.zip",
      },
    ],
  },
  {
    id: "philadelphia",
    name: "Philadelphia",
    country: "US",
    bounds: { north: 40.14, south: 39.87, west: -75.28, east: -74.95 },
    feeds: [
      {
        id: "septa",
        name: "SEPTA",
        url: "https://www3.septa.org/developer/gtfs_public.zip",
      },
    ],
  },
  {
    id: "san-antonio",
    name: "San Antonio",
    country: "US",
    bounds: { north: 29.58, south: 29.32, west: -98.62, east: -98.38 },
    feeds: [
      {
        id: "via",
        name: "VIA Metropolitan Transit",
        url: "https://www.viainfo.net/gtfs/google_transit.zip",
      },
    ],
  },
  {
    id: "san-diego",
    name: "San Diego",
    country: "US",
    bounds: { north: 33.13, south: 32.53, west: -117.28, east: -116.9 },
    feeds: [
      {
        id: "sd-mts",
        name: "San Diego MTS",
        url: "http://www.sdmts.com/google_transit_files/google_transit.zip",
      },
    ],
  },
  {
    id: "dallas",
    name: "Dallas",
    country: "US",
    bounds: { north: 33.14, south: 32.62, west: -97.04, east: -96.46 },
    feeds: [
      {
        id: "dart",
        name: "Dallas Area Rapid Transit",
        url: "http://www.dart.org/transitdata/latest/google_transit.zip",
      },
    ],
  },
  {
    id: "san-jose",
    name: "San Jose / Bay Area South",
    country: "US",
    bounds: { north: 37.45, south: 37.2, west: -122.1, east: -121.75 },
    feeds: [
      {
        id: "vta",
        name: "Santa Clara VTA",
        url: "https://www.vta.org/sites/default/files/gtfs/google_transit.zip",
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
  {
    id: "san-francisco",
    name: "San Francisco Bay Area",
    country: "US",
    bounds: { north: 38.05, south: 37.15, west: -122.52, east: -121.75 },
    feeds: [
      {
        id: "bart",
        name: "BART",
        url: "http://www.bart.gov/dev/schedules/google_transit.zip",
      },
      {
        id: "sfmta",
        name: "SF Muni",
        url: "https://gtfs.sfmta.com/transitdata/google_transit.zip",
      },
    ],
  },
  {
    id: "seattle",
    name: "Seattle",
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
    id: "atlanta",
    name: "Atlanta",
    country: "US",
    bounds: { north: 33.89, south: 33.64, west: -84.55, east: -84.28 },
    feeds: [
      {
        id: "marta",
        name: "MARTA",
        url: "https://itsmarta.com/google_transit_feed/google_transit.zip",
      },
    ],
  },
  {
    id: "miami",
    name: "Miami",
    country: "US",
    bounds: { north: 26.0, south: 25.71, west: -80.35, east: -80.12 },
    feeds: [
      {
        id: "miami-dade",
        name: "Miami-Dade Transit",
        url: "http://www.miamidade.gov/transit/googletransit/current/google_transit.zip",
      },
    ],
  },
  {
    id: "portland",
    name: "Portland",
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

  // ── Indonesia ───────────────────────────────────────────────────────────
  {
    id: "jakarta",
    name: "Jakarta",
    country: "ID",
    bounds: { north: -5.95, south: -6.37, west: 106.69, east: 107.03 },
    feeds: [
      {
        id: "transjakarta",
        name: "Transjakarta",
        url: "https://gtfs.transjakarta.co.id/files/file_gtfs.zip",
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

/** Cities whose bounding box contains the point and have at least one feed. */
export function resolveCitiesForPoint(lat: number, lng: number): GtfsCity[] {
  return GTFS_CITIES.filter(
    (city) => city.feeds.length > 0 && isWithinBounds(lat, lng, city.bounds),
  );
}

/** Flat list of feeds for all matching cities (deduped by feed id). */
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

/** True when the point is inside a city that has GTFS feeds configured. */
export function hasGtfsCoverage(lat: number, lng: number): boolean {
  return resolveFeedsForPoint(lat, lng).length > 0;
}
