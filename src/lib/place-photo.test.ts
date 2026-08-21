import { describe, expect, it } from "vitest";
import {
  PHOTO_WIDTH,
  attributionText,
  isValidPhotoReference,
  isValidPlaceId,
  parsePhotoWidth,
  placePhotoSrc,
} from "./place-photo";

describe("isValidPhotoReference", () => {
  it("accepts a typical Google photo_reference", () => {
    expect(
      isValidPhotoReference("Aap_uEA7ob0Q-_c8tET_xCMa7k9pQ2nLmN0photoRefValue"),
    ).toBe(true);
  });

  it("rejects short, spaced, or URL-like values", () => {
    expect(isValidPhotoReference("short")).toBe(false);
    expect(isValidPhotoReference("photo reference with spaces____")).toBe(false);
    expect(
      isValidPhotoReference("https://evil.example/photo-reference-value"),
    ).toBe(false);
  });
});

describe("isValidPlaceId", () => {
  it("accepts a ChIJ place id", () => {
    expect(isValidPlaceId("ChIJt2BdK0muEmsRUrB72QnQRxw")).toBe(true);
  });

  it("rejects empty or punctuation-heavy ids", () => {
    expect(isValidPlaceId("")).toBe(false);
    expect(isValidPlaceId("abc")).toBe(false);
    expect(isValidPlaceId("place/id/with/slashes")).toBe(false);
  });
});

describe("parsePhotoWidth", () => {
  it("snaps to 200, 400, or 800", () => {
    expect(parsePhotoWidth(null)).toBe(PHOTO_WIDTH.card);
    expect(parsePhotoWidth("120")).toBe(PHOTO_WIDTH.thumb);
    expect(parsePhotoWidth("400")).toBe(PHOTO_WIDTH.card);
    expect(parsePhotoWidth("801")).toBe(PHOTO_WIDTH.gallery);
  });
});

describe("placePhotoSrc", () => {
  it("builds a proxied photo URL", () => {
    expect(placePhotoSrc("Abcdefghijklmnop", 200)).toBe(
      "/api/places/photo?ref=Abcdefghijklmnop&w=200",
    );
  });
});

describe("attributionText", () => {
  it("strips Google html_attributions tags", () => {
    expect(attributionText('<a href="https://maps.google.com">Jane</a>')).toBe(
      "Jane",
    );
  });
});
