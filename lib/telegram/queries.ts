import type { SupabaseClient } from "@supabase/supabase-js";

export interface Business {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
}

export interface ServiceListItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
}

export interface ArtistListItem {
  id: string;
  name: string;
  specialization: string | null;
  bio: string | null;
  image_url: string | null;
}

// MVP is single-business; every business_id lookup goes through this one
// place so switching to a real multi-business lookup later is a one-line
// change instead of hunting down every call site (section 32).
export async function getPrimaryBusiness(supabase: SupabaseClient): Promise<Business | null> {
  const { data } = await supabase
    .from("businesses")
    .select("id, name, description, address, phone")
    .limit(1)
    .single();
  return data;
}

export async function getActiveServices(
  supabase: SupabaseClient,
  businessId: string
): Promise<ServiceListItem[]> {
  const { data, error } = await supabase
    .from("services")
    .select("id, name, description, price, duration_minutes")
    .eq("business_id", businessId)
    .eq("active", true)
    .order("name");
  if (error) throw error;
  return data;
}

export async function getActiveArtists(
  supabase: SupabaseClient,
  businessId: string
): Promise<ArtistListItem[]> {
  const { data, error } = await supabase
    .from("artists")
    .select("id, name, specialization, bio, image_url")
    .eq("business_id", businessId)
    .eq("active", true)
    .order("name");
  if (error) throw error;
  return data;
}
