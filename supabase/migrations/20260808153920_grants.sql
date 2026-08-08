-- Table-level GRANTs (separate from Row Level Security).
--
-- RLS policies only restrict access that a role already has at the SQL
-- level — they never grant it. When the Supabase Dashboard's table editor
-- creates a table it also runs GRANT statements for you; our tables were
-- created through plain migrations instead, so those grants never
-- happened. Without them, service_role gets "permission denied" even
-- though it bypasses RLS, because BYPASSRLS only skips policy checks, not
-- the underlying GRANT system.
--
-- service_role is our trusted backend (bot + admin API), so it gets full
-- access on every table. authenticated (real dashboard admins) also gets
-- full SQL-level access, but is then actually restricted by the RLS
-- policies from the previous migration — for booking_drafts and
-- telegram_updates_log, which have RLS enabled with zero policies, that
-- means authenticated effectively still gets nothing. anon gets nothing
-- at all: no part of this app talks to Postgres directly as anon.

grant usage on schema public to service_role, authenticated;

grant select, insert, update, delete on all tables in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Cover tables created by future migrations too, so this doesn't have to
-- be remembered and repeated every time.
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to service_role, authenticated;
