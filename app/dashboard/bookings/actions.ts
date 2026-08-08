"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { BOOKING_STATUSES, type BookingStatus } from "@/lib/dashboard/bookings";

// This runs as the logged-in admin (session-bound client), so the
// "admins can update their business bookings" RLS policy is the actual
// gate here — a non-admin session, or a session for a different
// business, gets zero rows updated regardless of what bookingId is
// passed in.
export async function updateBookingStatus(bookingId: string, newStatus: BookingStatus): Promise<void> {
  if (!BOOKING_STATUSES.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("bookings").update({ status: newStatus }).eq("id", bookingId);
  if (error) throw error;

  revalidatePath("/dashboard/bookings");
}
