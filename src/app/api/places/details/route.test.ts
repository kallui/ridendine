import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchPlacePhotos = vi.fn();

vi.mock("@/lib/server/google-maps", () => ({
  fetchPlacePhotos: (...args: unknown[]) => fetchPlacePhotos(...args),
}));

import { GET } from "@/app/api/places/details/route";

describe("GET /api/places/details", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchPlacePhotos.mockResolvedValue([
      { photoReference: "ref-1-long-enough-value", htmlAttributions: [] },
    ]);
  });

  it("returns 400 for a missing place id", async () => {
    const response = await GET(
      new Request("http://test/api/places/details"),
    );
    expect(response.status).toBe(400);
  });

  it("returns photos for a valid place id", async () => {
    const placeId = "ChIJt2BdK0muEmsRUrB72QnQRxw";
    const response = await GET(
      new Request(`http://test/api/places/details?placeId=${placeId}`),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.photos).toHaveLength(1);
    expect(fetchPlacePhotos).toHaveBeenCalledWith(placeId);
  });
});
