import { describe, expect, it } from "vitest";
import { DAILY_ROUTE_SEARCH_LIMIT } from "@/lib/rate-limit-config";
import { parseApiError } from "@/lib/client/search-guards";

describe("parseApiError", () => {
  it("prefers the message field from json responses", async () => {
    const response = new Response(
      JSON.stringify({ message: "Custom error message" }),
      { status: 400 },
    );
    expect(await parseApiError(response)).toBe("Custom error message");
  });

  it("falls back to the error field", async () => {
    const response = new Response(JSON.stringify({ error: "rate_limit_exceeded" }), {
      status: 429,
    });
    expect(await parseApiError(response)).toBe("rate_limit_exceeded");
  });

  it("uses the daily limit fallback for 429 without json", async () => {
    const response = new Response("not-json", { status: 429 });
    expect(await parseApiError(response)).toContain("Daily limit reached");
    expect(await parseApiError(response)).toContain(
      `${DAILY_ROUTE_SEARCH_LIMIT}/${DAILY_ROUTE_SEARCH_LIMIT}`,
    );
  });

  it("returns a generic message for other failures", async () => {
    const response = new Response("fail", { status: 500 });
    expect(await parseApiError(response)).toBe("Request failed (500)");
  });
});
