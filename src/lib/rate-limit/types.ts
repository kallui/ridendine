export type QuotaResult = {
  limit: number;
  remaining: number;
  /** ms timestamp — when the oldest in-window request exits (remaining goes +1). Null when quota is full. */
  nextIncreaseAt: number | null;
};
