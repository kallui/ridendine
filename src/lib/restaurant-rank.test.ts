import { describe, expect, it } from "vitest";
import {
  compareRestaurants,
  recommendedScore,
  sortRestaurants,
} from "./restaurant-rank";

describe("recommendedScore", () => {
  it("ranks a well-reviewed 4.6 above a 4.9 with few reviews", () => {
    const popular = recommendedScore({
      rating: 4.6,
      userRatingsTotal: 2000,
      detourMinutes: 0,
    });
    const obscure = recommendedScore({
      rating: 4.9,
      userRatingsTotal: 8,
      detourMinutes: 0,
    });
    expect(popular).toBeGreaterThan(obscure);
  });

  it("penalizes a long walk enough to lose to a closer similar place", () => {
    const close = recommendedScore({
      rating: 4.6,
      userRatingsTotal: 400,
      detourMinutes: 0,
    });
    const far = recommendedScore({
      rating: 4.6,
      userRatingsTotal: 400,
      detourMinutes: 7,
    });
    expect(close).toBeGreaterThan(far);
  });

  it("sinks unrated places below rated ones", () => {
    const rated = recommendedScore({
      rating: 3.2,
      userRatingsTotal: 10,
      detourMinutes: 5,
    });
    const unrated = recommendedScore({ detourMinutes: 0 });
    expect(rated).toBeGreaterThan(unrated);
  });
});

describe("sortRestaurants", () => {
  const places = [
    { name: "A", rating: 4.9, userRatingsTotal: 5, detourMinutes: 6 },
    { name: "B", rating: 4.5, userRatingsTotal: 800, detourMinutes: 1 },
    { name: "C", rating: 4.1, userRatingsTotal: 40, detourMinutes: 0 },
  ];

  it("sorts most reviewed by review count", () => {
    expect(
      sortRestaurants(places, "most_reviewed").map((p) => p.name),
    ).toEqual(["B", "C", "A"]);
  });

  it("sorts shortest detour by walking time", () => {
    expect(
      sortRestaurants(places, "shortest_detour").map((p) => p.name),
    ).toEqual(["C", "B", "A"]);
  });

  it("puts the popular closer restaurant first when recommended", () => {
    expect(sortRestaurants(places, "recommended")[0]?.name).toBe("B");
  });
});

describe("compareRestaurants", () => {
  it("is a stable ordering for equal review counts", () => {
    const a = { userRatingsTotal: 10, detourMinutes: 1 };
    const b = { userRatingsTotal: 10, detourMinutes: 3 };
    expect(compareRestaurants(a, b, "most_reviewed")).toBe(0);
  });
});
