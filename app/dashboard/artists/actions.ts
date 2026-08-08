"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dashboard/require-admin";
import { artistSchema } from "@/lib/validation/artists";
import * as artists from "@/lib/dashboard/artists";

const FK_VIOLATION = "23503";

export interface ArtistFormValues {
  name: string;
  specialization: string;
  bio: string;
  image_url: string;
  active: boolean;
  service_ids: string[];
}

export interface ArtistFormState {
  error?: string;
  values: ArtistFormValues;
}

function readForm(formData: FormData): ArtistFormValues {
  return {
    name: String(formData.get("name") ?? ""),
    specialization: String(formData.get("specialization") ?? ""),
    bio: String(formData.get("bio") ?? ""),
    image_url: String(formData.get("image_url") ?? ""),
    active: formData.get("active") === "on",
    service_ids: formData.getAll("service_ids").map(String),
  };
}

export async function createArtistAction(
  _prevState: ArtistFormState,
  formData: FormData
): Promise<ArtistFormState> {
  const values = readForm(formData);
  const parsed = artistSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, values };
  }

  const { supabase, business } = await requireAdmin();

  try {
    await artists.createArtist(supabase, business.id, parsed.data);
  } catch (err) {
    console.error("Failed to create artist:", err);
    return { error: "Не удалось сохранить мастера.", values };
  }

  revalidatePath("/dashboard/artists");
  redirect("/dashboard/artists");
}

export async function updateArtistAction(
  id: string,
  _prevState: ArtistFormState,
  formData: FormData
): Promise<ArtistFormState> {
  const values = readForm(formData);
  const parsed = artistSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, values };
  }

  const { supabase, business } = await requireAdmin();

  try {
    await artists.updateArtist(supabase, business.id, id, parsed.data);
  } catch (err) {
    console.error("Failed to update artist:", err);
    return { error: "Не удалось сохранить мастера.", values };
  }

  revalidatePath("/dashboard/artists");
  redirect("/dashboard/artists");
}

export async function setArtistActiveAction(id: string, active: boolean): Promise<void> {
  const { supabase, business } = await requireAdmin();
  await artists.setArtistActive(supabase, business.id, id, active);
  revalidatePath("/dashboard/artists");
}

export async function deleteArtistAction(id: string): Promise<void> {
  const { supabase, business } = await requireAdmin();

  try {
    await artists.deleteArtist(supabase, business.id, id);
  } catch (err) {
    const code = (err as { code?: string }).code;
    const reason = code === FK_VIOLATION ? "cannot_delete" : "delete_failed";
    redirect(`/dashboard/artists?error=${reason}`);
  }

  revalidatePath("/dashboard/artists");
  redirect("/dashboard/artists");
}
