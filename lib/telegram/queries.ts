import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AvailabilityRules,
  BreakPeriod,
  ExistingBooking,
  TimeOffPeriod,
  WorkingHours,
} from "@/lib/availability";

export { getPrimaryBusiness, type Business } from "@/lib/business";

export interface ServiceListItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
}

export interface ArtistListItem {
  id: string;
  name: string;
  specialization: string | null;
  bio: string | null;
  image_url: string | null;
}

export async function getActiveServiceById(
  supabase: SupabaseClient,
  businessId: string,
  serviceId: string
): Promise<ServiceListItem | null> {
  const { data } = await supabase
    .from("services")
    .select("id, name, description, price, duration_minutes")
    .eq("business_id", businessId)
    .eq("id", serviceId)
    .eq("active", true)
    .maybeSingle();
  return data;
}

export async function getActiveArtistById(
  supabase: SupabaseClient,
  businessId: string,
  artistId: string
): Promise<ArtistListItem | null> {
  const { data } = await supabase
    .from("artists")
    .select("id, name, specialization, bio, image_url")
    .eq("business_id", businessId)
    .eq("id", artistId)
    .eq("active", true)
    .maybeSingle();
  return data;
}

// Only artists who (a) are active and (b) are linked to this service via
// artist_services should be offered — section 10 "показать только
// мастеров, которые могут выполнять эту услугу".
export async function getArtistsForService(
  supabase: SupabaseClient,
  businessId: string,
  serviceId: string
): Promise<ArtistListItem[]> {
  const { data, error } = await supabase
    .from("artist_services")
    .select("artists!inner(id, name, specialization, bio, image_url, active, business_id)")
    .eq("service_id", serviceId)
    .eq("artists.business_id", businessId)
    .eq("artists.active", true);
  if (error) throw error;
  return (data ?? []).map((row) => row.artists as unknown as ArtistListItem);
}

export async function isArtistLinkedToService(
  supabase: SupabaseClient,
  artistId: string,
  serviceId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("artist_services")
    .select("artist_id")
    .eq("artist_id", artistId)
    .eq("service_id", serviceId)
    .maybeSingle();
  return data !== null;
}

export interface ArtistSchedule {
  workingHours: WorkingHours[];
  breaks: BreakPeriod[];
  timeOff: TimeOffPeriod[];
}

export async function getArtistSchedule(
  supabase: SupabaseClient,
  artistId: string
): Promise<ArtistSchedule> {
  const [workingHoursRes, breaksRes, timeOffRes] = await Promise.all([
    supabase
      .from("working_hours")
      .select("day_of_week, start_time, end_time, is_working")
      .eq("artist_id", artistId),
    supabase.from("breaks").select("day_of_week, start_time, end_time").eq("artist_id", artistId),
    supabase.from("time_off").select("start_date, end_date").eq("artist_id", artistId),
  ]);
  if (workingHoursRes.error) throw workingHoursRes.error;
  if (breaksRes.error) throw breaksRes.error;
  if (timeOffRes.error) throw timeOffRes.error;

  return {
    workingHours: workingHoursRes.data.map((row) => ({
      dayOfWeek: row.day_of_week,
      startTime: row.start_time,
      endTime: row.end_time,
      isWorking: row.is_working,
    })),
    breaks: breaksRes.data.map((row) => ({
      dayOfWeek: row.day_of_week,
      startTime: row.start_time,
      endTime: row.end_time,
    })),
    timeOff: timeOffRes.data.map((row) => ({
      startDate: row.start_date,
      endDate: row.end_date,
    })),
  };
}

export async function getArtistBookings(
  supabase: SupabaseClient,
  artistId: string
): Promise<ExistingBooking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("start_time, end_time")
    .eq("artist_id", artistId)
    .neq("status", "CANCELLED");
  if (error) throw error;
  return data.map((row) => ({ startTime: row.start_time, endTime: row.end_time }));
}

export async function getBookingRules(
  supabase: SupabaseClient,
  businessId: string
): Promise<AvailabilityRules> {
  const { data } = await supabase
    .from("business_settings")
    .select("booking_interval, min_booking_notice, max_booking_days")
    .eq("business_id", businessId)
    .single();

  // Sensible fallback if a business somehow has no settings row yet.
  return {
    bookingIntervalMinutes: data?.booking_interval ?? 30,
    minBookingNoticeMinutes: data?.min_booking_notice ?? 120,
    maxBookingDays: data?.max_booking_days ?? 30,
  };
}

