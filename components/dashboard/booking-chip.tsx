import Link from "next/link";
import { DateTime } from "luxon";
import type { AdminBookingRow } from "@/lib/dashboard/bookings";

const DOT_COLORS: Record<string, string> = {
  PENDING: "bg-amber-500",
  CONFIRMED: "bg-green-500",
  CANCELLED: "bg-red-400",
  COMPLETED: "bg-blue-500",
  NO_SHOW: "bg-gray-400",
};

export function BookingChip({ booking, timezone }: { booking: AdminBookingRow; timezone: string }) {
  const time = DateTime.fromISO(booking.start_time, { zone: timezone }).toFormat("HH:mm");
  return (
    <Link
      href={`/dashboard/bookings/${booking.id}`}
      className="flex items-start gap-1.5 rounded-md px-1.5 py-1 text-xs hover:bg-gray-100"
    >
      <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${DOT_COLORS[booking.status] ?? "bg-gray-400"}`} />
      <span className="min-w-0 truncate">
        <span className="font-medium text-gray-900">{time}</span>{" "}
        <span className="text-gray-600">
          {booking.client.first_name ?? "Клиент"} — {booking.service.name}
        </span>
      </span>
    </Link>
  );
}
