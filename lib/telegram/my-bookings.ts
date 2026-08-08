import { DateTime } from "luxon";
import { InlineKeyboard, type Bot, type Context } from "grammy";
import { createServiceClient } from "@/lib/supabase/service-client";
import {
  getCancellationDeadlineHours,
  getOwnedBooking,
  getPastBookingsForUser,
  getPrimaryBusiness,
  getUpcomingBookingsForUser,
  getUserIdByTelegramId,
  type UserBooking,
} from "@/lib/telegram/queries";
import { sendAdminCancellationNotice } from "@/lib/telegram/booking/notifications";

const PAST_BOOKINGS_LIMIT = 5;

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Ожидает подтверждения",
  CONFIRMED: "Подтверждено",
  CANCELLED: "Отменена",
  COMPLETED: "Завершена",
  NO_SHOW: "Клиент не пришёл",
};

export function registerMyBookingsFlow(bot: Bot): void {
  bot.hears("📋 Мои записи", onMyBookings);
  bot.callbackQuery(/^cancel_request:(.+)$/, onCancelRequest);
  bot.callbackQuery(/^cancel_confirm:(.+)$/, onCancelConfirm);
  bot.callbackQuery(/^cancel_abort:(.+)$/, onCancelAbort);
}

async function onMyBookings(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;
  const supabase = createServiceClient();

  const [userId, business] = await Promise.all([
    getUserIdByTelegramId(supabase, from.id),
    getPrimaryBusiness(supabase),
  ]);
  if (!userId || !business) {
    await ctx.reply("Сначала отправьте /start.");
    return;
  }

  const [upcoming, past] = await Promise.all([
    getUpcomingBookingsForUser(supabase, userId),
    getPastBookingsForUser(supabase, userId, PAST_BOOKINGS_LIMIT),
  ]);

  if (upcoming.length === 0 && past.length === 0) {
    await ctx.reply(
      "У вас пока нет записей.\n\nНажмите «📅 Записаться», чтобы записаться в первый раз."
    );
    return;
  }

  if (upcoming.length === 0) {
    await ctx.reply("Предстоящих записей нет.");
  } else {
    await ctx.reply("Предстоящие записи:");
    for (const booking of upcoming) {
      await ctx.reply(formatBookingCard(booking, business.timezone), {
        reply_markup: cancelKeyboard(booking.id),
      });
    }
  }

  if (past.length > 0) {
    const lines = past.map((booking) => formatBookingLine(booking, business.timezone));
    await ctx.reply(["Прошедшие записи:", "", ...lines].join("\n"));
  }
}

async function onCancelRequest(ctx: Context): Promise<void> {
  const from = ctx.from;
  const bookingId = ctx.match?.[1] as string | undefined;
  if (!from || !bookingId) return;
  const supabase = createServiceClient();

  const [userId, business] = await Promise.all([
    getUserIdByTelegramId(supabase, from.id),
    getPrimaryBusiness(supabase),
  ]);
  if (!userId || !business) {
    await ctx.answerCallbackQuery();
    return;
  }

  const booking = await getOwnedBooking(supabase, bookingId, userId);
  if (!booking || booking.status === "CANCELLED") {
    await ctx.answerCallbackQuery({ text: "Эта запись уже недоступна." });
    return;
  }

  const deadlineHours = await getCancellationDeadlineHours(supabase, business.id);
  if (!canStillCancel(booking, deadlineHours)) {
    await ctx.answerCallbackQuery({ text: "Слишком поздно для отмены онлайн." });
    await ctx.reply(
      `Эту запись уже нельзя отменить онлайн — отмена возможна не позднее чем за ${deadlineHours} ч. до визита. Свяжитесь с администратором напрямую.`
    );
    return;
  }

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    `Вы уверены, что хотите отменить запись?\n\n${formatBookingLine(booking, business.timezone)}`,
    {
      reply_markup: new InlineKeyboard()
        .text("Да, отменить", `cancel_confirm:${booking.id}`)
        .text("Назад", `cancel_abort:${booking.id}`),
    }
  );
}

async function onCancelAbort(ctx: Context): Promise<void> {
  const from = ctx.from;
  const bookingId = ctx.match?.[1] as string | undefined;
  if (!from || !bookingId) return;
  const supabase = createServiceClient();

  const [userId, business] = await Promise.all([
    getUserIdByTelegramId(supabase, from.id),
    getPrimaryBusiness(supabase),
  ]);
  const booking = userId ? await getOwnedBooking(supabase, bookingId, userId) : null;

  await ctx.answerCallbackQuery();
  if (!booking || !business) {
    await ctx.editMessageText("Эта запись уже недоступна.");
    return;
  }
  await ctx.editMessageText(formatBookingCard(booking, business.timezone), {
    reply_markup: cancelKeyboard(booking.id),
  });
}

async function onCancelConfirm(ctx: Context): Promise<void> {
  const from = ctx.from;
  const bookingId = ctx.match?.[1] as string | undefined;
  if (!from || !bookingId) return;
  const supabase = createServiceClient();

  const userId = await getUserIdByTelegramId(supabase, from.id);
  const business = await getPrimaryBusiness(supabase);
  if (!userId || !business) {
    await ctx.answerCallbackQuery();
    return;
  }

  const booking = await getOwnedBooking(supabase, bookingId, userId);
  if (!booking) {
    await ctx.answerCallbackQuery({ text: "Эта запись уже недоступна." });
    return;
  }

  const deadlineHours = await getCancellationDeadlineHours(supabase, business.id);
  if (!canStillCancel(booking, deadlineHours)) {
    await ctx.answerCallbackQuery({ text: "Слишком поздно для отмены онлайн." });
    await ctx.editMessageText(
      `Эту запись уже нельзя отменить онлайн — отмена возможна не позднее чем за ${deadlineHours} ч. до визита.`
    );
    return;
  }

  // The status check in the WHERE clause makes this idempotent: a second
  // "Да, отменить" tap (or one that races with an admin action) updates
  // zero rows instead of cancelling twice or overwriting another status.
  const { data: updated } = await supabase
    .from("bookings")
    .update({ status: "CANCELLED" })
    .eq("id", bookingId)
    .eq("user_id", userId)
    .not("status", "in", "(CANCELLED,COMPLETED)")
    .select("id")
    .maybeSingle();

  if (!updated) {
    await ctx.answerCallbackQuery({ text: "Эта запись уже недоступна для отмены." });
    return;
  }

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    `Запись отменена ✅\n\n${formatBookingLine(booking, business.timezone)}`
  );

  await sendAdminCancellationNotice(ctx.api, bookingId);
}

function canStillCancel(booking: UserBooking, deadlineHours: number): boolean {
  const hoursUntilStart = (Date.parse(booking.start_time) - Date.now()) / 3_600_000;
  return hoursUntilStart >= deadlineHours;
}

function formatBookingCard(booking: UserBooking, zone: string): string {
  return [
    formatBookingLine(booking, zone),
    "",
    `Статус: ${STATUS_LABELS[booking.status] ?? booking.status}`,
  ].join("\n");
}

function formatBookingLine(booking: UserBooking, zone: string): string {
  const date = DateTime.fromISO(booking.date, { zone }).setLocale("ru").toFormat("d MMMM");
  const time = DateTime.fromISO(booking.start_time, { zone }).toFormat("HH:mm");
  return `${date}, ${time}\n${booking.service.name} — ${booking.artist.name}`;
}

function cancelKeyboard(bookingId: string): InlineKeyboard {
  return new InlineKeyboard().text("❌ Отменить", `cancel_request:${bookingId}`);
}
