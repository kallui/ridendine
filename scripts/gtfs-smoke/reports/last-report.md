# GTFS smoke report

Generated: 2026-08-12T07:01:31.454Z

Summary: **1 passed**, **0 failed**, 1 cases

Review stop names below — they should look like real agency stops/stations, not random addresses.

---
## PACE-1 · Chicago metro · Pace Suburban Bus — PASS

- **Region:** Chicago metro
- **GTFS / agency:** Pace Suburban Bus (`pace`)
- **Intent:** Pace suburban bus
- **OD:** Evanston, IL → Howard Station, Chicago, IL
- **Notes:** Suburb ↔ CTA edge; Pace feed (Metra still pending free API key)

### Route [0] — matched

- Google line names: `Purple Line`
- Transit steps: 1
- Feeds resolved: `cta`, `pace`
- GTFS stops: **5**
- Detail: matched 5 GTFS stops via cta

| # | Stop name | Lat | Lng | Line |
| --- | --- | --- | --- | --- |
| 1 | Davis | 42.04771 | -87.68354 | Purple Line |
| 2 | Dempster | 42.04165 | -87.68160 | Purple Line |
| 3 | Main | 42.03346 | -87.67954 | Purple Line |
| 4 | South Boulevard | 42.02761 | -87.67833 | Purple Line |
| 5 | Howard | 42.01906 | -87.67289 | Purple Line |

### Route [1] — matched

- Google line names: `Pulse Dempster Line`, `Yellow Line`
- Transit steps: 2
- Feeds resolved: `cta`, `pace`
- GTFS stops: **8**
- Detail: matched 8 GTFS stops via pace+cta

| # | Stop name | Lat | Lng | Line |
| --- | --- | --- | --- | --- |
| 1 | Davis CTA Station | 42.04801 | -87.68344 | Pulse Dempster Line |
| 2 | Dodge Station | 42.04122 | -87.69868 | Pulse Dempster Line |
| 3 | St. Louis Station | 42.04092 | -87.71550 | Pulse Dempster Line |
| 4 | Crawford Station | 42.04081 | -87.72892 | Pulse Dempster Line |
| 5 | Dempster - Skokie CTA Station | 42.04089 | -87.75287 | Pulse Dempster Line |
| 6 | Dempster-Skokie | 42.03895 | -87.75192 | Yellow Line |
| 7 | Oakton-Skokie | 42.02624 | -87.74722 | Yellow Line |
| 8 | Howard | 42.01906 | -87.67289 | Yellow Line |
