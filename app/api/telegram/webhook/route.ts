import { bot, ensureBotInitialized } from "@/lib/telegram/bot";
import { claimUpdate } from "@/lib/telegram/idempotency";
import { createServiceClient } from "@/lib/supabase/service-client";

export async function POST(request: Request) {
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response(null, { status: 401 });
  }

  let update: { update_id: number };
  try {
    update = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  try {
    const supabase = createServiceClient();
    const isNewUpdate = await claimUpdate(supabase, update.update_id);
    if (!isNewUpdate) {
      return new Response(null, { status: 200 });
    }

    await ensureBotInitialized();
    await bot.handleUpdate(update);
  } catch (err) {
    // Always answer Telegram with 200: this update_id is already claimed,
    // so a Telegram-triggered retry would just be dropped by claimUpdate
    // anyway (see its comment). Logging is how we notice failures instead.
    console.error("Failed to handle Telegram update:", err);
  }

  return new Response(null, { status: 200 });
}
