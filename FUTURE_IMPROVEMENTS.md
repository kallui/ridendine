# Future Improvements

A collection of ideas and enhancements to consider for future development.

---

## 🍱 Better Restaurant Categorization

**Current Issue:**
- Google Maps Places API (legacy) returns very generic `types` like `["restaurant", "food", "establishment"]`
- Not useful for filtering by cuisine type (e.g., sushi, Italian, BBQ)
- Currently using name-based text search as workaround

**Future Solution: Google Places API (New)**
- Google released a new Places API with improved data
- Returns more specific categories via `primaryType` field
- Better cuisine classification (e.g., `"ramen_restaurant"`, `"sushi_restaurant"`)
- Documentation: https://developers.google.com/maps/documentation/places/web-service/place-types

**Trade-offs:**
- ✅ More accurate cuisine categorization
- ✅ Better filtering UX
- ❌ May require migration from current Nearby Search approach
- ❌ Need to test free tier limits and pricing

**Priority:** Medium (current name-based search works for MVP)

---

## 📝 Add More Ideas Below

_Use this file to track potential features, optimizations, and technical improvements._
