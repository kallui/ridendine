# RideNDine

<img width="256" height="256" alt="kiki logo idle" src="https://github.com/user-attachments/assets/bf3423c1-c6f2-4f1c-bdf2-65639185c076" />


**Your transit route has better food than you think.**

Discover restaurants along your public transit route.

<img width="1876" height="890" alt="image" src="https://github.com/user-attachments/assets/b746aef4-5590-4fe8-9833-b4cb11c5b1d3" />

## The problem

RideNDine started from my own transit journey.

When I started a new job in a different city, I found myself spending hours on public transit every day. After work, I often wanted to grab dinner on the way home, but finding restaurants that were actually convenient along my route meant checking stops and nearby restaurants one by one.

Google & Apple Maps make it easy for drivers to discover food along their route, but I found there wasn't the same experience for public transit. So, I built RideNDine to make finding food along your transit journey easier.

## How it works

1. **Enter your route** — Enter your starting point and destination to plan your trip.
2. **Pick your route** — Choose the transit option that works best for you.
3. **Explore food options along the way** — RideNDine finds restaurants within a ~5-minute walk of your transit path. Search by restaurant name, and tap a restaurant or map marker to see which line to take and where to get off. Tap a photo thumbnail to see more photos.
4. **Open in your maps app** — Found somewhere you like? Open it directly in your preferred maps app for walking directions and navigation.

### Screenshots
<img width="1873" height="893" alt="image" src="https://github.com/user-attachments/assets/11bd12f6-1c41-41e5-935a-49a7698d085a" />

<img width="374" height="823" alt="image" src="https://github.com/user-attachments/assets/df8112e8-f4d6-4219-b73d-4cb17cd34321" />


## App coverage

In these cities, RideNDine uses official GTFS data to search at real bus stops and train stations along your route, so nearby restaurants are linked to real stops on your trip.

| City      | Country       | Transit data          |
| --------- | ------------- | --------------------- |
| Vancouver | Canada        | TransLink             |
| Toronto   | Canada        | TTC + GO Transit      |
| Montréal  | Canada        | STM + REM             |
| Seattle   | United States | Sound Transit + Metro |
| Portland  | United States | TriMet                |
| Chicago   | United States | CTA + Pace            |
| Boston    | United States | MBTA                  |
| Denver    | United States | RTD                   |
| Austin    | United States | CapMetro              |

Elsewhere, RideNDine still works by sampling your transit path at regular intervals to find nearby restaurants. Results are less stop-specific, but discovery along your route still works.

**Support for more transit systems is planned.** See [`docs/COVERED_CITIES.md`](docs/COVERED_CITIES.md) for which municipalities each feed covers.

## Usage limits

To help keep the app sustainable as a personal project, RideNDine currently allows up to **5 route searches** within any rolling 24-hour period.

---

## Tech stack

| Layer      | Technology                                  |
| ---------- | ------------------------------------------- |
| Framework  | Next.js 15 (App Router)                     |
| Language   | TypeScript                                  |
| Styling    | Tailwind CSS v4                             |
| Maps       | Google Maps via `@vis.gl/react-google-maps` |
| Geospatial | Turf.js (`@turf/turf`)                      |
| PWA        | `next-pwa`                                  |

## To run locally:

**Prerequisites:** Node.js 18+, Google Maps API key (Maps JavaScript, Directions, Places)

Create `.env.local` by following `.env.local.template` and fill out all the required API keys.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
