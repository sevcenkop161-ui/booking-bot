import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Session-bound client for Server Components / Route Handlers — requests
// go out as the logged-in user (anon key + their JWT from cookies), so
// RLS actually applies. This is what makes the admins/bookings/etc.
// policies from the database migration meaningful, not just theoretical.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component render, which can't set
            // cookies — proxy.ts is what actually refreshes the session
            // in that case, this call is just a no-op there.
          }
        },
      },
    }
  );
}
