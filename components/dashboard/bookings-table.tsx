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
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
        Записей не найдено.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3">Дата и время</th>
            <th className="px-4 py-3">Клиент</th>
            <th className="px-4 py-3">Услуга</th>
            <th className="px-4 py-3">Мастер</th>
            <th className="px-4 py-3">Статус</th>
            <th className="px-4 py-3">Действия</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {bookings.map((booking) => (
            <tr key={booking.id}>
              <td className="whitespace-nowrap px-4 py-3 text-gray-900">
                <Link href={`/dashboard/bookings/${booking.id}`} className="hover:underline">
                  {DateTime.fromISO(booking.start_time, { zone: timezone })
                    .setLocale("ru")
                    .toFormat("d MMM, HH:mm")}
                </Link>
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">{booking.client.first_name ?? "—"}</div>
                <div className="text-xs text-gray-500">
                  {booking.client.phone ?? (booking.client.username ? `@${booking.client.username}` : "")}
                </div>
              </td>
              <td className="px-4 py-3 text-gray-700">{booking.service.name}</td>
              <td className="px-4 py-3 text-gray-700">{booking.artist.name}</td>
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
