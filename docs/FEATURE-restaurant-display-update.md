# Feature Request: Improve Restaurant Discovery Using Transit Stops

## Goal

Replace the current raw restaurant list with a transit-focused food discovery experience.

Users should think:

> "Where can I stop and eat along my trip?"

Not:

> "Here is a list of restaurants."

---

# Restaurant Organization

After selecting a route:

- Group restaurants by the closest transit stop/station.
- Display stops in the same order as the user's route.
- If there are transfers, e.g. from 1 bus transfer to a different bus/train, then highlight that transfer section if there are any restaurants found in that transfer spot, as this will be the most convenenient for user commute.
- Show restaurants under each stop. The detour minutes are counted by distance from the stop, use simple math or turf js, whatevers gives more clean code.

Example:
Commercial-Broadway Station

Ramen Danbo
4.7 rating
+2 min detour

Breka Bakery
+0 min detour

Waterfront Station

Restaurant A
+5 min detour

----

---

# Transit Stop Cards

Each stop should summarize food options.

Example:
Commercial-Broadway Station

12 restaurants nearby

Recommended:
Ramen Danbo
+2 min detour

Avoid showing every restaurant markers on the map and overwhelming user. Help users understand which stops are worth checking.

---

# Restaurant Cards

Restaurants should display:

- Name
- Rating and number of reviews.
- Detour time
- Nearby transit stop. If taking the bus, specify which bus the user will be taking that passes this restaurant/stop.

Dont put down the expense level anymore, e.g. $$$ $$$$, remove that feature.
Example:

Ramen Danbo

4.7 rating

+2 min detour

Near Commercial-Broadway Station


---

# Map Integration

Improve map + restaurant interaction:

- Show transit route and stops.
- Show nearby restaurants.
- Avoid cluttering the map with every marker.
- Prioritize recommended/important restaurants.

Interactions:

- Clicking a stop highlights nearby restaurants.
- Clicking a restaurant opens a small info card.

---

# Detour Display

Make detour time a main feature.

Show:
No detour
+2 min detour
+5 min detour


Users care more about added travel time than distance.

---

# Design Principles

Prioritize:

- Transit stop based organization.
- Quick scanning.
- Easy decisions.
- Minimal clutter.

Avoid:

- Long flat restaurant lists.
- Treating all restaurants equally.
- Making users manually compare locations.

---

# Main Objective

Transform restaurant search results into a journey-based food discovery experience.

The user should quickly answer:

"Where should I stop and eat during my commute?"

# Additional info
We are at a safe branch so feel free to give ideas if you think something can be implemented better.