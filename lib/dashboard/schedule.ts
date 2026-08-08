import type { SupabaseClient } from "@supabase/supabase-js";
import type { DayScheduleInput } from "@/lib/validation/schedule";

export interface DaySchedule {
  dayOfWeek: number; // 0 = Sunday ... 6 = Saturday, matches Postgres EXTRACT(DOW)
  isWorking: boolean;
  startTime: string; // "HH:mm"
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
}

function toHHmm(value: string): string {
  return value.slice(0, 5);
}

export async function getArtistWeekSchedule(
  supabase: SupabaseClient,
  artistId: string
): Promise<DaySchedule[]> {
  const [workingHoursRes, breaksRes] = await Promise.all([
    supabase.from("working_hours").select("day_of_week, start_time, end_time, is_working").eq("artist_id", artistId),
    supabase.from("breaks").select("day_of_week, start_time, end_time").eq("artist_id", artistId),
  ]);
  if (workingHoursRes.error) throw workingHoursRes.error;
  if (breaksRes.error) throw breaksRes.error;

  const days: DaySchedule[] = [];
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    const hours = workingHoursRes.data.find((row) => row.day_of_week === dayOfWeek);
    // Only the first break for the day is editable here — the schema
    // technically allows more than one, but every real schedule in this
    // app only ever needs a single lunch-style break per day.
    const brk = breaksRes.data.find((row) => row.day_of_week === dayOfWeek);
    days.push({
      dayOfWeek,
      isWorking: hours?.is_working ?? false,
      startTime: hours ? toHHmm(hours.start_time) : "10:00",
      endTime: hours ? toHHmm(hours.end_time) : "19:00",
      breakStart: brk ? toHHmm(brk.start_time) : null,
      breakEnd: brk ? toHHmm(brk.end_time) : null,
    });
  }
  return days;
}

export async function saveArtistWeekSchedule(
  supabase: SupabaseClient,
  businessId: string,
  artistId: string,
  days: DayScheduleInput[]
): Promise<void> {
  const workingHoursRows = days.map((day) => ({
    business_id: businessId,
    artist_id: artistId,
    day_of_week: day.dayOfWeek,
    is_working: day.isWorking,
    start_time: day.startTime,
    end_time: day.endTime,
  }));
  const { error: upsertError } = await supabase
    .from("working_hours")
    .upsert(workingHoursRows, { onConflict: "artist_id,day_of_week" });
  if (upsertError) throw upsertError;

  // Replace this artist's breaks wholesale — simpler than diffing, and
  // there are at most 7 rows involved.
  const { error: deleteError } = await supabase.from("breaks").delete().eq("artist_id", artistId);
  if (deleteError) throw deleteError;

  const breakRows = days
    .filter((day) => day.breakStart && day.breakEnd)
    .map((day) => ({
      business_id: businessId,
      artist_id: artistId,
      day_of_week: day.dayOfWeek,
      start_time: day.breakStart,
      end_time: day.breakEnd,
    }));
  if (breakRows.length > 0) {
    const { error: insertError } = await supabase.from("breaks").insert(breakRows);
    if (insertError) throw insertError;
  }
}

export interface TimeOffEntry {
  id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
}

export async function getArtistTimeOff(supabase: SupabaseClient, artistId: string): Promise<TimeOffEntry[]> {
  const { data, error } = await supabase
    .from("time_off")
    .select("id, start_date, end_date, reason")
    .eq("artist_id", artistId)
    .order("start_date");
  if (error) throw error;
  return data;
}

export async function addTimeOff(
  supabase: SupabaseClient,
  businessId: string,
  artistId: string,
  input: { startDate: string; endDate: string; reason: string }
): Promise<void> {
  const { error } = await supabase.from("time_off").insert({
    business_id: businessId,
    artist_id: artistId,
    start_date: input.startDate,
    end_date: input.endDate,
    reason: input.reason.length > 0 ? input.reason : null,
  });
  if (error) throw error;
}

export async function deleteTimeOff(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("time_off").delete().eq("id", id);
  if (error) throw error;
}
