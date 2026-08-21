import { getStepTransit, isTransitStep } from "@/lib/directions-normalize";
import { formatTransitLineLabel } from "@/lib/alight-hint";

interface RouteOptionCardProps {
  route: google.maps.DirectionsRoute;
  routeIndex: number;
  isSelected: boolean;
  isRecommended?: boolean;
  onSelect: (routeIndex: number) => void;
}

export function getVehicleIcon(type: string): string {
  const icons: { [key: string]: string } = {
    BUS: "🚌",
    SUBWAY: "🚇",
    TRAIN: "🚆",
    TRAM: "🚊",
    RAIL: "🚆",
    HEAVY_RAIL: "🚆",
    COMMUTER_TRAIN: "🚆",
    HIGH_SPEED_TRAIN: "🚄",
    METRO_RAIL: "🚇",
  };
  return icons[type] || "🚌";
}

export function getRouteHeadline(route: google.maps.DirectionsRoute): string {
  const leg = route.legs[0];
  const transitSteps = leg.steps.filter(isTransitStep);
  if (transitSteps.length === 0) return "🚶 Walk";
  return transitSteps
    .map((step) => {
      const line = getStepTransit(step)?.line;
      const icon = getVehicleIcon(line?.vehicle?.type || "");
      const name = line?.short_name || line?.name || "";
      if (!name) return null;
      const label = formatTransitLineLabel({
        routeShortName: name,
        vehicleType: line?.vehicle?.type,
      });
      return `${icon} ${label}`;
    })
    .filter(Boolean)
    .join("   →   ");
}

export default function RouteOptionCard({
  route,
  routeIndex,
  isSelected,
  isRecommended,
  onSelect,
}: RouteOptionCardProps) {
  const leg = route.legs[0];
  const duration = leg.duration?.text || "N/A";

  const transitSteps = leg.steps.filter(isTransitStep);
  const transfers = Math.max(0, transitSteps.length - 1);
  const routeHeadline = getRouteHeadline(route);

  return (
    <button
      onClick={() => onSelect(routeIndex)}
      className={`relative w-full text-left px-4 py-3 rounded-lg border transition-colors ${
        isSelected
          ? "border-text-muted bg-accent-soft"
          : "border-border bg-card-bg hover:border-text-muted"
      }`}
    >
      {isSelected && (
        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-text-primary" />
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate font-semibold text-text-primary text-sm">
              {routeHeadline}
            </div>
            {isRecommended && !isSelected && (
              <span className="shrink-0 inline-flex items-center rounded-full border border-border bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                Best
              </span>
            )}
            {isSelected && (
              <span className="shrink-0 inline-flex items-center rounded-full border border-border bg-accent px-2 py-0.5 text-[10px] font-medium text-text-primary">
                Selected
              </span>
            )}
          </div>
          <div className="text-xs text-text-muted mt-0.5">
            {duration} ·{" "}
            {transfers === 0
              ? "Direct"
              : `${transfers} transfer${transfers > 1 ? "s" : ""}`}
          </div>
        </div>
      </div>
    </button>
  );
}
