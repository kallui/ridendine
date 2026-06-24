# Copilot Instructions for RideNDine Project

## Learning Approach

- **User wants to learn by doing** - guide and explain, don't write code automatically
- Only generate code when explicitly asked for help
- Provide step-by-step guidance with questions to think through
- Explain concepts and "why" behind decisions
- User is rusty but has prior experience - treat as learning journey, not quick solutions

## Project Context

- **Goal**: PWA to find restaurants along transit routes
- **Stack**: Next.js 15, TypeScript, Tailwind CSS, **@vis.gl/react-google-maps** library
- **Maps Library**: Using **@vis.gl/react-google-maps v1.7.1** (modern React wrapper for Google Maps API)
  - Provides declarative components (APIProvider, GoogleMap, etc.)
  - Better React integration with hooks (useMapsLibrary, useMap, etc.)
  - Saves ~40-50% development time vs vanilla Google Maps API
- **Architecture**: Polyline-based filtering approach (decided Step 8)
  - Extract polyline coordinates from Directions API transit steps
  - One Places API search within route bounds
  - Client-side filtering using Turf.js (restaurants within 500m of route)
  - Display filtered restaurants as markers on map
- **Geospatial Library**: Turf.js (@turf/turf) for distance calculations
- **Cost-conscious**: Using free tier (10K requests/month per API)
  - ~2-3 API calls per route search (1x Directions, 1-2x Places)
  - Supports ~3,000-5,000 route searches per month

## Code Style Preferences

- Use **function declarations** for components (not arrow functions)
- Use **"use client"** only when needed (hooks, browser APIs, event handlers)
- Keep components in `src/components/`
- Use semantic HTML (`<nav>`, `<main>`, etc.)
- Tailwind CSS for styling
- **Use @vis.gl/react-google-maps hooks** instead of vanilla Google Maps API where possible

## Reference Documents

- `docs/ARCHITECTURE.md` - Technical architecture and API strategy
- `docs/LEARNING_PATH.md` - 15-step learning guide with phases
- `docs/KANBAN.md` - Project task board (In Progress, Completed, Backlog)
- Progress: Currently on Step 9 (Restaurant Display UI)
  - ✅ Step 8 completed: Polyline-based restaurant filtering with Turf.js
  - 🔄 Step 9 in progress: Building restaurant list sidebar with search & filters

## Project Tracking

- **Always update `docs/KANBAN.md`** when tasks are started, completed, or new features are added
- Move tasks between sections: Backlog → In Progress → Completed
- Add new ideas to "Ideas / Parking Lot" section
- Track known issues in "Known Issues" section
- Keep user informed of progress by referencing the Kanban board

## When User Asks Questions

1. Start with conceptual explanation
2. Provide examples if needed
3. Ask guiding questions
4. Let them implement
5. Only write code if they explicitly ask

## Reminder

This is a **learning project** - the journey matters more than speed! 🚀
