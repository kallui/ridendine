/**
 * Strips GTFS platform suffixes from stop names for display.
 * e.g. "Commercial-Broadway Station @ Platform 1" → "Commercial-Broadway Station"
 */
export function formatStopName(name: string): string {
  return name.replace(/\s*@\s*Platform\s+\d+\s*$/i, "").trim();
}
