import { DateTime } from "luxon";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface TodayStats {
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
}

export interface NamedCount {
  name: string;
  count: number;
}

export interface OverviewStats {
  today: TodayStats;
  weekCount: number;
  monthCount: number;
  popularServices: NamedCount[];
  artistLoad: NamedCount[];
}

// Aggregates in JS over one month's worth of rows rather than a SQL
// GROUP BY — at this project's scale (a handful of bookings) that's
// simpler than a Postgres view/RPC and just as correct; a real
// multi-tenant deployment would push this down to the database instead.
export async function getOverviewStats(
  supabase: SupabaseClient,
  businessId: string,
  timezone: string
): Promise<OverviewStats> {
  const now = DateTime.now().setZone(timezone);
  const todayStr = now.toISODate()!;
  const weekStart = now.startOf("week").toISODate()!;
  const weekEnd = now.startOf("week").plus({ days: 7 }).toISODate()!;
  const monthStart = now.startOf("month").toISODate()!;
  const monthEnd = now.startOf("month").plus({ months: 1 }).toISODate()!;

  const { data, error } = await supabase
    .from("bookings")
    .select("date, status, services(name), artists(name)")
    .eq("business_id", businessId)
    .gte("date", monthStart)
    .lt("date", monthEnd);
  if (error) throw error;

  const rows = data as unknown as {
    date: string;
    status: string;
    services: { name: string } | null;
    artists: { name: string } | null;
  }[];

  const today: TodayStats = { total: 0, confirmed: 0, pending: 0, cancelled: 0 };
  let weekCount = 0;
  let monthCount = 0;
  const serviceCounts = new Map<string, number>();
  const artistCounts = new Map<string, number>();

  for (const row of rows) {
    if (row.date === todayStr) {
      today.total++;
      if (row.status === "CONFIRMED") today.confirmed++;
      else if (row.status === "PENDING") today.pending++;
      else if (row.status === "CANCELLED") today.cancelled++;
    }

    if (row.status === "CANCELLED") continue; // "activity" stats below only count real bookings

    monthCount++;
    if (row.date >= weekStart && row.date < weekEnd) weekCount++;
    if (row.services) serviceCounts.set(row.services.name, (serviceCounts.get(row.services.name) ?? 0) + 1);
    if (row.artists) artistCounts.set(row.artists.name, (artistCounts.get(row.artists.name) ?? 0) + 1);
  }

  const toSorted = (counts: Map<string, number>): NamedCount[] =>
    Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  return {
    today,
    weekCount,
    monthCount,
    popularServices: toSorted(serviceCounts).slice(0, 5),
    artistLoad: toSorted(artistCounts),
  };
}
