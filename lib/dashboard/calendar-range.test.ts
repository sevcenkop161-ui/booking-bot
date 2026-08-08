import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { computeCalendarRange, daysInRange, shiftAnchor } from "./calendar-range";

const ZONE = "Europe/Moscow";
// 2026-08-12 is a Wednesday.
const WEDNESDAY = DateTime.fromISO("2026-08-12", { zone: ZONE });

describe("computeCalendarRange", () => {
  it("day view covers just that day", () => {
    const range = computeCalendarRange("day", WEDNESDAY);
    expect(range.start.toISODate()).toBe("2026-08-12");
    expect(range.end.toISODate()).toBe("2026-08-13");
  });

  it("week view starts on Monday and spans 7 days", () => {
    const range = computeCalendarRange("week", WEDNESDAY);
    expect(range.start.toISODate()).toBe("2026-08-10"); // Monday
    expect(range.start.weekday).toBe(1);
    expect(daysInRange(range)).toHaveLength(7);
  });

  it("month view pads to full weeks starting Monday", () => {
    const range = computeCalendarRange("month", WEDNESDAY);
    expect(range.start.weekday).toBe(1);
    expect(range.start.toISODate()! <= "2026-08-01").toBe(true);
    // The last day of the padded range should be a Sunday on or after the 31st.
    const lastDay = range.end.minus({ days: 1 });
    expect(lastDay.weekday).toBe(7);
    expect(lastDay.toISODate()! >= "2026-08-31").toBe(true);
    expect(daysInRange(range).length % 7).toBe(0);
  });
});

describe("shiftAnchor", () => {
  it("moves by one day/week/month depending on the view", () => {
    expect(shiftAnchor("day", WEDNESDAY, 1).toISODate()).toBe("2026-08-13");
    expect(shiftAnchor("week", WEDNESDAY, 1).toISODate()).toBe("2026-08-19");
    expect(shiftAnchor("month", WEDNESDAY, -1).toISODate()).toBe("2026-07-12");
  });
});
