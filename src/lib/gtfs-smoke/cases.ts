/**
 * Smoke-test OD pairs for GTFS stop matching.
 * Keep in sync with docs/GTFS_TEST_CASES.md
 */

export type GtfsSmokeCase = {
  id: string;
  /** Region id in GTFS_CITIES (e.g. vancouver) */
  regionId: string;
  /** Expected feed id (e.g. translink) */
  expectedFeedId: string;
  intent: string;
  origin: string;
  destination: string;
  notes?: string;
};

export const GTFS_SMOKE_CASES: GtfsSmokeCase[] = [
  // TransLink
  {
    id: "TL-1",
    regionId: "vancouver",
    expectedFeedId: "translink",
    intent: "SkyTrain core",
    origin: "Waterfront Station, Vancouver, BC",
    destination: "Metrotown Station, Burnaby, BC",
    notes: "Expo Line; station naming",
  },
  {
    id: "TL-2",
    regionId: "vancouver",
    expectedFeedId: "translink",
    intent: "Cross-municipality rail",
    origin: "Commercial-Broadway Station, Vancouver, BC",
    destination: "Richmond–Brighouse Station, Richmond, BC",
    notes: "Canada Line",
  },
  {
    id: "TL-3",
    regionId: "vancouver",
    expectedFeedId: "translink",
    intent: "Major bus corridor",
    origin: "UBC Bus Loop, Vancouver, BC",
    destination: "Joyce–Collingwood Station, Vancouver, BC",
    notes: "99 B-Line style",
  },

  // TTC
  {
    id: "TTC-1",
    regionId: "toronto",
    expectedFeedId: "ttc",
    intent: "Subway core",
    origin: "Union Station, Toronto, ON",
    destination: "Bloor-Yonge Station, Toronto, ON",
  },
  {
    id: "TTC-2",
    regionId: "toronto",
    expectedFeedId: "ttc",
    intent: "Cross-city subway",
    origin: "Kipling Station, Toronto, ON",
    destination: "Kennedy Station, Toronto, ON",
  },
  {
    id: "TTC-3",
    regionId: "toronto",
    expectedFeedId: "ttc",
    intent: "Streetcar / bus mix",
    origin: "Spadina Station, Toronto, ON",
    destination: "Distillery District, Toronto, ON",
  },

  // STM
  {
    id: "STM-1",
    regionId: "montreal",
    expectedFeedId: "stm",
    intent: "Métro core",
    origin: "Berri-UQAM Station, Montreal, QC",
    destination: "McGill Station, Montreal, QC",
  },
  {
    id: "STM-2",
    regionId: "montreal",
    expectedFeedId: "stm",
    intent: "Cross-island métro",
    origin: "Honoré-Beaugrand Station, Montreal, QC",
    destination: "Angrignon Station, Montreal, QC",
  },
  {
    id: "STM-3",
    regionId: "montreal",
    expectedFeedId: "stm",
    intent: "Bus + métro edge",
    origin: "Côte-Vertu Station, Montreal, QC",
    destination: "Jean-Talon Market, Montreal, QC",
  },

  // King County Metro
  {
    id: "SEA-1",
    regionId: "seattle",
    expectedFeedId: "king-county-metro",
    intent: "Downtown bus spine",
    origin: "Westlake Station, Seattle, WA",
    destination: "University of Washington Station, Seattle, WA",
    notes: "May be Link in Google — Metro-only feed may fail",
  },
  {
    id: "SEA-2",
    regionId: "seattle",
    expectedFeedId: "king-county-metro",
    intent: "Cross-lake / Eastside",
    origin: "Bellevue Transit Center, Bellevue, WA",
    destination: "Westlake Station, Seattle, WA",
  },
  {
    id: "SEA-3",
    regionId: "seattle",
    expectedFeedId: "king-county-metro",
    intent: "Neighborhood bus",
    origin: "Columbia City, Seattle, WA",
    destination: "Downtown Seattle, WA",
  },

  // TriMet
  {
    id: "PDX-1",
    regionId: "portland",
    expectedFeedId: "trimet",
    intent: "MAX core",
    origin: "Pioneer Courthouse Square, Portland, OR",
    destination: "Gateway Transit Center, Portland, OR",
  },
  {
    id: "PDX-2",
    regionId: "portland",
    expectedFeedId: "trimet",
    intent: "Cross-metro MAX",
    origin: "Beaverton Transit Center, Beaverton, OR",
    destination: "Gresham Central Transit Center, Gresham, OR",
  },
  {
    id: "PDX-3",
    regionId: "portland",
    expectedFeedId: "trimet",
    intent: "Frequent bus",
    origin: "Portland State University, Portland, OR",
    destination: "Alberta Arts District, Portland, OR",
  },

  // CTA
  {
    id: "CTA-1",
    regionId: "chicago",
    expectedFeedId: "cta",
    intent: "L train core",
    origin: "Chicago Union Station, Chicago, IL",
    destination: "State/Lake Station, Chicago, IL",
  },
  {
    id: "CTA-2",
    regionId: "chicago",
    expectedFeedId: "cta",
    intent: "Long L corridor",
    origin: "O'Hare International Airport, Chicago, IL",
    destination: "The Loop, Chicago, IL",
  },
  {
    id: "CTA-3",
    regionId: "chicago",
    expectedFeedId: "cta",
    intent: "South Side / bus+L",
    origin: "Midway International Airport, Chicago, IL",
    destination: "Millennium Park, Chicago, IL",
  },

  // MBTA
  {
    id: "MBTA-1",
    regionId: "boston",
    expectedFeedId: "mbta",
    intent: "Subway core",
    origin: "South Station, Boston, MA",
    destination: "Park Street Station, Boston, MA",
  },
  {
    id: "MBTA-2",
    regionId: "boston",
    expectedFeedId: "mbta",
    intent: "Cross-branch subway",
    origin: "Alewife Station, Cambridge, MA",
    destination: "Ashmont Station, Boston, MA",
  },
  {
    id: "MBTA-3",
    regionId: "boston",
    expectedFeedId: "mbta",
    intent: "Green Line / bus mix",
    origin: "Boston College Station, Boston, MA",
    destination: "Government Center, Boston, MA",
  },

  // RTD
  {
    id: "RTD-1",
    regionId: "denver",
    expectedFeedId: "rtd",
    intent: "Rail core",
    origin: "Union Station, Denver, CO",
    destination: "Denver International Airport, Denver, CO",
  },
  {
    id: "RTD-2",
    regionId: "denver",
    expectedFeedId: "rtd",
    intent: "Suburb ↔ downtown rail",
    origin: "Littleton–Mineral Station, Littleton, CO",
    destination: "Union Station, Denver, CO",
  },
  {
    id: "RTD-3",
    regionId: "denver",
    expectedFeedId: "rtd",
    intent: "Bus mall / local",
    origin: "Civic Center Station, Denver, CO",
    destination: "Cherry Creek, Denver, CO",
  },

  // CapMetro
  {
    id: "ATX-1",
    regionId: "austin",
    expectedFeedId: "capmetro",
    intent: "Rail / transit spine",
    origin: "Downtown Station, Austin, TX",
    destination: "Kramer Station, Austin, TX",
  },
  {
    id: "ATX-2",
    regionId: "austin",
    expectedFeedId: "capmetro",
    intent: "North ↔ core",
    origin: "The Domain, Austin, TX",
    destination: "Downtown Austin, TX",
  },
  {
    id: "ATX-3",
    regionId: "austin",
    expectedFeedId: "capmetro",
    intent: "South / bus corridor",
    origin: "South Congress Avenue, Austin, TX",
    destination: "University of Texas at Austin, Austin, TX",
  },
];
