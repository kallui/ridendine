import RouteOptionCard from "./RouteOptionCard";

interface RouteSelectionPanelProps {
  routes: google.maps.DirectionsRoute[];
  selectedRouteIndex: number | null;
  onRouteSelect: (routeIndex: number) => void;
  onBack: () => void;
}

export default function RouteSelectionPanel({
  routes,
  selectedRouteIndex,
  onRouteSelect,
  onBack,
}: RouteSelectionPanelProps) {
  if (routes.length === 0) return null;

  return (
    <div className="h-full flex flex-col bg-card-bg rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h3 className="text-text-primary font-semibold text-lg">
          Choose Your Route
        </h3>
        <button
          onClick={onBack}
          className="text-text-secondary hover:text-text-primary text-sm flex items-center gap-1 transition-colors"
        >
          ← Change
        </button>
      </div>
      <div className="relative flex-1 min-h-0">
        <div className="space-y-2 overflow-y-auto h-full pb-6 pr-3 -mr-2">
          {routes.map((route, index) => (
            <RouteOptionCard
              key={index}
              route={route}
              routeIndex={index}
              isSelected={selectedRouteIndex === index}
              onSelect={onRouteSelect}
            />
          ))}
        </div>
      </div>
      {selectedRouteIndex === null && (
        <p className="text-text-secondary text-sm mt-3 text-center shrink-0">
          Select a route to find restaurants
        </p>
      )}
    </div>
  );
}
