# Ride'N'Dine - Project Kanban Board

Last Updated: February 21, 2026 (session 3)

---

## 🏗️ In Progress

### Mobile Responsive Layout

- [ ] Bottom sheet pattern for sidebar on mobile
- [ ] Collapsible route panel on mobile
- [ ] Touch-friendly card interactions

---

## ✅ Completed

### UI/UX Polish — Session 3 (Feb 21, 2026)

- [x] RouteOptionCard redesign: transit lines as headline ("🚌 R4 → 🚇 Canada Line"), 2-line compact card
- [x] Restaurant sidebar filters: search by name, 3.5+ / 4.5+ rating toggle chips, Nearest / Top Rated sort toggle
- [x] Best Match default sort algorithm: (rating/5 × 0.65) + (1 − distance/750) × 0.35
- [x] Click restaurant card → panTo + setZoom(17) on map, opens marker popup
- [x] Green "View on Google Maps" button consistent across card and popup (RestaurantShared)
- [x] Lifted selectedRestaurant state to page.tsx (sidebar click → map pan)

### UI/UX Polish — Session 2

- [x] Route alternatives with transit details (line name + headsign per leg, vehicle icon)
- [x] Per-route restaurant caching (cache hit = free, cache miss = new API call)
- [x] RouteSelectionPanel: ← Change button to go back to search form
- [x] Scrollable route list with styled scrollbar (4px, dark theme, -mr-2 positioning)
- [x] Bottom-10 clearance on all panels (Google Maps attribution always visible)
- [x] Place name + address format in autocomplete inputs ("WorkSafeBC, 6450 Roberts St...")
- [x] Navbar title links to homepage
- [x] Default map center set to Vancouver BC
- [x] Sidebar visual separation from navbar (top-4 gap, rounded left corners, border all sides)
- [x] Origin/destination visual indicator in RouteSearch (hollow ring → chevrons → diamond)
- [x] Swap button (⇅) between origin/destination inputs

### Route Selection Feature (Step 10)

- [x] Add `provideRouteAlternatives: true` to DirectionsService request
- [x] Add state management for storing multiple routes (`routes` array, `selectedRouteIndex`)
- [x] Create `RouteOptionCard` component (displays duration, distance, transfers, mode icons)
- [x] Create `RouteSelectionPanel` component (route selection UI)
- [x] Update Map to display all routes with different styling (selected = solid green, others = transparent gray)
- [x] Refactor: Only trigger restaurant search when user selects a route (not on initial search)
- [x] UI: Route selection panel appears after search, before sidebar

### UI/UX Polish & Bug Fixes

- [x] Centralize color system in globals.css (Tailwind CSS 4 approach)
- [x] Replace hardcoded hex colors with semantic names (bg-card-bg, text-primary, etc.)
- [x] Fix page-level scrollbars (overflow: hidden on html/body)
- [x] Disable empty info windows on origin/destination markers
- [x] Delete unused RestaurantInfoWindow.tsx
- [x] Rename CustomInfoWindow → RestaurantMarkerPopup for clarity
- [x] Make entire restaurant card clickable (link to Google Maps)

### Code Refactoring & Improvements

- [x] Extract shared restaurant display logic to RestaurantShared.tsx
- [x] Create reusable RestaurantDetails component (card + infowindow variants)
- [x] Fix rating text color (white for better visibility on dark theme)
- [x] Prevent future inconsistencies between card and info window displays
- [x] Component organization and naming conventions

### Restaurant Display UI (Step 9)

- [x] Update Restaurant type to include rating, priceLevel, vicinity, userRatingsTotal
- [x] Create RestaurantCard component with proper styling
- [x] Create RestaurantSidebar component (collapsible with toggle button)
- [x] Create RestaurantInfoWindow component for map markers
- [x] Implement SVG star rating icons (with half-star gradient)
- [x] Add review count display (formatted as 1.2k for large numbers)
- [x] Format rating as: "4.2 ⭐⭐⭐⭐☆ (1.2k)"
- [x] Add price level indicator ($$$$)
- [x] Add preset test button for easier development testing
- [x] Fix info window styling and formatting

### Core Features (Steps 1-8)

- [x] Google Maps API setup with environment variables
- [x] Map component with @vis.gl/react-google-maps
- [x] Navbar component
- [x] Transit route search (Directions API)
- [x] Route visualization on map
- [x] Places autocomplete for origin/destination
- [x] Restaurant search along route (polyline-based)
- [x] Strategic sampling (every 2.5km, not every stop)
- [x] Wide API search + tight Turf.js filter (1300m → 750m)
- [x] Restaurant deduplication by place_id
- [x] Restaurant markers with info windows
- [x] Search circle visualization (debug mode)

---

## 📋 Backlog

### Phase 2: AI Cuisine Classification (On Hold — API quota issues)

- [ ] Resolve Gemini API free tier availability (limit: 0 on gemini-2.0-flash)
- [ ] Consider gemini-1.5-flash or alternative (OpenAI, local model)
- [ ] Next.js API route already prototyped at `/api/classify-restaurants`
- [ ] Retry-with-backoff + daily quota detection already built
- [ ] Cuisine chip filters in sidebar already designed (cuisineMap prop pattern)
- [ ] Global cross-route cuisine cache pattern (globalCuisineMap) already designed
- [ ] Session-based caching (no persistent storage of Google data)
- [ ] Cost analysis for AI API calls

### Phase 3: User Experience Enhancements

- [ ] Loading states & spinners
- [ ] Error handling (no route, API errors, no restaurants found)
- [ ] Empty states with helpful messages
- [ ] Toast notifications for user feedback
- [ ] Route distance limit UI (50km max)
- [ ] Better mobile responsiveness

### Phase 4: User Preferences (Optional Login)

- [ ] Non-mandatory login system
- [ ] Save favorite routes
- [ ] Save filter preferences (distance, rating, cuisine)
- [ ] Recently searched routes
- [ ] Backend setup (if needed)

### Phase 5: PWA Features

- [ ] PWA manifest configuration
- [ ] Service worker for offline support
- [ ] Install as app functionality
- [ ] Cache management (respect 30-day Google ToS limit)

### Phase 6: Advanced Features (Nice-to-Have)

- [ ] Walking time estimate (calculate from distance)
- [ ] Restaurant photos (thumbnail) - costs extra API calls
- [ ] "Plan a stop" feature (add restaurant to route)
- [ ] Share route + restaurant list
- [ ] Print-friendly view
- [ ] Export restaurant list (PDF/email)

---

## 🐛 Known Issues

- None currently tracked

---

## 💡 Ideas / Parking Lot

- Multi-stop routes (visit 2-3 restaurants)
- Route optimization (shortest path)
- Integration with calendar (lunch break timing)
- Social features (share with friends)
- Restaurant reservations integration
- Transit timing considerations (peak hours)

---

## 📊 Performance Metrics

- **API Calls per Search:** 2-4 calls (1 Directions + 1-3 Places)
- **Free Tier Capacity:** ~2,500-5,000 searches/month
- **Filter Performance:** <10ms with Turf.js
- **Restaurants Found:** Typically 20-50 per route
