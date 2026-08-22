import { describe, expect, it } from "vitest";
import { coverAsPhotos, initialPlacePhotos } from "./place-photo-cache";

describe("coverAsPhotos", () => {
  it("returns an empty list without a cover", () => {
    expect(coverAsPhotos()).toEqual([]);
  });

  it("wraps a cover reference as a single photo", () => {
    expect(coverAsPhotos("cover-ref")).toEqual([
      { photoReference: "cover-ref", htmlAttributions: [] },
    ]);
  });
});

describe("initialPlacePhotos", () => {
  it("falls back to the cover when the cache is empty", () => {
    expect(initialPlacePhotos("ChIJunknownPlaceId", "cover-ref")).toEqual([
      { photoReference: "cover-ref", htmlAttributions: [] },
    ]);
  });
});
