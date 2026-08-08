-- Row Level Security policies (PROJECT_SPEC.md section 34/41).
--
-- Design principle: the Telegram bot backend always talks to Postgres
-- with the service role key, which bypasses RLS entirely — that's the
-- backend's own job to authorize (it's a trusted server, not a public
-- client). RLS here exists as the second line of defense for the admin
-- dashboard: even if a browser ever queries Supabase directly with a
-- user's session (anon key + JWT) instead of going through our API,
-- it must not be able to see or change another business's data, or
-- act with more privilege than its role allows.
--
-- No table gets a public/anon policy in this migration — everything
-- defaults to "deny" unless a policy explicitly allows it for an
-- authenticated admin. That's deliberate: nothing in the MVP needs
-- direct anonymous access to Postgres.

-- security definer avoids RLS recursion when this function is used
-- inside a policy on the admins table itself, and lets us keep the
-- admin-check logic in one place instead of repeating the subquery.
create or replace function is_business_admin(
  target_business_id uuid,
  allowed_roles admin_role[] default array['OWNER', 'ADMIN', 'STAFF']::admin_role[]
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from admins
    where admins.user_id = auth.uid()
      and admins.business_id = target_business_id
      and admins.role = any(allowed_roles)
  );
$$;

-- ============================================================
-- businesses
-- ============================================================
alter table businesses enable row level security;

create policy "admins can view their business"
  on businesses for select
  using (is_business_admin(id));

create policy "owners can update their business"
  on businesses for update
  using (is_business_admin(id, array['OWNER']::admin_role[]));

-- ============================================================
-- users (Telegram clients — contact data, keep tightly scoped)
-- ============================================================
alter table users enable row level security;

create policy "admins can view telegram clients"
  on users for select
  using (exists (select 1 from admins where admins.user_id = auth.uid()));

-- No insert/update/delete policy: only the service role (bot backend)
-- ever writes to this table.

-- ============================================================
-- admins
-- ============================================================
alter table admins enable row level security;

create policy "admins can view their own row or peers in their business"
  on admins for select
  using (
    user_id = auth.uid()
    or is_business_admin(business_id, array['OWNER']::admin_role[])
  );

create policy "owners can manage admins in their business"
  on admins for all
  using (is_business_admin(business_id, array['OWNER']::admin_role[]))
  with check (is_business_admin(business_id, array['OWNER']::admin_role[]));

-- ============================================================
-- artists
-- ============================================================
alter table artists enable row level security;

create policy "admins can view their business artists"
  on artists for select
  using (is_business_admin(business_id));

create policy "admins can manage their business artists"
  on artists for insert
  with check (is_business_admin(business_id, array['OWNER', 'ADMIN']::admin_role[]));

create policy "admins can update their business artists"
  on artists for update
  using (is_business_admin(business_id, array['OWNER', 'ADMIN']::admin_role[]))
  with check (is_business_admin(business_id, array['OWNER', 'ADMIN']::admin_role[]));

create policy "admins can delete their business artists"
  on artists for delete
  using (is_business_admin(business_id, array['OWNER', 'ADMIN']::admin_role[]));

-- ============================================================
-- services
-- ============================================================
alter table services enable row level security;

create policy "admins can view their business services"
  on services for select
  using (is_business_admin(business_id));

create policy "admins can insert their business services"
  on services for insert
  with check (is_business_admin(business_id, array['OWNER', 'ADMIN']::admin_role[]));

create policy "admins can update their business services"
  on services for update
  using (is_business_admin(business_id, array['OWNER', 'ADMIN']::admin_role[]))
  with check (is_business_admin(business_id, array['OWNER', 'ADMIN']::admin_role[]));

create policy "admins can delete their business services"
  on services for delete
  using (is_business_admin(business_id, array['OWNER', 'ADMIN']::admin_role[]));

-- ============================================================
-- artist_services (scoped via the artist it belongs to)
-- ============================================================
alter table artist_services enable row level security;

create policy "admins can view artist_services for their business"
  on artist_services for select
  using (
    exists (
      select 1 from artists
      where artists.id = artist_services.artist_id
        and is_business_admin(artists.business_id)
    )
  );

create policy "admins can manage artist_services for their business"
  on artist_services for all
  using (
    exists (
      select 1 from artists
      where artists.id = artist_services.artist_id
        and is_business_admin(artists.business_id, array['OWNER', 'ADMIN']::admin_role[])
    )
  )
  with check (
    exists (
      select 1 from artists
      where artists.id = artist_services.artist_id
        and is_business_admin(artists.business_id, array['OWNER', 'ADMIN']::admin_role[])
    )
  );

-- ============================================================
-- bookings
-- ============================================================
alter table bookings enable row level security;

create policy "admins can view their business bookings"
  on bookings for select
  using (is_business_admin(business_id));

-- Creation/cancellation from the Telegram side always goes through the
-- service role (see architecture notes on double-booking, section 16).
-- Admins can still change status (confirm/cancel/complete/no-show)
-- directly if the dashboard ever bypasses the API layer.
create policy "admins can update their business bookings"
  on bookings for update
  using (is_business_admin(business_id))
  with check (is_business_admin(business_id));

-- ============================================================
-- working_hours / breaks / time_off / business_settings
-- (schedule management — same shape of policy for all four)
-- ============================================================
alter table working_hours enable row level security;

create policy "admins can view their business working_hours"
  on working_hours for select
  using (is_business_admin(business_id));

create policy "admins can manage their business working_hours"
  on working_hours for all
  using (is_business_admin(business_id, array['OWNER', 'ADMIN']::admin_role[]))
  with check (is_business_admin(business_id, array['OWNER', 'ADMIN']::admin_role[]));

alter table breaks enable row level security;

create policy "admins can view their business breaks"
  on breaks for select
  using (is_business_admin(business_id));

create policy "admins can manage their business breaks"
  on breaks for all
  using (is_business_admin(business_id, array['OWNER', 'ADMIN']::admin_role[]))
  with check (is_business_admin(business_id, array['OWNER', 'ADMIN']::admin_role[]));

alter table time_off enable row level security;

create policy "admins can view their business time_off"
  on time_off for select
  using (is_business_admin(business_id));

create policy "admins can manage their business time_off"
  on time_off for all
  using (is_business_admin(business_id, array['OWNER', 'ADMIN']::admin_role[]))
  with check (is_business_admin(business_id, array['OWNER', 'ADMIN']::admin_role[]));

alter table business_settings enable row level security;

create policy "admins can view their business settings"
  on business_settings for select
  using (is_business_admin(business_id));

create policy "owners can manage their business settings"
  on business_settings for all
  using (is_business_admin(business_id, array['OWNER']::admin_role[]))
  with check (is_business_admin(business_id, array['OWNER']::admin_role[]));

-- ============================================================
-- booking_drafts / telegram_updates_log
-- Purely internal bot-backend state. RLS enabled with zero policies,
-- so even the anon/authenticated roles get nothing — only the service
-- role (which bypasses RLS) can touch these.
-- ============================================================
alter table booking_drafts enable row level security;
alter table telegram_updates_log enable row level security;
