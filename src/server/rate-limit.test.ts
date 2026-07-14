import { describe, expect, it } from "vitest";

import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows up to the limit per window per key, then resets", () => {
    const check = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(check("a", 0).allowed).toBe(true);
    expect(check("a", 10).allowed).toBe(true);
    expect(check("a", 20)).toEqual({ allowed: false, retryAfterMs: 980 });
    expect(check("b", 20).allowed).toBe(true);
    expect(check("a", 1000).allowed).toBe(true);
  });
});
