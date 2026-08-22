import { GTFS_SMOKE_CASES } from "@/lib/gtfs-smoke/cases";

export type DevQuickSearch = {
  origin: string;
  destination: string;
  label: string;
};

const DEFAULT_CASE = GTFS_SMOKE_CASES[0];

/**
 * One-click demo route for local UI work.
 * Shown in `next dev` unless NEXT_PUBLIC_DEV_QUICK_SEARCH=false.
 * Set that env to a smoke-case id (e.g. TL-1) or override origin/destination.
 */
export function getDevQuickSearch(): DevQuickSearch | null {
  if (process.env.NODE_ENV !== "development") return null;

  const flag = process.env.NEXT_PUBLIC_DEV_QUICK_SEARCH?.trim();
  if (flag === "false") return null;

  const origin = process.env.NEXT_PUBLIC_DEV_QUICK_ORIGIN?.trim();
  const destination = process.env.NEXT_PUBLIC_DEV_QUICK_DESTINATION?.trim();
  if (origin && destination) {
    return { origin, destination, label: "Custom" };
  }

  const smoke =
    flag && flag !== "true"
      ? GTFS_SMOKE_CASES.find((c) => c.id.toLowerCase() === flag.toLowerCase())
      : DEFAULT_CASE;

  if (!smoke) return null;

  return {
    origin: smoke.origin,
    destination: smoke.destination,
    label: smoke.id,
  };
}
