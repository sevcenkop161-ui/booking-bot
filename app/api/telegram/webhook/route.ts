import { z } from "zod";
import { bot, ensureBotInitialized } from "@/lib/telegram/bot";
import { claimUpdate } from "@/lib/telegram/idempotency";
import { createServiceClient } from "@/lib/supabase/service-client";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// Loose on purpose: we only need to trust update_id enough to key
// idempotency on it, and the sender's id enough to rate-limit by it.
// The full shape is grammY's concern once it reaches bot.handleUpdate.
const updateSchema = z
  .object({
    update_id: z.number(),
    message: z.object({ from: z.object({ id: z.number() }).optional() }).optional(),
    callback_query: z.object({ from: z.object({ id: z.number() }).optional() }).optional(),
  })
  .loose();

const RATE_LIMIT = 20;
const RATE_LIMIT_WINDOW_MS = 10_000;

export async function POST(request: Request) {
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response(null, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(null, { status: 400 });
  }
  const update = parsed.data;

  // Rate-limit per Telegram user, not per IP — every update genuinely
  // comes from Telegram's own servers regardless of which end user
  // triggered it, so IP isn't a meaningful key here. This guards against
  // one abusive user hammering buttons/messages, not against Telegram
  // itself (section 43).
  const fromId = update.message?.from?.id ?? update.callback_query?.from?.id;
  if (fromId !== undefined && isRateLimited(`tg:${fromId}`, RATE_LIMIT, RATE_LIMIT_WINDOW_MS)) {
    return new Response(null, { status: 200 });
  }

  try {
    const supabase = createServiceClient();
    const isNewUpdate = await claimUpdate(supabase, update.update_id);
    if (!isNewUpdate) {
      return new Response(null, { status: 200 });
    }

    await ensureBotInitialized();
    // Zod only validated the handful of fields we need (update_id, the
    // sender id for rate limiting); `body` is the full original payload
    // and is what grammY actually needs to process the update.
    await bot.handleUpdate(body as Parameters<typeof bot.handleUpdate>[0]);
  } catch (err) {
    // Always answer Telegram with 200: this update_id is already claimed,
    // so a Telegram-triggered retry would just be dropped by claimUpdate
    // anyway (see its comment). Logging is how we notice failures instead.
    logger.error("telegram_webhook_failed", { updateId: update.update_id, error: String(err) });
  }

  return new Response(null, { status: 200 });
}
