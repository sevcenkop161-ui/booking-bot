import { DateTime } from "luxon";
import { InlineKeyboard, type Bot, type Context } from "grammy";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service-client";
import { getAvailableSlots, hasAnyAvailability, type AvailabilityInput } from "@/lib/availability";
import { formatPrice } from "@/lib/telegram/formatters";
import { MAX_COMMENT_LENGTH, commentSchema, nameSchema, phoneSchema } from "@/lib/validation/contact";
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
import { formatDateOptionLabel, formatFullDate } from "./format";

const MAX_DATE_OPTIONS = 14;

export function registerBookingFlow(bot: Bot): void {
  bot.hears("📅 Записаться", startBooking);
  bot.callbackQuery(/^svc:(.+)$/, onServiceChosen);
  bot.callbackQuery(/^artist:(.+)$/, onArtistChosen);
  bot.callbackQuery(/^date:(.+)$/, onDateChosen);
  bot.callbackQuery(/^time:(.+)$/, onTimeChosen);
  bot.callbackQuery("cancel", onCancel);
  bot.callbackQuery(/^back:(.+)$/, onBack);
  bot.callbackQuery("restart", onRestart);
  bot.callbackQuery("confirm", onConfirm);
  // Must be registered after every other bot.hears()/bot.command() in the
  // whole bot (see bot.ts) — grammY runs middleware in registration order,
  // and this one only reacts when a draft is mid contact-info collection,
  // so any earlier exact-text handler (menu buttons) still gets first pick.
  bot.on("message:text", onContactText);
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
  await ctx.editMessageText(`Время ${slot.label} выбрано ✅`);
  await ctx.reply("Как вас зовут?");
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

async function onContactText(ctx: Context): Promise<void> {
  const from = ctx.from;
  const text = ctx.message?.text;
  if (!from || !text) return;

  const supabase = createServiceClient();
  const draft = await getDraft(supabase, from.id);
  if (!draft || !["name", "phone", "comment"].includes(draft.step)) {
    // Not a reply we're waiting for — leave it alone (nothing else is
    // registered after this handler, so there's no next() to call).
    return;
  }

  if (draft.step === "name") {
    const result = nameSchema.safeParse(text);
    if (!result.success) {
      await ctx.reply("Имя должно быть от 2 до 100 символов. Попробуйте ещё раз:");
      return;
    }
    await updateDraft(supabase, from.id, { name: result.data, step: "phone" });
    await ctx.reply("Укажите номер телефона, например +7 999 123 45 67:");
    return;
  }

  if (draft.step === "phone") {
    const result = phoneSchema.safeParse(text);
    if (!result.success) {
      await ctx.reply("Похоже, это не номер телефона. Попробуйте ещё раз, например: +7 999 123 45 67");
      return;
    }
    await updateDraft(supabase, from.id, { phone: result.data, step: "comment" });
    await ctx.reply(
      `Комментарий к записи (необязательно, до ${MAX_COMMENT_LENGTH} символов). Если нечего добавить — отправьте «-».`
    );
    return;
  }

  // draft.step === "comment"
  const result = commentSchema.safeParse(text);
  if (!result.success) {
    await ctx.reply(`Слишком длинный комментарий (максимум ${MAX_COMMENT_LENGTH} символов). Сократите и отправьте ещё раз:`);
    return;
  }
  const comment = result.data === "-" ? null : result.data;
  await updateDraft(supabase, from.id, { comment, step: "confirm" });

  const business = await getPrimaryBusiness(supabase);
  const updated = await getDraft(supabase, from.id);
  if (!business || !updated) return;
  await showConfirmation(ctx, supabase, business, updated);
}

async function showConfirmation(
  ctx: Context,
  supabase: SupabaseClient,
  business: Business,
  draft: BookingDraft
): Promise<void> {
  if (!draft.service_id || !draft.artist_id || !draft.date || !draft.start_time) return;

  const [service, artist] = await Promise.all([
    getActiveServiceById(supabase, business.id, draft.service_id),
    getActiveArtistById(supabase, business.id, draft.artist_id),
  ]);
  if (!service || !artist) {
    await ctx.reply("Что-то из выбранного стало недоступно. Начните запись заново — «📅 Записаться».");
    await clearDraft(supabase, draft.telegram_id);
    return;
  }

  const time = DateTime.fromISO(draft.start_time, { zone: business.timezone }).toFormat("HH:mm");
  const text = [
    "Ваша запись",
    "",
    `Услуга: ${service.name}`,
    `Мастер: ${artist.name}`,
    `Дата: ${formatFullDate(draft.date, business.timezone)}`,
    `Время: ${time}`,
    `Длительность: ${service.duration_minutes} мин`,
    `Стоимость: ${formatPrice(service.price)}`,
  ].join("\n");

  const keyboard = new InlineKeyboard()
    .text("✅ Подтвердить", "confirm")
    .row()
    .text("← Изменить", "restart")
    .row()
    .text("❌ Отменить", "cancel");

  await ctx.reply(text, { reply_markup: keyboard });
}

async function onRestart(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;
  const supabase = createServiceClient();

  const business = await getPrimaryBusiness(supabase);
  if (!business) {
    await ctx.answerCallbackQuery();
    return;
  }

  const services = await getActiveServices(supabase, business.id);
  await startDraft(supabase, from.id, business.id);
  await ctx.answerCallbackQuery();
  await ctx.editMessageText("Хорошо, начнём заново.\n\nВыберите услугу:", {
    reply_markup: serviceKeyboard(services),
  });
}

async function onConfirm(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;
  const supabase = createServiceClient();

  const draft = await getDraft(supabase, from.id);
  if (!draft || draft.step !== "confirm") {
    await ctx.answerCallbackQuery();
    await expireDraft(ctx);
    return;
  }

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    "Почти готово! Создание записи (с проверкой, что слот всё ещё свободен) появится на следующем шаге — эта часть в разработке."
  );
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
