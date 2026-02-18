# Ride'N'Dine - Project Kanban Board

Last Updated: February 17, 2026

---

## 🏗️ In Progress

### Restaurant List Sidebar (Phase 1)

- [ ] Make sidebar resizable (drag to adjust width)
- [ ] Add search by name (client-side filtering)
- [ ] Add distance filter (< 200m, < 500m, < 750m)
- [ ] Add rating filter (minimum rating selector)
- [ ] Add sort toggle (Distance | Rating)
- [ ] Click card → center map + open marker info window
- [ ] Mobile responsive layout (collapsible by default)

---

## ✅ Completed

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

### Phase 2: AI Cuisine Classification

- [ ] Research Google Maps ToS for AI-enhanced data
- [ ] Implement AI model for cuisine type inference
  - Input: Restaurant name, reviews (optional), photos (optional)
  - Output: Cuisine tags (sushi, japanese, dimsum, chinese, etc.)
- [ ] Add cuisine filter chips in sidebar
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
