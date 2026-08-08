import type { SupabaseClient } from "@supabase/supabase-js";

export const BOOKING_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

// Which status transitions the dashboard exposes as one-click actions
// (section 24: Confirm/Cancel/Complete/No-show). Terminal statuses get
// no further actions.
export const NEXT_ACTIONS: Record<BookingStatus, { label: string; status: BookingStatus }[]> = {
  PENDING: [
    { label: "Подтвердить", status: "CONFIRMED" },
    { label: "Отменить", status: "CANCELLED" },
  ],
  CONFIRMED: [
    { label: "Завершить", status: "COMPLETED" },
    { label: "Не пришёл", status: "NO_SHOW" },
    { label: "Отменить", status: "CANCELLED" },
  ],
  CANCELLED: [],
  COMPLETED: [],
  NO_SHOW: [],
};

export interface AdminBookingRow {
  id: string;
  status: BookingStatus;
  date: string;
  start_time: string;
  end_time: string;
  comment: string | null;
  created_at: string;
  service: { name: string; duration_minutes: number; price: number };
  artist: { name: string; specialization: string | null };
  client: { first_name: string | null; username: string | null; phone: string | null; telegram_id: number };
}

const ADMIN_BOOKING_SELECT =
  "id, status, date, start_time, end_time, comment, created_at, services(name, duration_minutes, price), artists(name, specialization), users(first_name, username, phone, telegram_id)";

type RawAdminBookingRow = {
  id: string;
  status: BookingStatus;
  date: string;
  start_time: string;
  end_time: string;
  comment: string | null;
  created_at: string;
  services: { name: string; duration_minutes: number; price: number } | null;
  artists: { name: string; specialization: string | null } | null;
  users: { first_name: string | null; username: string | null; phone: string | null; telegram_id: number } | null;
};

function mapAdminBookingRow(row: RawAdminBookingRow): AdminBookingRow | null {
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

  const bookings = (data as unknown as RawAdminBookingRow[])
    .map(mapAdminBookingRow)
    .filter((b): b is AdminBookingRow => b !== null);

  return { bookings, total: count ?? 0 };
}

export async function getBookingById(
  supabase: SupabaseClient,
  businessId: string,
  bookingId: string
): Promise<AdminBookingRow | null> {
  const { data } = await supabase
    .from("bookings")
    .select(ADMIN_BOOKING_SELECT)
    .eq("business_id", businessId)
    .eq("id", bookingId)
    .maybeSingle();
  if (!data) return null;
  return mapAdminBookingRow(data as unknown as RawAdminBookingRow);
}

// Half-open range [startIso, endIso) — used by the calendar to pull a
// day/week/month's worth of bookings in one query, then group them by
// date on the server side rather than issuing one query per day.
export async function getBookingsInRange(
  supabase: SupabaseClient,
  businessId: string,
  startIso: string,
  endIso: string
): Promise<AdminBookingRow[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(ADMIN_BOOKING_SELECT)
    .eq("business_id", businessId)
    .gte("start_time", startIso)
    .lt("start_time", endIso)
    .order("start_time", { ascending: true });
  if (error) throw error;

  return (data as unknown as RawAdminBookingRow[])
    .map(mapAdminBookingRow)
    .filter((b): b is AdminBookingRow => b !== null);
}
