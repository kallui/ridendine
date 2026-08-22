import { fetchPlacePhotos } from "@/lib/server/google-maps";
import { isValidPlaceId } from "@/lib/place-photo";

const DETAILS_CACHE_CONTROL = "public, max-age=3600, s-maxage=3600";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("placeId");

  if (!placeId || !isValidPlaceId(placeId)) {
    return Response.json(
      { error: "invalid_place", message: "A valid place id is required." },
      { status: 400 },
    );
  }

  try {
    const photos = await fetchPlacePhotos(placeId);
    return Response.json(
      { photos },
      {
        headers: {
          "Cache-Control": DETAILS_CACHE_CONTROL,
        },
      },
    );
  } catch (error) {
    console.error("Place Details error:", error);
    return Response.json(
      { error: "details_error", message: "Failed to fetch place photos." },
      { status: 502 },
    );
  }
}
