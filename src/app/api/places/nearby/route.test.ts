import { beforeEach, describe, expect, it, vi } from "vitest";
import { createJsonRequest } from "@/test/fixtures/request-helpers";

const fetchNearbyRestaurantsBatch = vi.fn();

vi.mock("@/lib/server/google-maps", () => ({
  fetchNearbyRestaurantsBatch: (...args: unknown[]) =>
    fetchNearbyRestaurantsBatch(...args),
}));

import { POST } from "@/app/api/places/nearby/route";

describe("POST /api/places/nearby", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchNearbyRestaurantsBatch.mockResolvedValue([{ id: "place-1" }]);
  });

  it("returns 400 for invalid json", async () => {
    const request = new Request("http://test/api/places/nearby", {
      method: "POST",
      body: "{",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 when points are missing", async () => {
    const response = await POST(
      createJsonRequest("http://test/api/places/nearby", {}),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("missing_fields");
  });

  it("returns 400 when more than 25 points are provided", async () => {
    const points = Array.from({ length: 26 }, (_, i) => ({ lat: i, lng: i }));
    const response = await POST(
      createJsonRequest("http://test/api/places/nearby", { points }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("too_many_points");
  });

  it("returns 400 for invalid radius", async () => {
    const response = await POST(
      createJsonRequest("http://test/api/places/nearby", {
        points: [{ lat: 0, lng: 0 }],
        radius: 99,
      }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("invalid_radius");
  });

  it("returns 200 for valid requests", async () => {
    const response = await POST(
      createJsonRequest("http://test/api/places/nearby", {
        points: [{ lat: 40.7, lng: -74.0 }],
        radius: 1300,
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.places).toHaveLength(1);
    expect(fetchNearbyRestaurantsBatch).toHaveBeenCalledOnce();
  });
});
