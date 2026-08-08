import Link from "next/link";
import type { DateTime } from "luxon";
import { BookingChip } from "./booking-chip";
import type { AdminBookingRow } from "@/lib/dashboard/bookings";

const MAX_VISIBLE = 3;

export function CalendarMonthGrid({
  days,
  bookingsByDate,
  timezone,
  today,
  currentMonth,
}: {
  days: DateTime[];
  bookingsByDate: Map<string, AdminBookingRow[]>;
  timezone: string;
  today: DateTime;
  currentMonth: number;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <div className="grid min-w-[700px] grid-cols-7 gap-px bg-border text-sm">
      {days.map((day) => {
        const dateKey = day.toISODate()!;
        const bookings = bookingsByDate.get(dateKey) ?? [];
        const isToday = dateKey === today.toISODate();
        const isOtherMonth = day.month !== currentMonth;

        return (
          <div key={dateKey} className={`min-h-[110px] bg-card p-2 ${isOtherMonth ? "bg-background-secondary" : ""}`}>
            <Link
              href={`/dashboard/calendar?view=day&date=${dateKey}`}
              className={`inline-block text-xs font-medium ${
                isToday
                  ? "rounded-full bg-accent-solid px-1.5 py-0.5 text-white"
                  : isOtherMonth
                    ? "text-foreground-secondary"
                    : "text-foreground"
              }`}
            >
              {day.day}
            </Link>
            <div className="mt-1 space-y-0.5">
              {bookings.slice(0, MAX_VISIBLE).map((booking) => (
                <BookingChip key={booking.id} booking={booking} timezone={timezone} />
              ))}
              {bookings.length > MAX_VISIBLE && (
                <Link
                  href={`/dashboard/calendar?view=day&date=${dateKey}`}
                  className="block px-1.5 text-xs text-foreground-secondary hover:underline"
                >
                  +{bookings.length - MAX_VISIBLE} ещё
                </Link>
              )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
