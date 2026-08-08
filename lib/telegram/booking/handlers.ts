import { DateTime } from "luxon";
import type { Bot, Context } from "grammy";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service-client";
import { getAvailableSlots, hasAnyAvailability, type AvailabilityInput } from "@/lib/availability";
import {
  getActiveArtistById,
  getActiveServiceById,
  getActiveServices,
  getArtistBookings,
  getArtistSchedule,
  getArtistsForService,
  getBookingRules,
  getPrimaryBusiness,
  isArtistLinkedToService,
  type Business,
} from "@/lib/telegram/queries";
import { clearDraft, getDraft, startDraft, updateDraft, type BookingDraft } from "./draft-store";
import { artistKeyboard, dateKeyboard, serviceKeyboard, timeKeyboard, type DateOption } from "./keyboards";
import { formatDateOptionLabel } from "./format";

const MAX_DATE_OPTIONS = 14;

export function registerBookingFlow(bot: Bot): void {
  bot.hears("📅 Записаться", startBooking);
  bot.callbackQuery(/^svc:(.+)$/, onServiceChosen);
  bot.callbackQuery(/^artist:(.+)$/, onArtistChosen);
  bot.callbackQuery(/^date:(.+)$/, onDateChosen);
  bot.callbackQuery(/^time:(.+)$/, onTimeChosen);
  bot.callbackQuery("cancel", onCancel);
  bot.callbackQuery(/^back:(.+)$/, onBack);
}

async function startBooking(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;
  const supabase = createServiceClient();

  const business = await getPrimaryBusiness(supabase);
  if (!business) {
    await ctx.reply("Запись сейчас недоступна, попробуйте позже.");
    return;
  }

  const services = await getActiveServices(supabase, business.id);
  if (services.length === 0) {
    await ctx.reply("Пока нет доступных услуг для записи.");
    return;
  }

  await startDraft(supabase, from.id, business.id);
  await ctx.reply("Выберите услугу:", { reply_markup: serviceKeyboard(services) });
}

async function onServiceChosen(ctx: Context): Promise<void> {
  const from = ctx.from;
  const serviceId = ctx.match?.[1] as string | undefined;
  if (!from || !serviceId) return;
  const supabase = createServiceClient();

  const draft = await getDraft(supabase, from.id);
  const business = await getPrimaryBusiness(supabase);
  if (!draft || !business) {
    await ctx.answerCallbackQuery();
    await expireDraft(ctx);
    return;
  }

  // Re-check the service is still active — it may have been disabled by
  // an admin while this menu was open (section 56).
  const service = await getActiveServiceById(supabase, business.id, serviceId);
  if (!service) {
    await ctx.answerCallbackQuery({ text: "Эта услуга больше недоступна." });
    await showServiceStep(ctx, supabase, business, true);
    return;
  }

  const artists = await getArtistsForService(supabase, business.id, serviceId);
  if (artists.length === 0) {
    await ctx.answerCallbackQuery({ text: "Для этой услуги пока нет мастеров." });
    return;
  }

  await updateDraft(supabase, from.id, { service_id: service.id, step: "artist" });
  await ctx.answerCallbackQuery();
  await ctx.editMessageText("Выберите мастера:", { reply_markup: artistKeyboard(artists) });
}

async function onArtistChosen(ctx: Context): Promise<void> {
  const from = ctx.from;
  const artistId = ctx.match?.[1] as string | undefined;
  if (!from || !artistId) return;
  const supabase = createServiceClient();

  const draft = await getDraft(supabase, from.id);
  const business = await getPrimaryBusiness(supabase);
  if (!draft || !draft.service_id || !business) {
    await ctx.answerCallbackQuery();
    await expireDraft(ctx);
    return;
  }

  const artist = await getActiveArtistById(supabase, business.id, artistId);
  const linked = artist ? await isArtistLinkedToService(supabase, artistId, draft.service_id) : false;
  if (!artist || !linked) {
    await ctx.answerCallbackQuery({ text: "Этот мастер больше недоступен для выбранной услуги." });
    const artists = await getArtistsForService(supabase, business.id, draft.service_id);
    await ctx.editMessageText("Выберите мастера:", { reply_markup: artistKeyboard(artists) });
    return;
  }

  await updateDraft(supabase, from.id, { artist_id: artist.id, step: "date" });
  await ctx.answerCallbackQuery();
  await showDateStep(ctx, supabase, business, { ...draft, artist_id: artist.id });
}

async function onDateChosen(ctx: Context): Promise<void> {
  const from = ctx.from;
  const date = ctx.match?.[1] as string | undefined;
  if (!from || !date) return;
  const supabase = createServiceClient();

  const draft = await getDraft(supabase, from.id);
  const business = await getPrimaryBusiness(supabase);
  if (!draft || !draft.service_id || !draft.artist_id || !business) {
    await ctx.answerCallbackQuery();
    await expireDraft(ctx);
    return;
  }

  await updateDraft(supabase, from.id, { date, step: "time" });
  await ctx.answerCallbackQuery();
  await showTimeStep(ctx, supabase, business, { ...draft, date });
}

async function onTimeChosen(ctx: Context): Promise<void> {
  const from = ctx.from;
  const label = ctx.match?.[1] as string | undefined;
  if (!from || !label) return;
  const supabase = createServiceClient();

  const draft = await getDraft(supabase, from.id);
  const business = await getPrimaryBusiness(supabase);
  if (!draft || !draft.service_id || !draft.artist_id || !draft.date || !business) {
    await ctx.answerCallbackQuery();
    await expireDraft(ctx);
    return;
  }

  const slots = await computeSlots(supabase, business, draft.service_id, draft.artist_id, draft.date);
  const slot = slots.find((s) => s.label === label);
  if (!slot) {
    await ctx.answerCallbackQuery({ text: "Это время уже заняли, выберите другое." });
    await showTimeStep(ctx, supabase, business, draft);
    return;
  }

  await updateDraft(supabase, from.id, {
    start_time: slot.startTime,
    end_time: slot.endTime,
    step: "name",
  });
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    `Время ${slot.label} выбрано ✅\n\nСледующий шаг (контактные данные) появится совсем скоро — эта часть в разработке.`
  );
}

