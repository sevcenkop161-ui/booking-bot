import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryBusiness } from "@/lib/business";
import { getBookingById } from "@/lib/dashboard/bookings";
import { StatusBadge } from "@/components/ui/status-badge";
import { BookingActions } from "@/components/dashboard/booking-actions";

// Section 24: Booking Details — everything about one booking in one
// place, reached by clicking it from the table or the calendar.
export default async function BookingDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const business = await getPrimaryBusiness(supabase);
  if (!business) notFound();

  const booking = await getBookingById(supabase, business.id, id);
  if (!booking) notFound();

  const zone = business.timezone;
  const rows: [string, string][] = [
    ["ID", booking.id],
    ["Клиент", booking.client.first_name ?? "—"],
    ["Telegram", booking.client.username ? `@${booking.client.username}` : "—"],
    ["Телефон", booking.client.phone ?? "—"],
    ["Услуга", booking.service.name],
    ["Мастер", `${booking.artist.name}${booking.artist.specialization ? ` — ${booking.artist.specialization}` : ""}`],
    ["Дата", DateTime.fromISO(booking.date, { zone }).setLocale("ru").toFormat("d MMMM")],
    ["Время", DateTime.fromISO(booking.start_time, { zone }).toFormat("HH:mm")],
    ["Длительность", `${booking.service.duration_minutes} мин`],
    ["Стоимость", booking.service.price > 0 ? `${booking.service.price} ₽` : "бесплатно"],
    ["Комментарий", booking.comment ?? "—"],
    ["Создана", DateTime.fromISO(booking.created_at, { zone }).toFormat("d MMM yyyy, HH:mm")],
  ];

  return (
    <div className="max-w-xl space-y-4">
      <Link href="/dashboard/bookings" className="text-sm text-foreground-secondary hover:underline">
        ← Все записи
      </Link>

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">Запись</h1>
          <StatusBadge status={booking.status} />
        </div>

        <dl className="divide-y divide-border text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 py-2">
              <dt className="text-foreground-secondary">{label}</dt>
              <dd className="text-right text-foreground">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 border-t border-border pt-4">
          <BookingActions bookingId={booking.id} status={booking.status} size="md" />
        </div>
      </div>
    </div>
  );
}
