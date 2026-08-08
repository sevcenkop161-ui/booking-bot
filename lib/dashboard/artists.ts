import type { SupabaseClient } from "@supabase/supabase-js";
import type { ArtistInput } from "@/lib/validation/artists";

export interface AdminArtist {
  id: string;
  name: string;
  specialization: string | null;
  bio: string | null;
  image_url: string | null;
  active: boolean;
}

export async function getArtists(supabase: SupabaseClient, businessId: string): Promise<AdminArtist[]> {
  const { data, error } = await supabase
    .from("artists")
    .select("id, name, specialization, bio, image_url, active")
    .eq("business_id", businessId)
    .order("name");
  if (error) throw error;
  return data;
}

export async function getArtistById(
  supabase: SupabaseClient,
  businessId: string,
  id: string
): Promise<AdminArtist | null> {
  const { data } = await supabase
    .from("artists")
    .select("id, name, specialization, bio, image_url, active")
    .eq("business_id", businessId)
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function getArtistServiceIds(supabase: SupabaseClient, artistId: string): Promise<string[]> {
  const { data, error } = await supabase.from("artist_services").select("service_id").eq("artist_id", artistId);
  if (error) throw error;
  return data.map((row) => row.service_id as string);
}

function toRow(input: ArtistInput) {
  return {
    name: input.name,
    specialization: input.specialization.length > 0 ? input.specialization : null,
    bio: input.bio.length > 0 ? input.bio : null,
    image_url: input.image_url.length > 0 ? input.image_url : null,
    active: input.active,
  };
}

// artists.slug is NOT NULL + unique per business, but nothing in the UI
// collects one — it's an internal identifier, not something shown to
// clients. A random suffix sidesteps both collisions and non-Latin
// names (Cyrillic, etc.) that wouldn't otherwise slugify to anything.
function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = Math.random().toString(36).slice(2, 8);
  return base ? `${base}-${suffix}` : suffix;
}

// Replaces the full set of linked services in one go (delete-then-insert)
// rather than diffing — artists link to at most a handful of services,
// so this is simpler than computing adds/removes and just as correct.
async function setArtistServices(
  supabase: SupabaseClient,
  artistId: string,
  serviceIds: string[]
): Promise<void> {
  const { error: deleteError } = await supabase.from("artist_services").delete().eq("artist_id", artistId);
  if (deleteError) throw deleteError;

  if (serviceIds.length > 0) {
    const { error: insertError } = await supabase
      .from("artist_services")
      .insert(serviceIds.map((serviceId) => ({ artist_id: artistId, service_id: serviceId })));
    if (insertError) throw insertError;
  }
}

export async function createArtist(
  supabase: SupabaseClient,
  businessId: string,
  input: ArtistInput
): Promise<void> {
  const { data, error } = await supabase
    .from("artists")
    .insert({ business_id: businessId, slug: generateSlug(input.name), ...toRow(input) })
    .select("id")
    .single();
  if (error) throw error;

  await setArtistServices(supabase, data.id, input.service_ids);
}

export async function updateArtist(
  supabase: SupabaseClient,
  businessId: string,
  id: string,
  input: ArtistInput
): Promise<void> {
  const { error } = await supabase.from("artists").update(toRow(input)).eq("business_id", businessId).eq("id", id);
  if (error) throw error;

  await setArtistServices(supabase, id, input.service_ids);
}

export async function setArtistActive(
  supabase: SupabaseClient,
  businessId: string,
  id: string,
  active: boolean
): Promise<void> {
  const { error } = await supabase.from("artists").update({ active }).eq("business_id", businessId).eq("id", id);
  if (error) throw error;
}

// Same ON DELETE RESTRICT consideration as services: an artist with
// existing bookings can't be deleted outright (artist_services rows
// cascade-delete fine, bookings.artist_id does not).
export async function deleteArtist(supabase: SupabaseClient, businessId: string, id: string): Promise<void> {
  const { error } = await supabase.from("artists").delete().eq("business_id", businessId).eq("id", id);
  if (error) throw error;
}
