import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { getAvailableSlots } from "./getAvailableSlots";
import type { AvailabilityInput, BreakPeriod, WorkingHours } from "./types";

// Europe/Moscow has had a fixed UTC+3 offset (no DST) since 2014, which
// makes it a good timezone to test against: the expected UTC instants
// below don't shift depending on the time of year.
const ZONE = "Europe/Moscow";
const DATE = "2026-08-19";
const DAY_OF_WEEK = DateTime.fromISO(DATE, { zone: ZONE }).weekday % 7;

const NO_RULES_LIMIT = { bookingIntervalMinutes: 30, minBookingNoticeMinutes: 0, maxBookingDays: 30 };

function localTime(hour: number, minute = 0): Date {
  return DateTime.fromISO(DATE, { zone: ZONE }).set({ hour, minute }).toJSDate();
}

function toUtcIso(hour: number, minute = 0): string {
  return DateTime.fromISO(DATE, { zone: ZONE }).set({ hour, minute }).toUTC().toISO()!;
}

function baseInput(overrides: Partial<AvailabilityInput> = {}): AvailabilityInput {
  const workingHours: WorkingHours[] = [
    { dayOfWeek: DAY_OF_WEEK, startTime: "10:00", endTime: "18:00", isWorking: true },
  ];
  return {
    date: DATE,
    businessTimezone: ZONE,
    serviceDurationMinutes: 30,
    workingHours,
    breaks: [],
    timeOff: [],
    existingBookings: [],
    rules: NO_RULES_LIMIT,
    now: localTime(8),
    ...overrides,
  };
}

describe("getAvailableSlots", () => {
  it("returns every interval-aligned slot across the working window when nothing blocks it", () => {
    const slots = getAvailableSlots(baseInput());
    expect(slots.map((s) => s.label)).toEqual([
      "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
      "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
    ]);
  });

  it("does not offer a slot that would end after closing time", () => {
    const slots = getAvailableSlots(baseInput({ serviceDurationMinutes: 120 }));
    const labels = slots.map((s) => s.label);
    expect(labels[labels.length - 1]).toBe("16:00");
    expect(labels).not.toContain("16:30");
    expect(labels).not.toContain("17:00");
  });

  it("removes slots that would overlap a break", () => {
    const breaks: BreakPeriod[] = [{ dayOfWeek: DAY_OF_WEEK, startTime: "14:00", endTime: "15:00" }];
    const slots = getAvailableSlots(baseInput({ serviceDurationMinutes: 60, breaks }));
    const labels = slots.map((s) => s.label);

    expect(labels).toContain("13:00"); // 13:00-14:00, ends exactly at the break
    expect(labels).toContain("15:00"); // 15:00-16:00, starts exactly after the break
    expect(labels).not.toContain("13:30"); // would run into the break
    expect(labels).not.toContain("14:00"); // inside the break
    expect(labels).not.toContain("14:30"); // would run into the break
    expect(labels).toHaveLength(12);
  });

  it("removes slots that would overlap an existing booking", () => {
    const slots = getAvailableSlots(
      baseInput({
        serviceDurationMinutes: 60,
        existingBookings: [{ startTime: toUtcIso(12), endTime: toUtcIso(13) }],
      })
    );
    const labels = slots.map((s) => s.label);

    expect(labels).toContain("11:00"); // 11:00-12:00, ends exactly at the booking
    expect(labels).toContain("13:00"); // 13:00-14:00, starts exactly after the booking
    expect(labels).not.toContain("11:30");
    expect(labels).not.toContain("12:00");
    expect(labels).not.toContain("12:30");
  });

  it("returns no slots on a day the artist doesn't work", () => {
    const workingHours: WorkingHours[] = [
      { dayOfWeek: DAY_OF_WEEK, startTime: "10:00", endTime: "18:00", isWorking: false },
    ];
    expect(getAvailableSlots(baseInput({ workingHours }))).toEqual([]);
  });

  it("returns no slots while the artist is on time off", () => {
    const slots = getAvailableSlots(
      baseInput({ timeOff: [{ startDate: DATE, endDate: DATE }] })
    );
    expect(slots).toEqual([]);
  });

  it("respects the minimum booking notice", () => {
    const slots = getAvailableSlots(
      baseInput({
        now: localTime(9),
        rules: { ...NO_RULES_LIMIT, minBookingNoticeMinutes: 180 },
      })
    );
    const labels = slots.map((s) => s.label);
    expect(labels[0]).toBe("12:00");
    expect(labels).not.toContain("11:30");
  });

  it("returns no slots beyond the maximum booking horizon", () => {
    const farDate = DateTime.fromISO(DATE, { zone: ZONE }).plus({ days: 6 }).toISODate()!;
    const slots = getAvailableSlots(
      baseInput({
        date: farDate,
        workingHours: [],
        now: localTime(8),
        rules: { ...NO_RULES_LIMIT, maxBookingDays: 5 },
      })
    );
    expect(slots).toEqual([]);
  });

  it("produces UTC instants that correctly round-trip back to the local label", () => {
    const slots = getAvailableSlots(baseInput());
    const first = slots[0];
    expect(first.startTime).toBe(toUtcIso(10));
    expect(DateTime.fromISO(first.startTime, { zone: ZONE }).toFormat("HH:mm")).toBe("10:00");
  });
});
