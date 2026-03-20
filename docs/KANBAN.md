# Ride'N'Dine - Project Kanban Board

Last Updated: March 19, 2026 (session 5)

---

## 🏗️ In Progress

---

## ✅ Completed

### Hero Search Hotfix — Session 5 (Mar 19, 2026)

- [x] Fixed race condition where hero destination selection could do nothing if GPS or Routes library initialized after the click
- [x] Added fallback behavior: if location is unavailable, destination click now transitions to results so user can manually enter origin
- [x] Restored mobile results workflow with BottomSheet phases (route selection then restaurants), while keeping desktop left-panel + right-sidebar layout
- [x] Added keyboard navigation for autocomplete dropdowns (arrow keys, enter to select, escape to close) in both hero and route search forms
- [x] Cleaned hook state handling for `useCustomPlacesAutocomplete` to avoid effect state-update lint warnings while preserving loading and prediction behavior
- [x] Standardized indigo accent tokens in `globals.css` and migrated hero autocomplete from hardcoded `indigo-*` classes to tokenized theme classes
- [x] Migrated app theme palette from emerald-led to indigo-led (updated primary, hover, borders, and surfaces to cool neutral + indigo tones)
- [x] Replaced remaining emerald-specific UI states (focus rings, selected dropdown row states, route overlays/search circles) with indigo token or indigo hex equivalents
- [x] Shifted indigo palette lighter/less purple and added system-aware dark/light theme tokens with explicit `data-theme` overrides
- [x] Added navbar theme toggle with persisted preference (`localStorage`) and map color scheme synchronization (`DARK`/`LIGHT`)
- [x] Replaced remaining hardcoded dark panel/input classes in key components with token-based classes so light mode renders correctly
- [x] Fixed navbar layering: made navbar fixed with high z-index so it remains visible above map and hero/results overlays
- [x] Switched theme toggle control to icon-based sun/moon button for cleaner navbar UI
- [x] Added support for theme-specific map styles via env vars (`NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_DARK` / `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_LIGHT`) with fallback to default map ID
- [x] Softened light-mode surfaces by replacing pure white card backgrounds with a subtle indigo tint for reduced glare and better visual consistency
- [x] Increased light-mode indigo tint one step further (`--app-bg` and `--card-bg`) to reduce bright-white feel while preserving readability
- [x] Reduced navbar height slightly and moved results left panel lower on desktop to prevent overlap with the Current Location input
- [x] Refined RouteSearch to a cleaner minimalist layout (simplified connector, compact control spacing, subtle From/To labels, GPS state chip for Current Location)
- [x] Modernized route option cards with lighter visual weight, clear Selected/Best badges, and improved scan hierarchy
- [x] Streamlined flow by auto-selecting the fastest deduplicated route and preloading nearby restaurants immediately after search
- [x] Further decluttered RouteSearch for mobile-first minimalism by removing From/To labels, GPS chip, and swap control row to reduce vertical density
- [x] Reintroduced swap action as a compact floating right-rail button (Google Maps-inspired) to keep functionality without adding vertical bulk
- [x] Rotated floating swap icon 90° for correct visual orientation
- [x] Fixed swap edge case where both autocomplete dropdowns could open at once by gating suggestions to the focused field
- [x] Updated swap behavior to immediately trigger a fresh route search for swapped origin/destination while preventing duplicate auto-search calls
- [x] Fixed Directions `NOT_FOUND` edge case by normalizing "Current Location"/"Your location" labels to GPS coordinates before route requests
- [x] Removed redundant `← Change` controls from RouteSelectionPanel (desktop and mobile); search field editing is now the primary route-change path
- [x] Optimized route sampling to reduce API cost: avoid beyond-endpoint sampling and skip near-duplicate search centers to prevent heavily overlapping circles

### Mobile/Tablet Polish — Session 4 (Feb 21, 2026)

- [x] Fixed bottom sheet chevron toggle (peek ↔ expanded) — root cause was Tailwind purging dynamic `translate-y-[calc(...)]` class in production; fixed by switching to inline `style={{ transform }}`
- [x] Removed grey drag pill from bottom sheet handle bar; chevron now centered at top
- [x] Fixed content bleeding through gap between handle bar and sticky header — refactored to proper `flex-col` layout (header `shrink-0` + list `overflow-y-auto`) instead of CSS sticky trick
- [x] Removed test button (Crowley Dr → WorkSafeBC Richmond) from desktop
- [x] Removed desktop Search button; replaced with `Ride'N'Dine` logo text above inputs
- [x] Search icon (🔍) now visible consistently on all screen sizes inside destination input
- [x] RouteSelectionPanel desktop card now matches RouteSearch card styling exactly (same bg, border, shadow, padding)
- [x] Shifted mobile/desktop breakpoint from `sm` (640px) to `lg` (1024px) — tablets now use bottom sheet layout
- [x] Tablets: search bar + route panel stay as fixed-width left column (`sm:w-96`), not full-width
- [x] Fixed address label duplication ("3433 Crowley Dr, 3433 Crowley Dr...") — `formatPlaceLabel()` checks if name is already at start of `formatted_address` before prepending

### Deployment & Infrastructure — Session 3 (Feb 21, 2026)

- [x] Built and deployed to Vercel (https://ridendine.vercel.app)
- [x] Fixed Next.js CVE-2025-29927 by upgrading to latest
- [x] Added Google Maps API key HTTP referrer restriction (Vercel domain)

### Mobile Responsive Layout — Session 3 (Feb 21, 2026)

- [x] BottomSheet component: peek / expanded / hidden states via CSS transform
- [x] Sequential phase flow: search → routes (bottom sheet) → restaurants (bottom sheet)
- [x] RouteSelectionPanel `mobileMode` prop for flat scrollable list in sheet
- [x] RestaurantSidebar `variant="sheet"` for content-only rendering inside sheet
- [x] Back button (← Change route) in sheet restaurant header
- [x] Auto-expand sheet when routes arrive; auto-peek when route selected
- [x] Map tap collapses sheet to peek
- [x] Compact search bar on mobile (smaller padding, hidden test button)
- [x] Autocomplete callback ref pattern (fixes re-attachment bug when DOM changes)
- [x] Autocomplete location bias from GPS with Vancouver fallback
- [x] Route deduplication by headline only (removes same route at different departure times)
- [x] Auto-search when both autocomplete fields filled

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

### Technical Debt

- [ ] **Migrate `google.maps.places.Autocomplete` → `PlaceAutocompleteElement`** — Current API deprecated as of March 2025 (not discontinued yet, 12 months notice required). New API is a web component that renders its own `<input>`, requires CSS custom properties for dark-theme styling instead of Tailwind. Defer until ready for a dedicated refactor.
- [x] Remove debug `console.log` statements before final release (route dedup logs in page.tsx)

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

### Phase 4: User Preferences (Optional Login)

- [ ] Non-mandatory login system
- [ ] Save favorite routes
- [ ] Save filter preferences (distance, rating, cuisine)
- [ ] Recently searched routes
- [ ] Backend setup (if needed)

### Phase 5: PWA Features

- [ ] App logo (generate via ChatGPT, add to `public/`, wire into `manifest.ts` and `layout.tsx`)
- [ ] Custom domain (Porkbun/Namecheap recommended)
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

- `ERR_BLOCKED_BY_CLIENT` in console — ad blocker blocking Google telemetry request, harmless, not user-facing
- `google.maps.places.Autocomplete` deprecation warning — tracked in Technical Debt backlog above

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
