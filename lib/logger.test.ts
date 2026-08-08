import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "./logger";

describe("logger", () => {
  afterEach(() => vi.restoreAllMocks());

  it("logs errors as a structured JSON line via console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("booking_failed", { bookingId: "abc" });

    expect(spy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed).toMatchObject({ level: "error", event: "booking_failed", bookingId: "abc" });
    expect(typeof parsed.time).toBe("string");
  });

  it("logs info via console.log", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("booking_created", { bookingId: "xyz" });

    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed).toMatchObject({ level: "info", event: "booking_created", bookingId: "xyz" });
  });

  it("logs warnings via console.warn", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logger.warn("booking_conflict", { bookingId: "xyz" });

    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe("warn");
  });
});
