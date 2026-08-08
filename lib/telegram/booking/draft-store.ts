import type { SupabaseClient } from "@supabase/supabase-js";

// A draft holds the in-progress booking for one Telegram user while they
// click through service -> artist -> date -> time and then type their
// contact details. It exists because Next.js route handlers are
// stateless between requests — see the architecture notes on the
// availability engine / webhook for why this can't just live in memory.
export type BookingStep = "service" | "artist" | "date" | "time" | "name" | "phone" | "comment" | "confirm";

export interface BookingDraft {
  telegram_id: number;
  business_id: string;
  step: BookingStep;
  service_id: string | null;
  artist_id: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  name: string | null;
  phone: string | null;
  comment: string | null;
}

const DRAFT_TTL_MINUTES = 15;

function expiresAt(): string {
  return new Date(Date.now() + DRAFT_TTL_MINUTES * 60_000).toISOString();
}

export async function startDraft(
  supabase: SupabaseClient,
  telegramId: number,
  businessId: string
): Promise<void> {
  await supabase.from("booking_drafts").upsert(
    {
      telegram_id: telegramId,
      business_id: businessId,
      step: "service",
      service_id: null,
      artist_id: null,
      date: null,
      start_time: null,
      end_time: null,
      name: null,
      phone: null,
      comment: null,
      updated_at: new Date().toISOString(),
      expires_at: expiresAt(),
    },
    { onConflict: "telegram_id" }
  );
}

// Returns null both when there's no draft and when it has expired (and
// deletes the expired row) — callers only need to handle one case:
// "there's nothing to continue, start over" (section 56 "expired state").
export async function getDraft(
  supabase: SupabaseClient,
  telegramId: number
): Promise<BookingDraft | null> {
  const { data } = await supabase
    .from("booking_drafts")
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();
  if (!data) return null;

  if (new Date(data.expires_at).getTime() < Date.now()) {
    await clearDraft(supabase, telegramId);
    return null;
  }
  return data;
}

export async function updateDraft(
  supabase: SupabaseClient,
  telegramId: number,
  patch: Partial<Omit<BookingDraft, "telegram_id" | "business_id">>
): Promise<void> {
  await supabase
    .from("booking_drafts")
    .update({ ...patch, updated_at: new Date().toISOString(), expires_at: expiresAt() })
    .eq("telegram_id", telegramId);
}

export async function clearDraft(supabase: SupabaseClient, telegramId: number): Promise<void> {
  await supabase.from("booking_drafts").delete().eq("telegram_id", telegramId);
}
