import { DateTime } from "luxon";

// "Пн, 10 авг" — used in the date picker, where compactness matters more
// than reading naturally.
export function formatDateOptionLabel(date: string, zone: string): string {
  return DateTime.fromISO(date, { zone }).setLocale("ru").toFormat("ccc, d MMM");
}

// "20 августа" — used in the confirmation screen (section 14's mockup).
export function formatFullDate(date: string, zone: string): string {
  return DateTime.fromISO(date, { zone }).setLocale("ru").toFormat("d MMMM");
}
