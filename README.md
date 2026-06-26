# RideNDine (Discover restaurants along your transit route)

<img width="256" height="256" alt="kiki logo idle" src="https://github.com/user-attachments/assets/bf3423c1-c6f2-4f1c-bdf2-65639185c076" />


**Your commute has better food than you think.**

## The problem

RideNDine started from my own commute.

When I started a new job in a different city, I found myself spending hours on transit every day without knowing what food options were available along my route. After work, I would often want to grab dinner on the way home, but finding places that made sense for my commute meant searching for restaurants around different stops and figuring out which ones were actually convenient to reach.

Google Maps already makes it easy for drivers to find restaurants along their route. For transit commuters, finding food stops that fit conveniently into their commute often requires checking stops and nearby restaurants one by one. I built RideNDine to make those discoveries easier.

## How it works

1. **Enter your route** — Enter your starting point and destination to plan your trip.
2. **Pick your route** — Choose the transit option that works best for you.
3. **Explore food options along the way** — The app finds food spots within a 5-minute walk of your transit path. Filter by rating or price, and tap any pin on the map for details.
4. **Open in Google Maps** — Found somewhere you like? Tap the card to open the place directly in Google Maps and get walking directions.

<img width="1872" height="909" alt="image" src="https://github.com/user-attachments/assets/3f314517-4062-4e5e-a611-d5f346ce1c11" />


## Best experience in Metro Vancouver

RideNDine works best in Metro Vancouver, where it uses TransLink transit data to identify exact bus stops and train stations along your route. This allows food options to be discovered based on real transit stops instead of just nearby areas.

Outside Metro Vancouver, RideNDine still works by estimating food options along your route, but results may vary depending on available transit data.

## Usage limits

Each session gets **5 route searches per 24 hours** to keep running the app sustainable as a personal project.

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
