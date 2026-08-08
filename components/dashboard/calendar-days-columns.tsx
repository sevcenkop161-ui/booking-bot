import type { DateTime } from "luxon";
import { BookingChip } from "./booking-chip";
import type { AdminBookingRow } from "@/lib/dashboard/bookings";

// Shared by the Day view (1 column) and Week view (7 columns) — a full
// hour-by-hour grid is a UI polish item for a later phase, this is a
// straightforward chronological list per day.
export function CalendarDaysColumns({
  days,
  bookingsByDate,
  timezone,
  today,
}: {
  days: DateTime[];
  bookingsByDate: Map<string, AdminBookingRow[]>;
  timezone: string;
  today: DateTime;
}) {
  return (
    <div className={`grid gap-3 ${days.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-7"}`}>
      {days.map((day) => {
        const dateKey = day.toISODate()!;
        const bookings = bookingsByDate.get(dateKey) ?? [];
        const isToday = dateKey === today.toISODate();

        return (
          <div
            key={dateKey}
            className={`rounded-lg border bg-card p-3 ${isToday ? "border-accent-solid" : "border-border"}`}
          >
            <div className="mb-2 text-xs font-medium text-foreground-secondary">
              {day.setLocale("ru").toFormat("ccc, d MMM")}
            </div>
            {bookings.length === 0 ? (
              <p className="text-xs text-foreground-secondary">Нет записей</p>
            ) : (
              <div className="space-y-1">
                {bookings.map((booking) => (
                  <BookingChip key={booking.id} booking={booking} timezone={timezone} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
