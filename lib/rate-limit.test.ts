import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isRateLimited } from "./rate-limit";

// Every test uses its own random key — the limiter's bucket map is
// module-level shared state with no reset hook, so reusing a key across
// tests would leak counts between them.
function uniqueKey(): string {
  return `test-${Math.random()}`;
}

describe("isRateLimited", () => {
  it("allows requests up to the limit", () => {
    const key = uniqueKey();
    for (let i = 0; i < 5; i++) {
      expect(isRateLimited(key, 5, 10_000)).toBe(false);
    }
  });

  it("blocks the request that exceeds the limit", () => {
    const key = uniqueKey();
    for (let i = 0; i < 5; i++) isRateLimited(key, 5, 10_000);
    expect(isRateLimited(key, 5, 10_000)).toBe(true);
  });

  it("tracks different keys independently", () => {
    const keyA = uniqueKey();
    const keyB = uniqueKey();
    for (let i = 0; i < 5; i++) isRateLimited(keyA, 5, 10_000);
    expect(isRateLimited(keyA, 5, 10_000)).toBe(true);
    expect(isRateLimited(keyB, 5, 10_000)).toBe(false);
  });

  describe("with a fixed clock", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("resets once the window has passed", () => {
      const key = uniqueKey();
      for (let i = 0; i < 5; i++) isRateLimited(key, 5, 1000);
      expect(isRateLimited(key, 5, 1000)).toBe(true);

      vi.advanceTimersByTime(1001);

      expect(isRateLimited(key, 5, 1000)).toBe(false);
    });
  });
});
