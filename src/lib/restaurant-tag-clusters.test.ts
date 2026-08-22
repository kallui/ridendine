import { describe, expect, it } from "vitest";
import {
  TAG_HEIGHT_PX,
  clusterContaining,
  clusterRestaurantTags,
  latLngToWorldPx,
} from "./restaurant-tag-clusters";

function place(
  id: string,
  loc: { lat: number; lng: number },
  extras: { rating?: number; userRatingsTotal?: number; detourMinutes?: number } = {},
) {
  return {
    placeId: id,
    name: id,
    location: loc,
    rating: extras.rating ?? 4.5,
    userRatingsTotal: extras.userRatingsTotal ?? 100,
    detourMinutes: extras.detourMinutes ?? 2,
  };
}

const downtown = { lat: 49.2827, lng: -123.1207 };

function offsetMeters(
  origin: { lat: number; lng: number },
  northM: number,
  eastM: number,
) {
  const lat = origin.lat + (northM / 6_378_137) * (180 / Math.PI);
  const lng =
    origin.lng +
    (eastM / (6_378_137 * Math.cos((origin.lat * Math.PI) / 180))) *
      (180 / Math.PI);
  return { lat, lng };
}

describe("clusterRestaurantTags", () => {
  it("keeps far-apart places as their own tags", () => {
    const a = place("a", downtown, { rating: 4.8, userRatingsTotal: 800 });
    const b = place("b", offsetMeters(downtown, 4_000, 0), { rating: 4.2 });

    const clusters = clusterRestaurantTags([a, b], 12);

    expect(clusters).toHaveLength(2);
    expect(clusters.every((c) => c.extraCount === 0)).toBe(true);
  });

  it("collapses nearby places at city zoom and keeps the better name", () => {
    const best = place("best", downtown, { rating: 4.8, userRatingsTotal: 900 });
    const other = place("other", offsetMeters(downtown, 80, 0), {
      rating: 3.9,
      userRatingsTotal: 20,
    });

    const clusters = clusterRestaurantTags([other, best], 12);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].restaurant.placeId).toBe("best");
    expect(clusters[0].extraCount).toBe(1);
  });

  it("splits the same pair once you zoom in past tag overlap", () => {
    const a = place("a", downtown);
    const b = place("b", offsetMeters(downtown, 80, 0));
    const pa = latLngToWorldPx(a.location, 18);
    const pb = latLngToWorldPx(b.location, 18);
    const gapPx = Math.hypot(pa.x - pb.x, pa.y - pb.y);

    expect(gapPx).toBeGreaterThan(TAG_HEIGHT_PX);

    const clusters = clusterRestaurantTags([a, b], 18);
    expect(clusters).toHaveLength(2);
  });

  it("does not hide a neighbor that sits beside a tag without covering it", () => {
    const a = place("best-cafe", downtown, { rating: 4.8, userRatingsTotal: 900 });
    const b = place("other-spot", offsetMeters(downtown, 120, 0), {
      rating: 3.9,
      userRatingsTotal: 20,
    });

    const clusters = clusterRestaurantTags([a, b], 15);
    expect(clusters).toHaveLength(2);
  });

  it("finds the cluster that owns a hidden member", () => {
    const best = place("best", downtown, { rating: 4.8, userRatingsTotal: 900 });
    const other = place("other", offsetMeters(downtown, 80, 0), {
      rating: 3.9,
      userRatingsTotal: 20,
    });

    const clusters = clusterRestaurantTags([other, best], 12);
    expect(clusterContaining(clusters, "other")?.restaurant.placeId).toBe("best");
  });

  it("promotes a preferred restaurant to the visible name", () => {
    const best = place("best", downtown, { rating: 4.9, userRatingsTotal: 2000 });
    const picked = place("picked", offsetMeters(downtown, 40, 0), {
      rating: 3.2,
      userRatingsTotal: 8,
    });

    const clusters = clusterRestaurantTags([best, picked], 12, {
      preferredIds: ["picked"],
    });

    expect(clusters).toHaveLength(1);
    expect(clusters[0].restaurant.placeId).toBe("picked");
    expect(clusters[0].extraCount).toBe(1);
  });
});
