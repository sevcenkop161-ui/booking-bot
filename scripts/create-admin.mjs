// One-off bootstrap script: creates a Supabase Auth user and links them
// to the primary business as an OWNER in the admins table. Not part of
// the Next.js app — run manually whenever a new admin account is needed
// (including against a real deployed project, not just local dev).
//
// Usage:
//   node --env-file=.env.local scripts/create-admin.mjs <email> <password>

import { createClient } from "@supabase/supabase-js";

const [, , email, password] = process.argv;
if (!email || !password) {
  console.error("Usage: node --env-file=.env.local scripts/create-admin.mjs <email> <password>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: business, error: businessError } = await supabase
  .from("businesses")
  .select("id")
  .limit(1)
  .single();
if (businessError || !business) {
  console.error("No business found — run the seed data first.");
  process.exit(1);
}

const { data: created, error: createError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (createError) {
  console.error("Failed to create auth user:", createError.message);
  process.exit(1);
}

const { error: adminError } = await supabase
  .from("admins")
  .upsert({ user_id: created.user.id, business_id: business.id, role: "OWNER" }, { onConflict: "user_id" });
if (adminError) {
  console.error("Failed to insert admins row:", adminError.message);
  process.exit(1);
}

console.log(`Admin created: ${email} (user_id: ${created.user.id}), role OWNER on business ${business.id}`);
