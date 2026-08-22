interface TripEndpointsProps {
  origin: string;
  destination: string;
}

/** Shared origin → destination summary used by search and restaurant-list headers. */
export default function TripEndpoints({
  origin,
  destination,
}: TripEndpointsProps) {
  return (
    <span className="flex min-w-0 flex-1 items-center text-sm">
      <span className="min-w-0 truncate text-text-muted">{origin}</span>
      <span className="mx-1.5 shrink-0 text-text-muted" aria-hidden>
        →
      </span>
      <span className="min-w-0 truncate text-text-primary">{destination}</span>
    </span>
  );
}
