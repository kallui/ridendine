function isQuotaTestMode(): boolean {
  return (
    process.env.RATE_LIMIT_TEST === "true" ||
    process.env.NEXT_PUBLIC_RATE_LIMIT_TEST === "true"
  );
}

const testMode = isQuotaTestMode();

/** Max route searches per user in one rolling window. */
export const QUOTA_LIMIT = testMode ? 3 : 5;

/** Rolling window duration in ms (1 min in test mode, 24 h in production). */
export const QUOTA_WINDOW_MS = testMode ? 60_000 : 24 * 60 * 60 * 1000;

/** Minimum ms between searches — prevents accidental double-submit. */
export const SEARCH_COOLDOWN_MS = testMode ? 1_000 : 3_000;
