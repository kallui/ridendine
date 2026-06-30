import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  NEARBY_PAGE_TOKEN_DELAY_MS,
  NEARBY_SEARCH_PAGE_SIZE,
  fetchNearbyRestaurants,
} from "@/lib/server/google-maps";
import type { PlaceSearchResult } from "@/lib/places-types";

function makePlace(id: string): PlaceSearchResult {
  return {
    place_id: id,
    name: `Restaurant ${id}`,
    geometry: { location: { lat: 49.28, lng: -123.12 } },
    types: ["restaurant"],
  };
}

function makePage(count: number, nextPageToken?: string) {
  return {
    status: "OK",
    results: Array.from({ length: count }, (_, i) =>
      makePlace(`place-${i + 1}`),
    ),
    ...(nextPageToken ? { next_page_token: nextPageToken } : {}),
  };
}

describe("fetchNearbyRestaurants", () => {
  const location = { lat: 49.2827, lng: -123.1207 };
  const radius = 400;

  beforeEach(() => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "test-key");
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns a single page when fewer than 20 results", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makePage(5),
    });
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchNearbyRestaurants(location, radius);
    await vi.runAllTimersAsync();
    const results = await promise;

    expect(results).toHaveLength(5);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toContain("nearbysearch/json");
    expect(fetchMock.mock.calls[0]?.[0]).not.toContain("pagetoken=");
  });

  it("does not paginate when pagination is disabled (default)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makePage(NEARBY_SEARCH_PAGE_SIZE, "token-page-2"),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makePage(8),
      });
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchNearbyRestaurants(location, radius);
    await vi.runAllTimersAsync();
    const results = await promise;

    expect(results).toHaveLength(NEARBY_SEARCH_PAGE_SIZE);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("does not paginate when page 1 is full but has no next_page_token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makePage(NEARBY_SEARCH_PAGE_SIZE),
    });
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchNearbyRestaurants(location, radius);
    await vi.runAllTimersAsync();
    const results = await promise;

    expect(results).toHaveLength(NEARBY_SEARCH_PAGE_SIZE);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("fetches additional pages when page 1 is full and has next_page_token", async () => {
    vi.stubEnv("NEARBY_SEARCH_PAGINATION", "true");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makePage(NEARBY_SEARCH_PAGE_SIZE, "token-page-2"),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makePage(8),
      });
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchNearbyRestaurants(location, radius);
    await vi.advanceTimersByTimeAsync(NEARBY_PAGE_TOKEN_DELAY_MS);
    const results = await promise;

    expect(results).toHaveLength(NEARBY_SEARCH_PAGE_SIZE + 8);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toContain("pagetoken=token-page-2");
  });

  it("caps at three pages (60 results)", async () => {
    vi.stubEnv("NEARBY_SEARCH_PAGINATION", "true");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makePage(NEARBY_SEARCH_PAGE_SIZE, "token-page-2"),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makePage(NEARBY_SEARCH_PAGE_SIZE, "token-page-3"),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makePage(NEARBY_SEARCH_PAGE_SIZE, "token-page-4"),
      });
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchNearbyRestaurants(location, radius);
    await vi.runAllTimersAsync();
    const results = await promise;

    expect(results).toHaveLength(60);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("retries pagetoken requests when Google returns INVALID_REQUEST", async () => {
    vi.stubEnv("NEARBY_SEARCH_PAGINATION", "true");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makePage(NEARBY_SEARCH_PAGE_SIZE, "token-page-2"),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "INVALID_REQUEST" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makePage(3),
      });
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchNearbyRestaurants(location, radius);
    await vi.runAllTimersAsync();
    const results = await promise;

    expect(results).toHaveLength(NEARBY_SEARCH_PAGE_SIZE + 3);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("returns empty array for ZERO_RESULTS on first page", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ZERO_RESULTS" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchNearbyRestaurants(location, radius);
    await vi.runAllTimersAsync();
    const results = await promise;

    expect(results).toEqual([]);
  });

  it("throws on first-page API errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "REQUEST_DENIED",
        error_message: "Invalid key",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchNearbyRestaurants(location, radius);
    await expect(promise).rejects.toThrow("Invalid key");
  });
});
