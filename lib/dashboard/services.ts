import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceInput } from "@/lib/validation/services";

export interface AdminService {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  active: boolean;
}

export async function getServices(supabase: SupabaseClient, businessId: string): Promise<AdminService[]> {
  const { data, error } = await supabase
    .from("services")
    .select("id, name, description, price, duration_minutes, active")
    .eq("business_id", businessId)
    .order("name");
  if (error) throw error;
  return data;
}

export async function getServiceById(
  supabase: SupabaseClient,
  businessId: string,
  id: string
): Promise<AdminService | null> {
  const { data } = await supabase
    .from("services")
    .select("id, name, description, price, duration_minutes, active")
    .eq("business_id", businessId)
    .eq("id", id)
    .maybeSingle();
  return data;
}

function toRow(input: ServiceInput) {
  return {
    name: input.name,
    description: input.description.length > 0 ? input.description : null,
    price: input.price,
    duration_minutes: input.duration_minutes,
    active: input.active,
  };
}

export async function createService(
  supabase: SupabaseClient,
  businessId: string,
  input: ServiceInput
): Promise<void> {
  const { error } = await supabase.from("services").insert({ business_id: businessId, ...toRow(input) });
  if (error) throw error;
}

export async function updateService(
  supabase: SupabaseClient,
  businessId: string,
  id: string,
  input: ServiceInput
): Promise<void> {
  const { error } = await supabase
    .from("services")
    .update(toRow(input))
    .eq("business_id", businessId)
    .eq("id", id);
  if (error) throw error;
}

export async function setServiceActive(
  supabase: SupabaseClient,
  businessId: string,
  id: string,
  active: boolean
): Promise<void> {
  const { error } = await supabase.from("services").update({ active }).eq("business_id", businessId).eq("id", id);
  if (error) throw error;
}

// Deleting a service that has bookings referencing it hits the
// ON DELETE RESTRICT foreign key on purpose — losing the service on a
// historical booking would corrupt that record. The caller is expected
// to catch the resulting Postgres error (code 23503) and suggest
// disabling the service instead.
export async function deleteService(supabase: SupabaseClient, businessId: string, id: string): Promise<void> {
  const { error } = await supabase.from("services").delete().eq("business_id", businessId).eq("id", id);
  if (error) throw error;
}
