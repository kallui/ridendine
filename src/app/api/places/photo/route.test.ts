import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchPlacePhotoMedia = vi.fn();

vi.mock("@/lib/server/google-maps", () => ({
  fetchPlacePhotoMedia: (...args: unknown[]) => fetchPlacePhotoMedia(...args),
}));

import { GET } from "@/app/api/places/photo/route";

describe("GET /api/places/photo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchPlacePhotoMedia.mockResolvedValue({
      body: new ArrayBuffer(8),
      contentType: "image/jpeg",
    });
  });

  it("returns 400 for a missing ref", async () => {
    const response = await GET(
      new Request("http://test/api/places/photo"),
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for a URL-like ref", async () => {
    const response = await GET(
      new Request(
        "http://test/api/places/photo?ref=https://evil.example/photo-reference",
      ),
    );
    expect(response.status).toBe(400);
    expect(fetchPlacePhotoMedia).not.toHaveBeenCalled();
  });

  it("returns an image for a valid ref", async () => {
    const ref = "Aap_uEA7ob0Q-_c8tET_xCMa7k9pQ2nLmN0photoRefValue";
    const response = await GET(
      new Request(`http://test/api/places/photo?ref=${ref}&w=200`),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
    expect(fetchPlacePhotoMedia).toHaveBeenCalledWith(ref, 200);
  });
});
