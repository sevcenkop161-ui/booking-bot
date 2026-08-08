import { DateTime } from "luxon";
import { InlineKeyboard, type Api, type Bot, type Context } from "grammy";
import { createServiceClient } from "@/lib/supabase/service-client";
import { getBookingWithDetails, getPrimaryBusiness, type Business } from "@/lib/telegram/queries";
import { formatFullDate } from "./format";

function adminChatId(): number | null {
  const raw = process.env.ADMIN_TELEGRAM_ID;
  if (!raw) return null;
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}

function buildNotificationText(business: Business, booking: {
  user: { first_name: string | null; phone: string | null };
  service: { name: string };
  artist: { name: string };
  date: string;
  start_time: string;
  comment: string | null;
}): string {
  return [
    "🔔 Новая запись",
    "",
    `Клиент: ${booking.user.first_name ?? "—"}`,
    `Услуга: ${booking.service.name}`,
    `Мастер: ${booking.artist.name}`,
    `Дата: ${formatFullDate(booking.date, business.timezone)}`,
    `Время: ${DateTime.fromISO(booking.start_time, { zone: business.timezone }).toFormat("HH:mm")}`,
    `Телефон: ${booking.user.phone ?? "—"}`,
    `Комментарий: ${booking.comment ?? "—"}`,
  ].join("\n");
}

// Section 20: notify the admin about a new PENDING booking, with buttons
// to confirm or reject it directly from the notification.
export async function sendAdminNewBookingNotification(api: Api, bookingId: string): Promise<void> {
  const chatId = adminChatId();
  if (!chatId) {
    console.error("ADMIN_TELEGRAM_ID is not set — skipping admin notification");
    return;
  }

  const supabase = createServiceClient();
  const [business, booking] = await Promise.all([
    getPrimaryBusiness(supabase),
    getBookingWithDetails(supabase, bookingId),
  ]);
  if (!business || !booking) return;

  const keyboard = new InlineKeyboard()
    .text("✅ Подтвердить", `admin_confirm:${bookingId}`)
    .text("❌ Отклонить", `admin_reject:${bookingId}`);

  await api.sendMessage(chatId, buildNotificationText(business, booking), { reply_markup: keyboard });
}

export function registerAdminActions(bot: Bot): void {
  bot.callbackQuery(/^admin_(confirm|reject):(.+)$/, onAdminAction);
}

async function onAdminAction(ctx: Context): Promise<void> {
  const from = ctx.from;
  const match = ctx.match as RegExpMatchArray | undefined;
  if (!from || !match) return;

  const chatId = adminChatId();
  if (!chatId || from.id !== chatId) {
    // Server-side check, not just "only the admin sees this button"
    // (section 34) — the bot never trusts the client alone.
    await ctx.answerCallbackQuery({ text: "Недостаточно прав." });
    return;
  }

  const action = match[1] as "confirm" | "reject";
  const bookingId = match[2];
  const newStatus = action === "confirm" ? "CONFIRMED" : "CANCELLED";

  const supabase = createServiceClient();

  // The WHERE status = 'PENDING' guard makes this idempotent: a second
  // click (or a click after the client already cancelled) updates zero
  // rows instead of re-sending notifications.
  const { data: updated } = await supabase
    .from("bookings")
    .update({ status: newStatus })
    .eq("id", bookingId)
    .eq("status", "PENDING")
    .select("id, user_id, date, start_time")
    .maybeSingle();

  if (!updated) {
    await ctx.answerCallbackQuery({ text: "Эта заявка уже обработана." });
    return;
  }

  await ctx.answerCallbackQuery();

  const business = await getPrimaryBusiness(supabase);
  const zone = business?.timezone ?? "UTC";
  const dateLabel = formatFullDate(updated.date, zone);
  const timeLabel = DateTime.fromISO(updated.start_time, { zone }).toFormat("HH:mm");
  const outcomeLine = action === "confirm" ? "✅ Подтверждено" : "❌ Отклонено";

  const originalText = ctx.callbackQuery?.message?.text;
  await ctx.editMessageText(originalText ? `${originalText}\n\n${outcomeLine}` : outcomeLine);

  const { data: user } = await supabase
    .from("users")
    .select("telegram_id")
    .eq("id", updated.user_id)
    .single();
  if (!user) return;

  const clientText =
    action === "confirm"
      ? `Ваша запись на ${dateLabel} в ${timeLabel} подтверждена ✅`
      : `К сожалению, ваша запись на ${dateLabel} в ${timeLabel} отклонена ❌. Свяжитесь с администратором, если у вас есть вопросы.`;
  await ctx.api.sendMessage(user.telegram_id, clientText);
}
