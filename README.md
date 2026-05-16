# Ride'N'Dine

A progressive web app (PWA) that helps commuters discover restaurants and food stops along their transit route.

> **Status:** Work in progress — not yet public.

## What It Does

Enter an origin and destination, pick a transit route, and Ride'N'Dine surfaces nearby restaurants along the way. No detours, no guesswork — just food that fits your commute.

## Tech Stack

| Layer      | Technology                                         |
| ---------- | -------------------------------------------------- |
| Framework  | Next.js 15 (App Router)                            |
| Language   | TypeScript                                         |
| Styling    | Tailwind CSS v4                                    |
| Maps       | Google Maps via `@vis.gl/react-google-maps` v1.7.1 |
| Geospatial | Turf.js (`@turf/turf`)                             |
| PWA        | `next-pwa`                                         |

## Architecture

Ride'N'Dine uses a **polyline-based filtering approach** to keep API costs low:

1. Fetch the transit route from the **Directions API** (1 call)
2. Run a single **Places API Nearby Search** within the route bounding box (1–2 calls)
3. Filter results **client-side** using Turf.js — restaurants within 500 m of the route polyline
4. Display filtered restaurants as map markers with a sortable/filterable sidebar

This keeps usage to ~2–3 API calls per search, supporting roughly 3,000–5,000 route searches per month on the free tier.

## Getting Started

### Prerequisites

- Node.js 18+
- A [Google Maps Platform](https://developers.google.com/maps) API key with the following APIs enabled:
  - Maps JavaScript API
  - Directions API
  - Places API

### Environment Variables

Create a `.env.local` file in the project root:

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

### Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
  app/            # Next.js App Router (layout, page, globals)
  components/     # UI components (Map, Sidebar, RouteSearch, etc.)
  hooks/          # Custom React hooks
docs/
  ARCHITECTURE.md # API strategy and cost analysis
  KANBAN.md       # Project task board
  LEARNING_PATH.md
```

## Docs

- [Architecture & API strategy](docs/ARCHITECTURE.md)
- [Project Kanban board](docs/KANBAN.md)
- [Learning path](docs/LEARNING_PATH.md)

## Deployment

The app is deployed on [Vercel](https://vercel.com). Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` as an environment variable in your Vercel project settings and restrict the API key to your Vercel domain in the Google Cloud Console.
