import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryBusiness } from "@/lib/business";
import { getBookingsInRange, type AdminBookingRow } from "@/lib/dashboard/bookings";
import { computeCalendarRange, daysInRange, type CalendarView } from "@/lib/dashboard/calendar-range";
import { CalendarNav } from "@/components/dashboard/calendar-nav";
import { CalendarDaysColumns } from "@/components/dashboard/calendar-days-columns";
import { CalendarMonthGrid } from "@/components/dashboard/calendar-month-grid";

function isView(value: string | undefined): value is CalendarView {
  return value === "day" || value === "week" || value === "month";
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const business = await getPrimaryBusiness(supabase);
  if (!business) {
    return <p className="text-gray-500">Бизнес не найден.</p>;
  }

  const view: CalendarView = isView(params.view) ? params.view : "week";
  const today = DateTime.now().setZone(business.timezone);
  const parsedAnchor = params.date ? DateTime.fromISO(params.date, { zone: business.timezone }) : today;
  const anchor = parsedAnchor.isValid ? parsedAnchor : today;

  const range = computeCalendarRange(view, anchor);
  const days = daysInRange(range);

  const bookings = await getBookingsInRange(
    supabase,
    business.id,
    range.start.toUTC().toISO()!,
    range.end.toUTC().toISO()!
  );

  const bookingsByDate = new Map<string, AdminBookingRow[]>();
  for (const booking of bookings) {
    const list = bookingsByDate.get(booking.date) ?? [];
    list.push(booking);
    bookingsByDate.set(booking.date, list);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-900">Календарь</h1>
      <CalendarNav view={view} anchor={anchor} today={today} />
      {view === "month" ? (
        <CalendarMonthGrid
          days={days}
          bookingsByDate={bookingsByDate}
          timezone={business.timezone}
          today={today}
          currentMonth={anchor.month}
        />
      ) : (
        <CalendarDaysColumns days={days} bookingsByDate={bookingsByDate} timezone={business.timezone} today={today} />
      )}
    </div>
  );
}
