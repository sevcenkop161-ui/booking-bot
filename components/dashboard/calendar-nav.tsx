import Link from "next/link";
import type { DateTime } from "luxon";
import { formatRangeLabel, shiftAnchor, type CalendarView } from "@/lib/dashboard/calendar-range";

function href(view: CalendarView, date: string): string {
  return `/dashboard/calendar?view=${view}&date=${date}`;
}

export function CalendarNav({ view, anchor, today }: { view: CalendarView; anchor: DateTime; today: DateTime }) {
  const prevDate = shiftAnchor(view, anchor, -1).toISODate()!;
  const nextDate = shiftAnchor(view, anchor, 1).toISODate()!;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Link href={href(view, prevDate)} className="rounded-md border border-gray-300 px-2 py-1 text-sm hover:bg-gray-100">
          ←
        </Link>
        <Link
          href={href(view, today.toISODate()!)}
          className="rounded-md border border-gray-300 px-2 py-1 text-sm hover:bg-gray-100"
        >
          Сегодня
        </Link>
        <Link href={href(view, nextDate)} className="rounded-md border border-gray-300 px-2 py-1 text-sm hover:bg-gray-100">
          →
        </Link>
        <span className="ml-2 text-sm font-medium capitalize text-gray-900">{formatRangeLabel(view, anchor)}</span>
      </div>

      <div className="flex gap-1 rounded-md bg-gray-100 p-1">
        {(["day", "week", "month"] as const).map((v) => (
          <Link
            key={v}
            href={href(v, anchor.toISODate()!)}
            className={`rounded px-3 py-1 text-xs font-medium ${
              v === view ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {v === "day" ? "День" : v === "week" ? "Неделя" : "Месяц"}
          </Link>
        ))}
      </div>
    </div>
  );
}
