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
  const transitSteps = leg.steps.filter(
    (step) => step.travel_mode === google.maps.TravelMode.TRANSIT,
  );
  if (transitSteps.length === 0) return "🚶 Walk";
  return transitSteps
    .map((step) => {
      const line = step.transit?.line;
      const icon = getVehicleIcon(line?.vehicle?.type || "");
      const name = line?.short_name || line?.name || "";
      return name ? `${icon} ${name}` : null;
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

  const transitSteps = leg.steps.filter(
    (step) => step.travel_mode === google.maps.TravelMode.TRANSIT,
  );
  const transfers = Math.max(0, transitSteps.length - 1);

  // Use the exported utility
  const routeHeadline = getRouteHeadline(route);

  return (
    <button
      onClick={() => onSelect(routeIndex)}
      className={`relative w-full text-left px-4 py-3 rounded-lg border transition-colors ${
        isSelected
          ? "border-primary bg-primary/10"
          : "border-border bg-card-bg hover:border-primary/40"
      }`}
    >
      {isSelected && (
        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary" />
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-semibold text-text-primary text-sm truncate">
              {routeHeadline}
            </div>
            {isRecommended && !isSelected && (
              <span className="shrink-0 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                Best
              </span>
            )}
            {isSelected && (
              <span className="shrink-0 inline-flex items-center rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
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
