"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dashboard/require-admin";
import { weekScheduleSchema, timeOffSchema } from "@/lib/validation/schedule";
import * as schedule from "@/lib/dashboard/schedule";
import { logger } from "@/lib/logger";

const DAY_NAMES = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];

export interface RawDaySchedule {
  dayOfWeek: number;
  isWorking: boolean;
  startTime: string;
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
}

export interface ScheduleFormState {
  error?: string;
  success?: boolean;
  values: RawDaySchedule[];
}

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const str = value ? String(value) : "";
  return str.length > 0 ? str : null;
}

function readWeekForm(formData: FormData): RawDaySchedule[] {
  const days: RawDaySchedule[] = [];
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    days.push({
      dayOfWeek,
      isWorking: formData.get(`is_working_${dayOfWeek}`) === "on",
      startTime: String(formData.get(`start_time_${dayOfWeek}`) ?? ""),
      endTime: String(formData.get(`end_time_${dayOfWeek}`) ?? ""),
      breakStart: emptyToNull(formData.get(`break_start_${dayOfWeek}`)),
      breakEnd: emptyToNull(formData.get(`break_end_${dayOfWeek}`)),
    });
  }
  return days;
}

export async function saveScheduleAction(
  artistId: string,
  _prevState: ScheduleFormState,
  formData: FormData
): Promise<ScheduleFormState> {
  const values = readWeekForm(formData);
  const parsed = weekScheduleSchema.safeParse(values);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const dayIndex = typeof issue.path[0] === "number" ? issue.path[0] : undefined;
    const dayLabel = dayIndex !== undefined ? DAY_NAMES[values[dayIndex].dayOfWeek] : undefined;
    return { error: dayLabel ? `${dayLabel}: ${issue.message}` : issue.message, values };
  }

  const { supabase, business } = await requireAdmin();

  try {
    await schedule.saveArtistWeekSchedule(supabase, business.id, artistId, parsed.data);
  } catch (err) {
    logger.error("schedule_save_failed", { artistId, error: String(err) });
    return { error: "Не удалось сохранить расписание.", values };
  }

  logger.info("admin_action", { action: "schedule_saved", artistId });
  revalidatePath("/dashboard/schedule");
  return { values, success: true };
}

export async function addTimeOffAction(artistId: string, formData: FormData): Promise<void> {
  const raw = {
    startDate: String(formData.get("start_date") ?? ""),
    endDate: String(formData.get("end_date") ?? ""),
    reason: String(formData.get("reason") ?? ""),
  };
  const parsed = timeOffSchema.safeParse(raw);

  const { supabase, business } = await requireAdmin();
  if (!parsed.success) {
    redirect(`/dashboard/schedule?artist=${artistId}&error=invalid_time_off`);
  }

  await schedule.addTimeOff(supabase, business.id, artistId, parsed.data);
  logger.info("admin_action", { action: "time_off_added", artistId });
  revalidatePath("/dashboard/schedule");
  redirect(`/dashboard/schedule?artist=${artistId}`);
}

export async function deleteTimeOffAction(artistId: string, id: string): Promise<void> {
  const { supabase } = await requireAdmin();
  await schedule.deleteTimeOff(supabase, id);
  logger.info("admin_action", { action: "time_off_deleted", artistId, timeOffId: id });
  revalidatePath("/dashboard/schedule");
  redirect(`/dashboard/schedule?artist=${artistId}`);
}
