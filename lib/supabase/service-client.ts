import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role client for server-only code (API routes, the Telegram bot
// backend). It bypasses Row Level Security entirely, so it must never be
// imported from client components, and SUPABASE_SERVICE_ROLE_KEY must
// never reach the browser (section 41).
export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
