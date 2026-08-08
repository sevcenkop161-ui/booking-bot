import Link from "next/link";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryBusiness } from "@/lib/business";
import { getUpcomingBookings } from "@/lib/dashboard/bookings";
import { getOverviewStats } from "@/lib/dashboard/overview";
import { StatsCard } from "@/components/dashboard/stats-card";
import { StatusBadge } from "@/components/ui/status-badge";

const UPCOMING_LIMIT = 8;

export default async function DashboardPage() {
  const supabase = await createClient();
  const business = await getPrimaryBusiness(supabase);
  if (!business) return <p className="text-foreground-secondary">Бизнес не найден.</p>;

  const [stats, upcoming] = await Promise.all([
    getOverviewStats(supabase, business.id, business.timezone),
    getUpcomingBookings(supabase, business.id, UPCOMING_LIMIT),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-foreground">Overview</h1>

      <div>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground-secondary">Сегодня</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatsCard label="Всего записей" value={stats.today.total} />
          <StatsCard label="Подтверждено" value={stats.today.confirmed} />
          <StatsCard label="Ожидает" value={stats.today.pending} />
          <StatsCard label="Отменено" value={stats.today.cancelled} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatsCard label="Записей на этой неделе" value={stats.weekCount} />
        <StatsCard label="Записей в этом месяце" value={stats.monthCount} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card lg:col-span-2">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
            Ближайшие записи
          </div>
          {upcoming.length === 0 ? (
            <p className="p-4 text-sm text-foreground-secondary">Нет предстоящих записей.</p>
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.map((booking) => (
                <li key={booking.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <Link href={`/dashboard/bookings/${booking.id}`} className="min-w-0 flex-1 hover:underline">
                    <div className="truncate font-medium text-foreground">
                      {DateTime.fromISO(booking.start_time, { zone: business.timezone })
                        .setLocale("ru")
                        .toFormat("d MMM, HH:mm")}
                      {" — "}
                      {booking.client.first_name ?? "Клиент"}
                    </div>
                    <div className="truncate text-xs text-foreground-secondary">
                      {booking.service.name} · {booking.artist.name}
                    </div>
                  </Link>
                  <StatusBadge status={booking.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Популярные услуги</h2>
            {stats.popularServices.length === 0 ? (
              <p className="text-sm text-foreground-secondary">Пока нет данных.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {stats.popularServices.map((service) => (
                  <li key={service.name} className="flex items-center justify-between">
                    <span className="text-foreground">{service.name}</span>
                    <span className="font-medium text-foreground">{service.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Загрузка мастеров</h2>
            {stats.artistLoad.length === 0 ? (
              <p className="text-sm text-foreground-secondary">Пока нет данных.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {stats.artistLoad.map((artist) => (
                  <li key={artist.name} className="flex items-center justify-between">
                    <span className="text-foreground">{artist.name}</span>
                    <span className="font-medium text-foreground">{artist.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