export async function getActiveServices(
  supabase: SupabaseClient,
  businessId: string
): Promise<ServiceListItem[]> {
  const { data, error } = await supabase
    .from("services")
    .select("id, name, description, price, duration_minutes")
    .eq("business_id", businessId)
    .eq("active", true)
    .order("name");
  if (error) throw error;
  return data;
}

export async function getActiveArtists(
  supabase: SupabaseClient,
  businessId: string
): Promise<ArtistListItem[]> {
  const { data, error } = await supabase
    .from("artists")
    .select("id, name, specialization, bio, image_url")
    .eq("business_id", businessId)
    .eq("active", true)
    .order("name");
  if (error) throw error;
  return data;
}

export async function getUserIdByTelegramId(
  supabase: SupabaseClient,
  telegramId: number
): Promise<string | null> {
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("telegram_id", telegramId)
    .maybeSingle();
  return data?.id ?? null;
}

export async function getCancellationDeadlineHours(
  supabase: SupabaseClient,
  businessId: string
): Promise<number> {
  const { data } = await supabase
    .from("business_settings")
    .select("cancellation_hours")
    .eq("business_id", businessId)
    .single();
  return data?.cancellation_hours ?? 24;
}

export interface UserBooking {
  id: string;
  status: string;
  date: string;
  start_time: string;
  service: { name: string };
  artist: { name: string };
}

function mapUserBookingRow(row: {
  id: string;
  status: string;
  date: string;
  start_time: string;
  services: { name: string } | null;
  artists: { name: string } | null;
}): UserBooking | null {
  if (!row.services || !row.artists) return null;
  return {
    id: row.id,
    status: row.status,
    date: row.date,
    start_time: row.start_time,
    service: row.services,
    artist: row.artists,
  };
}

const USER_BOOKING_SELECT = "id, status, date, start_time, services(name), artists(name)";

export async function getUpcomingBookingsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<UserBooking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(USER_BOOKING_SELECT)
    .eq("user_id", userId)
    .in("status", ["PENDING", "CONFIRMED"])
    .gt("start_time", new Date().toISOString())
    .order("start_time", { ascending: true });
  if (error) throw error;
  return (data as unknown as Parameters<typeof mapUserBookingRow>[0][])
    .map(mapUserBookingRow)
    .filter((b): b is UserBooking => b !== null);
}

export async function getPastBookingsForUser(
  supabase: SupabaseClient,
  userId: string,
  limit: number
): Promise<UserBooking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(USER_BOOKING_SELECT)
    .eq("user_id", userId)
    .or(`status.in.(CANCELLED,COMPLETED,NO_SHOW),start_time.lte.${new Date().toISOString()}`)
    .order("start_time", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as Parameters<typeof mapUserBookingRow>[0][])
    .map(mapUserBookingRow)
    .filter((b): b is UserBooking => b !== null);
}

// Fetches a booking only if it belongs to this user — the ownership
// check IS the query, so it's impossible to use this to look up (or
// later cancel) someone else's booking by guessing an id (section 34).
export async function getOwnedBooking(
  supabase: SupabaseClient,
  bookingId: string,
  userId: string
): Promise<UserBooking | null> {
  const { data } = await supabase
    .from("bookings")
    .select(USER_BOOKING_SELECT)
    .eq("id", bookingId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return mapUserBookingRow(data as unknown as Parameters<typeof mapUserBookingRow>[0]);
}

export interface BookingWithDetails {
  id: string;
  status: string;
  date: string;
  start_time: string;
  comment: string | null;
  service: { name: string };
  artist: { name: string };
  user: { telegram_id: number; first_name: string | null; phone: string | null };
}

export async function getBookingWithDetails(
  supabase: SupabaseClient,
  bookingId: string
): Promise<BookingWithDetails | null> {
  const { data } = await supabase
    .from("bookings")
    .select(
      "id, status, date, start_time, comment, services(name), artists(name), users(telegram_id, first_name, phone)"
    )
    .eq("id", bookingId)
    .maybeSingle();
  if (!data) return null;

  // PostgREST embeds related rows under the table name used in select()
  // (plural: services/artists/users), not the singular field names this
  // interface uses — map them explicitly instead of blind-casting.
  const row = data as unknown as {
    id: string;
    status: string;
    date: string;
    start_time: string;
    comment: string | null;
    services: { name: string } | null;
    artists: { name: string } | null;
    users: { telegram_id: number; first_name: string | null; phone: string | null } | null;
  };
  if (!row.services || !row.artists || !row.users) return null;

  return {
    id: row.id,
    status: row.status,
    date: row.date,
    start_time: row.start_time,
    comment: row.comment,
    service: row.services,
    artist: row.artists,
    user: row.users,
  };
}
