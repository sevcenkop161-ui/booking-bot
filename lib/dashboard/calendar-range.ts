import { DateTime } from "luxon";

export type CalendarView = "day" | "week" | "month";

export interface CalendarRange {
  start: DateTime; // inclusive, start of day
  end: DateTime; // exclusive
}

// Weeks start on Monday (Luxon's default for startOf/endOf('week')),
// matching the day_of_week convention used elsewhere in the app.
export function computeCalendarRange(view: CalendarView, anchor: DateTime): CalendarRange {
  if (view === "day") {
    const start = anchor.startOf("day");
    return { start, end: start.plus({ days: 1 }) };
  }

  if (view === "month") {
    const monthStart = anchor.startOf("month").startOf("week");
    const monthEnd = anchor.endOf("month").endOf("week").plus({ milliseconds: 1 });
    return { start: monthStart, end: monthEnd };
  }

  const start = anchor.startOf("week");
  return { start, end: start.plus({ days: 7 }) };
}

export function daysInRange(range: CalendarRange): DateTime[] {
  const days: DateTime[] = [];
  let cursor = range.start;
  while (cursor < range.end) {
    days.push(cursor);
    cursor = cursor.plus({ days: 1 });
  }
  return days;
}

export function shiftAnchor(view: CalendarView, anchor: DateTime, direction: 1 | -1): DateTime {
  if (view === "day") return anchor.plus({ days: direction });
  if (view === "month") return anchor.plus({ months: direction });
  return anchor.plus({ weeks: direction });
}

export function formatRangeLabel(view: CalendarView, anchor: DateTime): string {
  const zoned = anchor.setLocale("ru");
  if (view === "day") return zoned.toFormat("d MMMM yyyy");
  if (view === "month") return zoned.toFormat("LLLL yyyy");

  const range = computeCalendarRange(view, anchor);
  const lastDay = range.end.minus({ days: 1 }).setLocale("ru");
  const firstDay = range.start.setLocale("ru");
  return firstDay.month === lastDay.month
    ? `${firstDay.toFormat("d")} – ${lastDay.toFormat("d MMMM yyyy")}`
    : `${firstDay.toFormat("d MMM")} – ${lastDay.toFormat("d MMM yyyy")}`;
}
