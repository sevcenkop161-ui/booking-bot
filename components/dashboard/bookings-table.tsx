import Link from "next/link";
import { DateTime } from "luxon";
import { StatusBadge } from "@/components/ui/status-badge";
import { BookingActions } from "@/components/dashboard/booking-actions";
import type { AdminBookingRow } from "@/lib/dashboard/bookings";

export function BookingsTable({
  bookings,
  timezone,
}: {
  bookings: AdminBookingRow[];
  timezone: string;
}) {
  if (bookings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-foreground-secondary">
        Записей не найдено.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-background-secondary text-left text-xs font-medium uppercase tracking-wide text-foreground-secondary">
          <tr>
            <th className="px-4 py-3">Дата и время</th>
            <th className="px-4 py-3">Клиент</th>
            <th className="px-4 py-3">Услуга</th>
            <th className="px-4 py-3">Мастер</th>
            <th className="px-4 py-3">Статус</th>
            <th className="px-4 py-3">Действия</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {bookings.map((booking) => (
            <tr key={booking.id}>
              <td className="whitespace-nowrap px-4 py-3 text-foreground">
                <Link href={`/dashboard/bookings/${booking.id}`} className="hover:underline">
                  {DateTime.fromISO(booking.start_time, { zone: timezone })
                    .setLocale("ru")
                    .toFormat("d MMM, HH:mm")}
                </Link>
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-foreground">{booking.client.first_name ?? "—"}</div>
                <div className="text-xs text-foreground-secondary">
                  {booking.client.phone ?? (booking.client.username ? `@${booking.client.username}` : "")}
                </div>
              </td>
              <td className="px-4 py-3 text-foreground">{booking.service.name}</td>
              <td className="px-4 py-3 text-foreground">{booking.artist.name}</td>
              <td className="px-4 py-3">
                <StatusBadge status={booking.status} />
              </td>
              <td className="px-4 py-3">
                <BookingActions bookingId={booking.id} status={booking.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
