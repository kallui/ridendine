import { fetchPlacePhotoMedia } from "@/lib/server/google-maps";
import { isValidPhotoReference, parsePhotoWidth } from "@/lib/place-photo";

const PHOTO_CACHE_CONTROL = "public, max-age=86400, s-maxage=86400";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get("ref");

  if (!ref || !isValidPhotoReference(ref)) {
    return Response.json(
      { error: "invalid_ref", message: "A valid photo reference is required." },
      { status: 400 },
    );
  }

  const width = parsePhotoWidth(searchParams.get("w"));

  try {
    const { body, contentType } = await fetchPlacePhotoMedia(ref, width);
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": PHOTO_CACHE_CONTROL,
      },
    });
  } catch (error) {
    console.error("Place Photo error:", error);
    return Response.json(
      { error: "photo_error", message: "Failed to fetch place photo." },
      { status: 502 },
    );
  }
}
