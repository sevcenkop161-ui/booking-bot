import type { SupabaseClient } from "@supabase/supabase-js";

const UNIQUE_VIOLATION = "23505";

// Atomically claims an update_id by inserting it into telegram_updates_log,
// which has update_id as its primary key. Returns false if it's already
// there (Telegram redelivered an update we've seen before — section 36/56
// "duplicate update"), true if this call just claimed it.
//
// This check happens before any processing, not after, so that two
// deliveries of the same update arriving at the same time can't both slip
// through and run the handler twice. The trade-off: if handling the update
// throws partway through, it stays marked as claimed and won't be retried
// automatically. That's an intentional choice — see the webhook route.
export async function claimUpdate(supabase: SupabaseClient, updateId: number): Promise<boolean> {
  const { error } = await supabase.from("telegram_updates_log").insert({ update_id: updateId });
  if (!error) return true;
  if (error.code === UNIQUE_VIOLATION) return false;
  throw error;
}
