import { recommendedScore } from "@/lib/restaurant-rank";

type Loc = { lat: number; lng: number };

type Clusterable = {
  placeId: string;
  name: string;
  location: Loc;
  rating?: number;
  userRatingsTotal?: number;
  detourMinutes: number;
};

export type RestaurantTagCluster<T extends Clusterable = Clusterable> = {
  restaurant: T;
  extraCount: number;
  members: T[];
};

type TagBox = { left: number; right: number; top: number; bottom: number };

/** Visible tag height (label row + caret), in CSS pixels. */
export const TAG_HEIGHT_PX = 26;
/** Collapse only when labels overlap by at least this much. */
export const TAG_MIN_OVERLAP_PX = 8;
const TAG_MAX_WIDTH_PX = 176;
const TAG_CHAR_WIDTH_PX = 6.2;
const TAG_PAD_PX = 14;

export function latLngToWorldPx(loc: Loc, zoom: number): { x: number; y: number } {
  const siny = Math.min(
    Math.max(Math.sin((loc.lat * Math.PI) / 180), -0.9999),
    0.9999,
  );
  const scale = 256 * 2 ** zoom;
  return {
    x: ((loc.lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI)) * scale,
  };
}

export function estimateTagWidth(name: string): number {
  return Math.min(
    TAG_MAX_WIDTH_PX,
    Math.max(36, name.length * TAG_CHAR_WIDTH_PX + TAG_PAD_PX),
  );
}

function tagBox(location: Loc, name: string, zoom: number): TagBox {
  const px = latLngToWorldPx(location, zoom);
  const width = estimateTagWidth(name);
  return {
    left: px.x - width / 2,
    right: px.x + width / 2,
    top: px.y - TAG_HEIGHT_PX,
    bottom: px.y,
  };
}

function boxesOverlap(a: TagBox, b: TagBox): boolean {
  const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return overlapX >= TAG_MIN_OVERLAP_PX && overlapY >= TAG_MIN_OVERLAP_PX;
}

/**
 * Greedy clusters: hide a tag only when its label would cover a visible one.
 * The preferred / highest-ranked restaurant keeps its name.
 */
export function clusterRestaurantTags<T extends Clusterable>(
  restaurants: T[],
  zoom: number,
  options: {
    preferredIds?: Array<string | null | undefined>;
  } = {},
): RestaurantTagCluster<T>[] {
  const preferred = new Map(
    (options.preferredIds ?? [])
      .filter((id): id is string => Boolean(id))
      .map((id, index) => [id, index]),
  );

  const sorted = [...restaurants].sort((a, b) => {
    const pa = preferred.get(a.placeId) ?? Number.POSITIVE_INFINITY;
    const pb = preferred.get(b.placeId) ?? Number.POSITIVE_INFINITY;
    if (pa !== pb) return pa - pb;
    return recommendedScore(b) - recommendedScore(a);
  });

  const clusters: {
    restaurant: T;
    members: T[];
    box: TagBox;
  }[] = [];

  for (const restaurant of sorted) {
    const box = tagBox(restaurant.location, restaurant.name, zoom);
    const host = clusters.find((cluster) => boxesOverlap(cluster.box, box));
    if (host) {
      host.members.push(restaurant);
    } else {
      clusters.push({ restaurant, members: [restaurant], box });
    }
  }

  return clusters.map((cluster) => ({
    restaurant: cluster.restaurant,
    extraCount: cluster.members.length - 1,
    members: cluster.members,
  }));
}

export function clusterContaining<T extends Clusterable>(
  clusters: RestaurantTagCluster<T>[],
  placeId: string | null | undefined,
): RestaurantTagCluster<T> | undefined {
  if (!placeId) return undefined;
  return clusters.find((cluster) =>
    cluster.members.some((member) => member.placeId === placeId),
  );
}
