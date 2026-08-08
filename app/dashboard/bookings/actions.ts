"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dashboard/require-admin";
import { BOOKING_STATUSES, type BookingStatus } from "@/lib/dashboard/bookings";
import { logger } from "@/lib/logger";

// requireAdmin() is the explicit app-level check; the "admins can
// update their business bookings" RLS policy is the real backstop —
// a non-admin session, or a session for a different business, gets
// zero rows updated regardless of what bookingId is passed in.
export async function updateBookingStatus(bookingId: string, newStatus: BookingStatus): Promise<void> {
  if (!BOOKING_STATUSES.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }

  const { supabase, userId } = await requireAdmin();
  const { error } = await supabase.from("bookings").update({ status: newStatus }).eq("id", bookingId);
  if (error) throw error;

  logger.info("admin_action", { action: "booking_status_changed", bookingId, newStatus, adminUserId: userId });
  revalidatePath("/dashboard/bookings");
}
