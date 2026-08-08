import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AvailabilityRules,
  BreakPeriod,
  ExistingBooking,
  TimeOffPeriod,
  WorkingHours,
} from "@/lib/availability";

export interface Business {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  timezone: string;
}

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

// MVP is single-business; every business_id lookup goes through this one
// place so switching to a real multi-business lookup later is a one-line
// change instead of hunting down every call site (section 32).
export async function getPrimaryBusiness(supabase: SupabaseClient): Promise<Business | null> {
  const { data } = await supabase
    .from("businesses")
    .select("id, name, description, address, phone, timezone")
    .limit(1)
    .single();
  return data;
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
