import type { SupabaseClient } from "@supabase/supabase-js";

export const BOOKING_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export interface AdminBookingRow {
  id: string;
  status: BookingStatus;
  date: string;
  start_time: string;
  end_time: string;
  comment: string | null;
  created_at: string;
  service: { name: string };
  artist: { name: string };
  client: { first_name: string | null; username: string | null; phone: string | null; telegram_id: number };
}

const ADMIN_BOOKING_SELECT =
  "id, status, date, start_time, end_time, comment, created_at, services(name), artists(name), users(first_name, username, phone, telegram_id)";

function mapAdminBookingRow(row: {
  id: string;
  status: BookingStatus;
  date: string;
  start_time: string;
  end_time: string;
  comment: string | null;
  created_at: string;
  services: { name: string } | null;
  artists: { name: string } | null;
  users: { first_name: string | null; username: string | null; phone: string | null; telegram_id: number } | null;
}): AdminBookingRow | null {
  if (!row.services || !row.artists || !row.users) return null;
  return {
    id: row.id,
    status: row.status,
    date: row.date,
    start_time: row.start_time,
    end_time: row.end_time,
    comment: row.comment,
    created_at: row.created_at,
    service: row.services,
    artist: row.artists,
    client: row.users,
  };
}

export interface BookingsPage {
  bookings: AdminBookingRow[];
  total: number;
}

export interface BookingsPageOptions {
  businessId: string;
  page: number;
  pageSize: number;
  status?: BookingStatus;
}

// Reads through the session-bound client (see lib/supabase/server.ts),
// so this is only ever as permissive as the "admins can view their
// business bookings" RLS policy actually allows — not just app logic
// pretending to scope by business_id.
export async function getBookingsPage(
  supabase: SupabaseClient,
  { businessId, page, pageSize, status }: BookingsPageOptions
): Promise<BookingsPage> {
  let query = supabase
    .from("bookings")
    .select(ADMIN_BOOKING_SELECT, { count: "exact" })
    .eq("business_id", businessId)
    .order("start_time", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, count, error } = await query;
  if (error) throw error;

  const bookings = (data as unknown as Parameters<typeof mapAdminBookingRow>[0][])
    .map(mapAdminBookingRow)
    .filter((b): b is AdminBookingRow => b !== null);

  return { bookings, total: count ?? 0 };
}
