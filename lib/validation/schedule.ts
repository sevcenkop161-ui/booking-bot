import { z } from "zod";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export const dayScheduleSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    isWorking: z.boolean(),
    startTime: z.string().regex(TIME_REGEX, "Некорректное время"),
    endTime: z.string().regex(TIME_REGEX, "Некорректное время"),
    breakStart: z.string().regex(TIME_REGEX, "Некорректное время перерыва").nullable(),
    breakEnd: z.string().regex(TIME_REGEX, "Некорректное время перерыва").nullable(),
  })
  .refine((d) => !d.isWorking || d.startTime < d.endTime, {
    message: "Время начала должно быть раньше времени окончания",
    path: ["endTime"],
  })
  .refine((d) => (d.breakStart === null) === (d.breakEnd === null), {
    message: "Заполните оба поля перерыва или оставьте их пустыми",
    path: ["breakEnd"],
  })
  .refine((d) => d.breakStart === null || d.breakEnd === null || d.breakStart < d.breakEnd, {
    message: "Перерыв должен начинаться раньше, чем заканчивается",
    path: ["breakEnd"],
  });

export const weekScheduleSchema = z.array(dayScheduleSchema).length(7);

export type DayScheduleInput = z.infer<typeof dayScheduleSchema>;

export const timeOffSchema = z
  .object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Некорректная дата"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Некорректная дата"),
    reason: z.string().trim().max(200, "Слишком длинная причина"),
  })
  .refine((d) => d.startDate <= d.endDate, {
    message: "Дата начала должна быть раньше даты окончания",
    path: ["endDate"],
  });
