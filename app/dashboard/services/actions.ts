"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dashboard/require-admin";
import { serviceSchema } from "@/lib/validation/services";
import * as services from "@/lib/dashboard/services";

const FK_VIOLATION = "23503";

export interface ServiceFormValues {
  name: string;
  description: string;
  price: string;
  duration_minutes: string;
  active: boolean;
}

export interface ServiceFormState {
  error?: string;
  values: ServiceFormValues;
}

function readForm(formData: FormData): ServiceFormValues {
  return {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    price: String(formData.get("price") ?? ""),
    duration_minutes: String(formData.get("duration_minutes") ?? ""),
    active: formData.get("active") === "on",
  };
}

export async function createServiceAction(
  _prevState: ServiceFormState,
  formData: FormData
): Promise<ServiceFormState> {
  const values = readForm(formData);
  const parsed = serviceSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, values };
  }

  const { supabase, business } = await requireAdmin();

  try {
    await services.createService(supabase, business.id, parsed.data);
  } catch (err) {
    console.error("Failed to create service:", err);
    return { error: "Не удалось сохранить услугу.", values };
  }

  revalidatePath("/dashboard/services");
  redirect("/dashboard/services");
}

export async function updateServiceAction(
  id: string,
  _prevState: ServiceFormState,
  formData: FormData
): Promise<ServiceFormState> {
  const values = readForm(formData);
  const parsed = serviceSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, values };
  }

  const { supabase, business } = await requireAdmin();

  try {
    await services.updateService(supabase, business.id, id, parsed.data);
  } catch (err) {
    console.error("Failed to update service:", err);
    return { error: "Не удалось сохранить услугу.", values };
  }

  revalidatePath("/dashboard/services");
  redirect("/dashboard/services");
}

export async function setServiceActiveAction(id: string, active: boolean): Promise<void> {
  const { supabase, business } = await requireAdmin();
  await services.setServiceActive(supabase, business.id, id, active);
  revalidatePath("/dashboard/services");
}

export async function deleteServiceAction(id: string): Promise<void> {
  const { supabase, business } = await requireAdmin();

  try {
    await services.deleteService(supabase, business.id, id);
  } catch (err) {
    const code = (err as { code?: string }).code;
    const reason = code === FK_VIOLATION ? "cannot_delete" : "delete_failed";
    redirect(`/dashboard/services?error=${reason}`);
  }

  revalidatePath("/dashboard/services");
  redirect("/dashboard/services");
}
