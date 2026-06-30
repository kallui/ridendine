# RideNDine

<img width="256" height="256" alt="kiki logo idle" src="https://github.com/user-attachments/assets/bf3423c1-c6f2-4f1c-bdf2-65639185c076" />


**Your transit route has better food than you think.**

Discover restaurants along your public transit route.

## The problem

RideNDine started from my own transit journey.

When I started a new job in a different city, I found myself spending hours on public transit every day without knowing what food options were available along my route. After work, I would often want to grab dinner on the way home, but finding places that fit naturally into my trip meant searching for restaurants around different stops and figuring out which ones were actually convenient to reach.

Google Maps already makes it easy for drivers to find restaurants along their route. For public transit riders, finding food stops that fit conveniently into their trip often requires checking stops and nearby restaurants one by one. I built RideNDine to make those discoveries easier.

## How it works

1. **Enter your route** — Enter your starting point and destination to plan your trip.
2. **Pick your route** — Choose the transit option that works best for you.
3. **Explore food options along the way** — RideNDine finds restaurants within a ~5-minute walk of your transit path. Search by restaurant name, and tap the restaurant cards or markers on the map for details.
4. **Open in your maps app** — Found somewhere you like? Open it directly in your preferred maps app for walking directions and navigation.

<img width="1872" height="909" alt="image" src="https://github.com/user-attachments/assets/3f314517-4062-4e5e-a611-d5f346ce1c11" />

## App coverage

In Metro Vancouver, RideNDine uses TransLink GTFS data to search at real bus stops and train stations along your route, so nearby restaurants are linked to real stops on your trip.

Elsewhere, RideNDine still works by sampling your transit path at regular intervals to find nearby restaurants. Results are less stop-specific, but discovery along your route still works. 

**Support for more transit systems is planned.**

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
