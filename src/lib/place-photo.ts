/** Allowed photo widths — snapped so the proxy cache hits more often. */
export const PHOTO_WIDTH = {
  thumb: 200,
  card: 400,
  gallery: 800,
} as const;

const MIN_PHOTO_REF_LENGTH = 16;
const MAX_PHOTO_REF_LENGTH = 2048;
const MIN_PLACE_ID_LENGTH = 10;
const MAX_PLACE_ID_LENGTH = 300;

export function isValidPhotoReference(ref: string): boolean {
  return (
    ref.length >= MIN_PHOTO_REF_LENGTH &&
    ref.length <= MAX_PHOTO_REF_LENGTH &&
    !/[\s"'\\]/.test(ref) &&
    !ref.includes("://")
  );
}

export function isValidPlaceId(placeId: string): boolean {
  return (
    placeId.length >= MIN_PLACE_ID_LENGTH &&
    placeId.length <= MAX_PLACE_ID_LENGTH &&
    /^[A-Za-z0-9_-]+$/.test(placeId)
  );
}

/** Clamp and snap requested width to 200 / 400 / 800. */
export function parsePhotoWidth(raw: string | null): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  const width = Number.isFinite(parsed) ? parsed : PHOTO_WIDTH.card;
  if (width <= PHOTO_WIDTH.thumb) return PHOTO_WIDTH.thumb;
  if (width <= PHOTO_WIDTH.card) return PHOTO_WIDTH.card;
  return PHOTO_WIDTH.gallery;
}

export function placePhotoSrc(
  photoReference: string,
  width: number = PHOTO_WIDTH.card,
): string {
  const params = new URLSearchParams({
    ref: photoReference,
    w: String(width),
  });
  return `/api/places/photo?${params.toString()}`;
}

export function attributionText(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}
