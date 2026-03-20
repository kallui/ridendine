import RouteOptionCard from "./RouteOptionCard";

interface RouteSelectionPanelProps {
  routes: google.maps.DirectionsRoute[];
  selectedRouteIndex: number | null;
  onRouteSelect: (routeIndex: number) => void;
  // mobileMode: renders without h-full container or inner scroll
  // (the BottomSheet owns scrolling in this case)
  mobileMode?: boolean;
}

export default function RouteSelectionPanel({
  routes,
  selectedRouteIndex,
  onRouteSelect,
  mobileMode,
}: RouteSelectionPanelProps) {
  if (routes.length === 0) return null;

  const recommendedRouteIndex = routes.reduce((bestIndex, route, index) => {
    const bestDuration = routes[bestIndex].legs[0].duration?.value ?? Infinity;
    const currentDuration = route.legs[0].duration?.value ?? Infinity;
    return currentDuration < bestDuration ? index : bestIndex;
  }, 0);

  // Mobile: flat list, no fixed-height container, BottomSheet handles scroll
  if (mobileMode) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-text-primary text-base font-semibold">
              Route Options
            </span>
          </div>
          <div className="space-y-2">
            {routes.map((route, index) => (
              <RouteOptionCard
                key={index}
                route={route}
                routeIndex={index}
                isSelected={selectedRouteIndex === index}
                isRecommended={index === recommendedRouteIndex}
                onSelect={onRouteSelect}
              />
            ))}
          </div>
          {selectedRouteIndex === null && (
            <p className="text-text-secondary text-sm text-center">
              Choose a route to preview nearby restaurants
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-card-bg rounded-lg shadow-xl border border-border p-4 sm:p-6">
      <div className="mb-3 shrink-0">
        <h3 className="text-text-primary font-semibold text-lg tracking-tight">
          Route Options
        </h3>
      </div>
      <div className="relative flex-1 min-h-0">
        <div className="space-y-2 overflow-y-auto h-full pb-6 pr-3 -mr-2">
          {routes.map((route, index) => (
            <RouteOptionCard
              key={index}
              route={route}
              routeIndex={index}
              isSelected={selectedRouteIndex === index}
              isRecommended={index === recommendedRouteIndex}
              onSelect={onRouteSelect}
            />
          ))}
        </div>
      </div>
      {selectedRouteIndex === null && (
        <p className="text-text-secondary text-sm mt-3 text-center shrink-0">
          Choose a route to preview nearby restaurants
        </p>
      )}
    </div>
  );
}
