import { describe, expect, it } from "vitest";
import { getClientIp } from "@/lib/server/session";

describe("getClientIp", () => {
  it("uses the first hop from x-forwarded-for", () => {
    const request = new Request("http://test", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(request)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    const request = new Request("http://test", {
      headers: { "x-real-ip": "9.9.9.9" },
    });
    expect(getClientIp(request)).toBe("9.9.9.9");
  });

  it("returns unknown when no ip headers are present", () => {
    const request = new Request("http://test");
    expect(getClientIp(request)).toBe("unknown");
  });
});
