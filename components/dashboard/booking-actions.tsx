import { updateBookingStatus } from "@/app/dashboard/bookings/actions";
import { NEXT_ACTIONS, type BookingStatus } from "@/lib/dashboard/bookings";

export function BookingActions({
  bookingId,
  status,
  size = "sm",
}: {
  bookingId: string;
  status: BookingStatus;
  size?: "sm" | "md";
}) {
  const actions = NEXT_ACTIONS[status];
  if (actions.length === 0) return null;

  const sizeClass = size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm";

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <form key={action.status} action={updateBookingStatus.bind(null, bookingId, action.status)}>
          <button
            type="submit"
            className={`rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 ${sizeClass}`}
          >
            {action.label}
          </button>
        </form>
      ))}
    </div>
  );
}
