# Copilot Instructions for Ride'N'Dine Project

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
- **Architecture**: Option A (3-4 search circles along route) with R-tree filtering
- **Cost-conscious**: Using free tier (10K requests/month per API)

## Code Style Preferences

- Use **function declarations** for components (not arrow functions)
- Use **"use client"** only when needed (hooks, browser APIs, event handlers)
- Keep components in `src/components/`
- Use semantic HTML (`<nav>`, `<main>`, etc.)
- Tailwind CSS for styling
- **Use @vis.gl/react-google-maps hooks** instead of vanilla Google Maps API where possible

## Reference Documents

- `ARCHITECTURE.md` - Technical architecture and API strategy
- `LEARNING_PATH.md` - 15-step learning guide with phases
- Progress: Currently on Step 7 (Directions API Implementation)

## When User Asks Questions

1. Start with conceptual explanation
2. Provide examples if needed
3. Ask guiding questions
4. Let them implement
5. Only write code if they explicitly ask

## Reminder

This is a **learning project** - the journey matters more than speed! 🚀
