import { DateTime } from "luxon";
import { subtractIntervals, type Interval } from "./intervals";
import type { AvailabilityInput, AvailableSlot } from "./types";

// Working Hours - Breaks - Time Off - Existing Bookings = Available Slots
// (PROJECT_SPEC.md section 51). Everything is converted to UTC instants
// immediately, so overlap math never has to think about timezones again.
export function getAvailableSlots(input: AvailabilityInput): AvailableSlot[] {
  const {
    date,
    businessTimezone,
    serviceDurationMinutes,
    workingHours,
    breaks,
    timeOff,
    existingBookings,
    rules,
    now = new Date(),
  } = input;

  const targetDate = DateTime.fromISO(date, { zone: businessTimezone });
  if (!targetDate.isValid) {
    throw new Error(`Invalid date: ${date}`);
  }

  // Luxon's weekday is 1 (Monday) .. 7 (Sunday); convert to Postgres's
  // EXTRACT(DOW) convention of 0 (Sunday) .. 6 (Saturday).
  const dayOfWeek = targetDate.weekday % 7;

  const maxDate = DateTime.fromJSDate(now, { zone: businessTimezone })
    .startOf("day")
    .plus({ days: rules.maxBookingDays });
  if (targetDate.startOf("day").toMillis() > maxDate.toMillis()) {
    return [];
  }

  const isOnTimeOff = timeOff.some(
    (period) => date >= period.startDate && date <= period.endDate
  );
  if (isOnTimeOff) {
    return [];
  }

  const todayHours = workingHours.find((wh) => wh.dayOfWeek === dayOfWeek);
  if (!todayHours || !todayHours.isWorking) {
    return [];
  }

  const workStart = localTimeToUtcMillis(date, todayHours.startTime, businessTimezone);
  const workEnd = localTimeToUtcMillis(date, todayHours.endTime, businessTimezone);

  const breakIntervals: Interval[] = breaks
    .filter((b) => b.dayOfWeek === dayOfWeek)
    .map((b) => ({
      start: localTimeToUtcMillis(date, b.startTime, businessTimezone),
      end: localTimeToUtcMillis(date, b.endTime, businessTimezone),
    }));

  const bookingIntervals: Interval[] = existingBookings
    .map((b) => ({ start: Date.parse(b.startTime), end: Date.parse(b.endTime) }))
    .filter((b) => b.start < workEnd && b.end > workStart);

  const freeIntervals = subtractIntervals(
    [{ start: workStart, end: workEnd }],
    [...breakIntervals, ...bookingIntervals]
  );

  const durationMs = serviceDurationMinutes * 60_000;
  const stepMs = rules.bookingIntervalMinutes * 60_000;
  const earliestStart = now.getTime() + rules.minBookingNoticeMinutes * 60_000;

  const slots: AvailableSlot[] = [];
  for (let candidate = workStart; candidate + durationMs <= workEnd; candidate += stepMs) {
    if (candidate < earliestStart) continue;

    const fitsInFreeInterval = freeIntervals.some(
      (interval) => candidate >= interval.start && candidate + durationMs <= interval.end
    );
    if (!fitsInFreeInterval) continue;

    slots.push({
      startTime: new Date(candidate).toISOString(),
      endTime: new Date(candidate + durationMs).toISOString(),
      label: DateTime.fromMillis(candidate, { zone: businessTimezone }).toFormat("HH:mm"),
    });
  }

  return slots;
}

export function hasAnyAvailability(input: AvailabilityInput): boolean {
  return getAvailableSlots(input).length > 0;
}

function localTimeToUtcMillis(date: string, time: string, zone: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return DateTime.fromISO(date, { zone })
    .set({ hour, minute, second: 0, millisecond: 0 })
    .toUTC()
    .toMillis();
}