async function onCancel(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;
  const supabase = createServiceClient();
  await clearDraft(supabase, from.id);
  await ctx.answerCallbackQuery();
  await ctx.editMessageText("Запись отменена. Когда будете готовы — нажмите «📅 Записаться» ещё раз.");
}

async function onBack(ctx: Context): Promise<void> {
  const from = ctx.from;
  const target = ctx.match?.[1] as string | undefined;
  if (!from || !target) return;
  const supabase = createServiceClient();

  const draft = await getDraft(supabase, from.id);
  const business = await getPrimaryBusiness(supabase);
  if (!draft || !business) {
    await ctx.answerCallbackQuery();
    await expireDraft(ctx);
    return;
  }

  await ctx.answerCallbackQuery();
  if (target === "service") {
    await showServiceStep(ctx, supabase, business, true);
  } else if (target === "artist" && draft.service_id) {
    const artists = await getArtistsForService(supabase, business.id, draft.service_id);
    await ctx.editMessageText("Выберите мастера:", { reply_markup: artistKeyboard(artists) });
  } else if (target === "date" && draft.artist_id) {
    await showDateStep(ctx, supabase, business, draft);
  }
}

// ---- shared step renderers (used for both forward and "back" navigation) ----

async function showServiceStep(
  ctx: Context,
  supabase: SupabaseClient,
  business: Business,
  edit: boolean
): Promise<void> {
  const services = await getActiveServices(supabase, business.id);
  const text = "Выберите услугу:";
  const keyboard = serviceKeyboard(services);
  if (edit) {
    await ctx.editMessageText(text, { reply_markup: keyboard });
  } else {
    await ctx.reply(text, { reply_markup: keyboard });
  }
}

async function showDateStep(
  ctx: Context,
  supabase: SupabaseClient,
  business: Business,
  draft: Pick<BookingDraft, "service_id" | "artist_id">
): Promise<void> {
  if (!draft.service_id || !draft.artist_id) return;

  const rules = await getBookingRules(supabase, business.id);
  const [schedule, bookings] = await Promise.all([
    getArtistSchedule(supabase, draft.artist_id),
    getArtistBookings(supabase, draft.artist_id),
  ]);
  const service = await getActiveServiceById(supabase, business.id, draft.service_id);
  if (!service) {
    await ctx.editMessageText("Эта услуга больше недоступна.");
    return;
  }

  const now = new Date();
  const options: DateOption[] = [];
  for (let i = 0; i <= rules.maxBookingDays && options.length < MAX_DATE_OPTIONS; i++) {
    const date = DateTime.fromJSDate(now, { zone: business.timezone }).plus({ days: i }).toISODate();
    if (!date) continue;

    const input: AvailabilityInput = {
      date,
      businessTimezone: business.timezone,
      serviceDurationMinutes: service.duration_minutes,
      workingHours: schedule.workingHours,
      breaks: schedule.breaks,
      timeOff: schedule.timeOff,
      existingBookings: bookings,
      rules,
      now,
    };
    if (hasAnyAvailability(input)) {
      options.push({ date, label: formatDateOptionLabel(date, business.timezone) });
    }
  }

  if (options.length === 0) {
    await ctx.editMessageText(
      "На ближайшее время свободных дат нет 😔 Попробуйте выбрать другого мастера.",
      { reply_markup: artistKeyboard(await getArtistsForService(supabase, business.id, draft.service_id)) }
    );
    return;
  }

  await ctx.editMessageText("Выберите дату:", { reply_markup: dateKeyboard(options) });
}

async function showTimeStep(
  ctx: Context,
  supabase: SupabaseClient,
  business: Business,
  draft: Pick<BookingDraft, "service_id" | "artist_id" | "date">
): Promise<void> {
  if (!draft.service_id || !draft.artist_id || !draft.date) return;

  const slots = await computeSlots(supabase, business, draft.service_id, draft.artist_id, draft.date);
  if (slots.length === 0) {
    await ctx.reply("На выбранную дату свободного времени больше нет.");
    await showDateStep(ctx, supabase, business, draft);
    return;
  }

  await ctx.editMessageText("Выберите время:", {
    reply_markup: timeKeyboard(slots.map((s) => s.label)),
  });
}

async function computeSlots(
  supabase: SupabaseClient,
  business: Business,
  serviceId: string,
  artistId: string,
  date: string
) {
  const [service, rules, schedule, bookings] = await Promise.all([
    getActiveServiceById(supabase, business.id, serviceId),
    getBookingRules(supabase, business.id),
    getArtistSchedule(supabase, artistId),
    getArtistBookings(supabase, artistId),
  ]);
  if (!service) return [];

  return getAvailableSlots({
    date,
    businessTimezone: business.timezone,
    serviceDurationMinutes: service.duration_minutes,
    workingHours: schedule.workingHours,
    breaks: schedule.breaks,
    timeOff: schedule.timeOff,
    existingBookings: bookings,
    rules,
  });
}

async function expireDraft(ctx: Context): Promise<void> {
  await ctx.editMessageText(
    "Эта запись устарела. Нажмите «📅 Записаться» ещё раз, чтобы начать заново."
  );
}
