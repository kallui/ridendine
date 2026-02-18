interface RouteOptionCardProps {
  route: google.maps.DirectionsRoute;
  routeIndex: number;
  isSelected: boolean;
  onSelect: (routeIndex: number) => void;
}

export default function RouteOptionCard({
  route,
  routeIndex,
  isSelected,
  onSelect,
}: RouteOptionCardProps) {
  const leg = route.legs[0];
  const duration = leg.duration?.text || "N/A";
  const distance = leg.distance?.text || "N/A";

  // Count number of transit steps (excluding walking)
  const transitSteps = leg.steps.filter(
    (step) => step.travel_mode === google.maps.TravelMode.TRANSIT,
  );
  const transfers = Math.max(0, transitSteps.length - 1);

  // Extract transit details (line names, directions)
  const transitDetails = transitSteps
    .map((step) => {
      const transit = step.transit;
      if (!transit) return null;

      const line = transit.line;
      const vehicle = line?.vehicle?.type || "";
      const lineName = line?.short_name || line?.name || "";
      const headsign = transit.headsign || ""; // Direction/destination

      return {
        vehicle,
        lineName,
        headsign,
      };
    })
    .filter(Boolean);

  // Map vehicle types to icons
  const getVehicleIcon = (type: string) => {
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
  };

  return (
    <button
      onClick={() => onSelect(routeIndex)}
      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
        isSelected
          ? "border-primary bg-primary/10"
          : "border-border bg-card-bg hover:border-primary/50"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Route Info */}
        <div className="flex-1">
          <div className="text-text-primary font-semibold text-lg mb-1">
            {duration}
          </div>
          <div className="text-text-secondary text-sm mb-2">
            {distance} •{" "}
            {transfers === 0
              ? "Direct"
              : `${transfers} transfer${transfers > 1 ? "s" : ""}`}
          </div>

          {/* Transit Details */}
          <div className="space-y-1">
            {transitDetails.map((detail, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs text-text-secondary"
              >
                <span className="text-base">
                  {getVehicleIcon(detail.vehicle)}
                </span>
                <span className="font-medium text-text-primary">
                  {detail.lineName}
                </span>
                {detail.headsign && (
                  <span className="truncate">→ {detail.headsign}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Selection Indicator */}
        {isSelected && (
          <div className="shrink-0">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <span className="text-white text-sm">✓</span>
            </div>
          </div>
        )}
      </div>
    </button>
  );
}
