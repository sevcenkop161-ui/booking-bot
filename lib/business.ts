import type { SupabaseClient } from "@supabase/supabase-js";

export interface Business {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  timezone: string;
}

// MVP is single-business; every business_id lookup goes through this one
// place so switching to a real multi-business lookup later is a one-line
// change instead of hunting down every call site (section 32). Shared
// between the Telegram bot and the admin dashboard.
export async function getPrimaryBusiness(supabase: SupabaseClient): Promise<Business | null> {
  const { data } = await supabase
    .from("businesses")
    .select("id, name, description, address, phone, timezone")
    .limit(1)
    .single();
  return data;
}
