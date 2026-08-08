import { Bot, Keyboard, type Context } from "grammy";
import { createServiceClient } from "@/lib/supabase/service-client";
import { formatArtistList, formatServiceList } from "@/lib/telegram/formatters";
import { getActiveArtists, getActiveServices, getPrimaryBusiness } from "@/lib/telegram/queries";
import { registerBookingFlow } from "@/lib/telegram/booking/handlers";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set");
}

export const bot = new Bot(token);

// grammY needs one getMe call before it can process updates. Route handlers
// are stateless between cold starts, but within a warm instance this
// promise is cached so we don't repeat that call on every request.
let initPromise: Promise<void> | null = null;
export async function ensureBotInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = bot.init();
  }
  await initPromise;
}

const MENU_LABELS = {
  book: "📅 Записаться",
  myBookings: "📋 Мои записи",
  services: "💇 Услуги",
  artists: "👤 Мастера",
  about: "ℹ️ О студии",
  help: "❓ Помощь",
} as const;

const mainMenu = new Keyboard()
  .text(MENU_LABELS.book)
  .text(MENU_LABELS.myBookings)
  .row()
  .text(MENU_LABELS.services)
  .text(MENU_LABELS.artists)
  .row()
  .text(MENU_LABELS.about)
  .text(MENU_LABELS.help)
  .resized();

async function sendHelp(ctx: Context) {
  await ctx.reply(
    "Если у вас есть вопрос — напишите администратору.\n\n/start — открыть главное меню"
  );
}

bot.command("start", async (ctx) => {
  const from = ctx.from;
  if (!from) return;

  const supabase = createServiceClient();

  // Save the Telegram user now, automatically — the client never types
  // in their own Telegram ID (section 13).
  await supabase.from("users").upsert(
    {
      telegram_id: from.id,
      username: from.username ?? null,
      first_name: from.first_name ?? null,
      last_name: from.last_name ?? null,
    },
    { onConflict: "telegram_id" }
  );

  const business = await getPrimaryBusiness(supabase);
  const businessName = business?.name ?? "нашу студию";
  await ctx.reply(`Добро пожаловать в ${businessName} 👋\nВыберите действие:`, {
    reply_markup: mainMenu,
  });
});

bot.command("help", sendHelp);
bot.hears(MENU_LABELS.help, sendHelp);

bot.hears(MENU_LABELS.about, async (ctx) => {
  const supabase = createServiceClient();
  const business = await getPrimaryBusiness(supabase);

  if (!business) {
    await ctx.reply("Информация о студии временно недоступна.");
    return;
  }

  const lines = [
    business.name,
    business.description,
    business.address ? `Адрес: ${business.address}` : null,
    business.phone ? `Телефон: ${business.phone}` : null,
  ].filter((line): line is string => Boolean(line));

  await ctx.reply(lines.join("\n"));
});

bot.hears(MENU_LABELS.services, async (ctx) => {
  const supabase = createServiceClient();
  const business = await getPrimaryBusiness(supabase);
  if (!business) {
    await ctx.reply("Информация об услугах временно недоступна.");
    return;
  }

  const services = await getActiveServices(supabase, business.id);
  await ctx.reply(formatServiceList(services), { parse_mode: "HTML" });
});

bot.hears(MENU_LABELS.artists, async (ctx) => {
  const supabase = createServiceClient();
  const business = await getPrimaryBusiness(supabase);
  if (!business) {
    await ctx.reply("Информация о мастерах временно недоступна.");
    return;
  }

  const artists = await getActiveArtists(supabase, business.id);
  await ctx.reply(formatArtistList(artists), { parse_mode: "HTML" });
});

registerBookingFlow(bot);

// "My bookings" is built in a later phase — this just confirms the
// button is wired up end to end.
bot.hears(MENU_LABELS.myBookings, async (ctx) => {
  await ctx.reply("Этот раздел ещё в разработке — совсем скоро здесь можно будет посмотреть свои записи 🙂");
});

bot.catch((err) => {
  console.error("Telegram bot error:", err);
});
