import RouteOptionCard, { getRouteHeadline } from "./RouteOptionCard";

interface RouteSelectionPanelProps {
  routes: google.maps.DirectionsRoute[];
  selectedRouteIndex: number | null;
  onRouteSelect: (routeIndex: number) => void;
  // mobileMode: renders without h-full container or inner scroll
  // (the BottomSheet owns scrolling in this case)
  mobileMode?: boolean;
  collapsed?: boolean;
  onExpand?: () => void;
  /** Flush section inside the desktop split panel (no floating card chrome). */
  embedded?: boolean;
}

export default function RouteSelectionPanel({
  routes,
  selectedRouteIndex,
  onRouteSelect,
  mobileMode,
  collapsed,
  onExpand,
  embedded,
}: RouteSelectionPanelProps) {
  if (routes.length === 0) return null;

  const recommendedRouteIndex = routes.reduce((bestIndex, route, index) => {
    const bestDuration = routes[bestIndex].legs[0].duration?.value ?? Infinity;
    const currentDuration = route.legs[0].duration?.value ?? Infinity;
    return currentDuration < bestDuration ? index : bestIndex;
  }, 0);

  const selectedRoute =
    selectedRouteIndex !== null ? routes[selectedRouteIndex] : null;

  if (collapsed && selectedRoute && onExpand) {
    const duration = selectedRoute.legs[0]?.duration?.text;
    return (
      <button
        type="button"
        onClick={onExpand}
        className={
          embedded
            ? "flex w-full items-center gap-2 border-b border-border px-3 py-2.5 text-left transition-colors hover:bg-accent-soft"
            : "flex w-full items-center gap-2 rounded-lg border border-border bg-card-bg px-3 py-2.5 text-left shadow-lg transition-colors hover:border-text-muted hover:bg-accent-soft hover:shadow-md"
        }
        aria-label="Change route"
      >
        <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
          {getRouteHeadline(selectedRoute)}
        </span>
        {duration && (
          <span className="shrink-0 text-xs text-text-muted">{duration}</span>
        )}
        <svg
          className="h-3.5 w-3.5 shrink-0 text-text-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
    );
  }

  const list = (
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
  );

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
          {list}
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
    <div
      className={`flex w-full min-h-0 flex-1 flex-col ${
        embedded
          ? ""
          : `rounded-lg border border-border bg-card-bg p-4 shadow-xl sm:p-6 ${
              selectedRouteIndex !== null ? "max-h-80" : "h-full"
            }`
      }`}
    >
      <div
        className={`flex shrink-0 items-center justify-between gap-2 ${
          embedded ? "border-b border-border px-3 py-2" : "mb-3"
        }`}
      >
        <h3 className="text-sm font-semibold tracking-tight text-text-primary">
          Route Options
        </h3>
        {selectedRouteIndex !== null && onExpand && (
          <span className="text-xs text-text-muted">Pick another</span>
        )}
      </div>
      <div className="relative min-h-0 flex-1">
        <div
          className={`h-full space-y-2 overflow-y-auto pb-2 ${
            embedded ? "px-3 pt-2" : "pr-3 -mr-2"
          }`}
        >
          {list}
        </div>
      </div>
      {selectedRouteIndex === null && (
        <p
          className={`shrink-0 text-center text-sm text-text-secondary ${
            embedded ? "px-4 py-3" : "mt-3"
          }`}
        >
          Choose a route to preview nearby restaurants
        </p>
      )}
    </div>
  );
}
