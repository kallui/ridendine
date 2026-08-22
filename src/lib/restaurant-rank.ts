export type RestaurantSort = "recommended" | "most_reviewed" | "shortest_detour";

export const RESTAURANT_SORT_LABELS: Record<RestaurantSort, string> = {
  recommended: "Recommended",
  most_reviewed: "Most reviewed",
  shortest_detour: "Shortest detour",
};

type RankableRestaurant = {
  rating?: number;
  userRatingsTotal?: number;
  detourMinutes: number;
};

/** Shrink ratings toward 4.0 until there are enough reviews to trust them. */
const PRIOR_RATING = 4;
const PRIOR_WEIGHT = 30;
/** Subtracted per extra walking minute so convenience still matters. */
const DETOUR_PENALTY = 0.08;

/**
 * Higher is better. Unrated places sink below anything with a score.
 * A 4.9 with a handful of reviews will not beat a 4.6 with thousands,
 * and a long walk off the stop is penalized.
 */
export function recommendedScore(restaurant: RankableRestaurant): number {
  const { rating, detourMinutes } = restaurant;
  if (rating == null) {
    return -1 - detourMinutes * DETOUR_PENALTY;
  }

  const reviewCount = restaurant.userRatingsTotal ?? 0;
  const shrunk =
    (rating * reviewCount + PRIOR_RATING * PRIOR_WEIGHT) /
    (reviewCount + PRIOR_WEIGHT);

  return shrunk - DETOUR_PENALTY * detourMinutes;
}

export function compareRestaurants(
  a: RankableRestaurant,
  b: RankableRestaurant,
  sort: RestaurantSort,
): number {
  switch (sort) {
    case "most_reviewed":
      return (b.userRatingsTotal ?? 0) - (a.userRatingsTotal ?? 0);
    case "shortest_detour":
      return a.detourMinutes - b.detourMinutes;
    case "recommended":
    default:
      return recommendedScore(b) - recommendedScore(a);
  }
}

export function sortRestaurants<T extends RankableRestaurant>(
  restaurants: T[],
  sort: RestaurantSort,
): T[] {
  return [...restaurants].sort((a, b) => compareRestaurants(a, b, sort));
}
