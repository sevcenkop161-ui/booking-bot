import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryBusiness, type Business } from "@/lib/business";

export interface AdminContext {
  supabase: SupabaseClient;
  business: Business;
  userId: string;
  role: "OWNER" | "ADMIN" | "STAFF";
}

// Explicit, app-level authorization check for every dashboard Server
// Action — RLS is the real guarantee (a bad session gets zero rows
// regardless), but section 34 asks for checks that don't rely on any
// single layer alone. This is the second layer: fail loudly and early
// instead of silently updating nothing.
export async function requireAdmin(): Promise<AdminContext> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const business = await getPrimaryBusiness(supabase);
  if (!business) redirect("/login");

  const { data: admin } = await supabase
    .from("admins")
    .select("role")
    .eq("user_id", user.id)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!admin) redirect("/login");

  return { supabase, business, userId: user.id, role: admin.role };
}
