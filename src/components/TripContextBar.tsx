import TripEndpoints from "./TripEndpoints";

interface TripContextBarProps {
  originLabel: string;
  destinationLabel: string;
  routeHeadline: string;
  duration?: string;
  onEditTrip: () => void;
  onEditRoute: () => void;
  onExpandPanel?: () => void;
  floating?: boolean;
}

function displayPlace(label: string): string {
  return label === "Current Location" ? "Current location" : label;
}

export default function TripContextBar({
  originLabel,
  destinationLabel,
  routeHeadline,
  duration,
  onEditTrip,
  onEditRoute,
  onExpandPanel,
  floating = false,
}: TripContextBarProps) {
  return (
    <div
      className={`shrink-0 ${
        floating
          ? "overflow-hidden rounded-lg border border-border bg-card-bg shadow-lg"
          : "border-b border-border"
      }`}
    >
      <button
        type="button"
        onClick={onEditTrip}
        className="flex w-full items-center px-3 py-1.5 text-left hover:bg-accent-soft"
        aria-label="Edit search"
      >
        <TripEndpoints
          origin={displayPlace(originLabel)}
          destination={displayPlace(destinationLabel)}
        />
      </button>
      <button
        type="button"
        onClick={onEditRoute}
        className="flex w-full items-center gap-1.5 border-t border-border px-3 py-1.5 text-left text-xs hover:bg-accent-soft"
        aria-label="Change route"
      >
        <span className="min-w-0 flex-1 truncate text-text-primary">
          {routeHeadline}
        </span>
        {duration && (
          <span className="shrink-0 text-text-muted">{duration}</span>
        )}
      </button>
      {onExpandPanel && (
        <button
          type="button"
          onClick={onExpandPanel}
          className="flex w-full items-center justify-center gap-1 border-t border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-accent-soft hover:text-text-primary"
          aria-label="Show restaurant list"
        >
          Show list
        </button>
      )}
    </div>
  );
}
