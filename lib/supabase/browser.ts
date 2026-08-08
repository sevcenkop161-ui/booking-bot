import { createBrowserClient } from "@supabase/ssr";

// Anon-key client for Client Components (the login form). Never import
// this anywhere that has access to the service role key.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
