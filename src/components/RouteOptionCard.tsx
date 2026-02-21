interface RouteOptionCardProps {
  route: google.maps.DirectionsRoute;
  routeIndex: number;
  isSelected: boolean;
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
      className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
        isSelected
          ? "border-primary bg-primary/10"
          : "border-border bg-card-bg hover:border-primary/50"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Transit lines as headline */}
          <div className="font-semibold text-text-primary text-sm truncate">
            {routeHeadline}
          </div>
          {/* Duration + transfers */}
          <div className="text-xs text-text-muted mt-0.5">
            {duration} ·{" "}
            {transfers === 0
              ? "Direct"
              : `${transfers} transfer${transfers > 1 ? "s" : ""}`}
          </div>
        </div>

        {isSelected && (
          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="text-white text-xs">✓</span>
          </div>
        )}
      </div>
    </button>
  );
}
