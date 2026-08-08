-- Booking Bot: initial schema
-- Tables follow PROJECT_SPEC.md section 30, plus two technical tables
-- (booking_drafts, telegram_updates_log) needed to satisfy the idempotency
-- and multi-step Telegram flow requirements from sections 36/40.

create extension if not exists pgcrypto;
-- btree_gist lets us build a range-exclusion constraint on bookings,
-- which is the core defense against double-booking (section 16/56).
create extension if not exists btree_gist;

create type booking_status as enum ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');
create type admin_role as enum ('OWNER', 'ADMIN', 'STAFF');

-- Generic trigger to keep updated_at accurate without repeating logic
-- in application code.
create function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- businesses
-- ============================================================
create table businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  timezone text not null default 'Europe/Moscow',
  phone text,
  telegram text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger businesses_set_updated_at
  before update on businesses
  for each row execute function set_updated_at();

-- ============================================================
-- users (Telegram clients — not Supabase Auth users)
-- ============================================================
create table users (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint not null unique,
  username text,
  first_name text,
  last_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger users_set_updated_at
  before update on users
  for each row execute function set_updated_at();

-- ============================================================
-- admins (dashboard users, linked to Supabase Auth)
-- ============================================================
create table admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  business_id uuid not null references businesses (id) on delete cascade,
  role admin_role not null default 'ADMIN',
  created_at timestamptz not null default now()
);

create index admins_business_idx on admins (business_id);

-- ============================================================
-- artists
-- ============================================================
create table artists (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  name text not null,
  slug text not null,
  bio text,
  specialization text,
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, slug)
);

create trigger artists_set_updated_at
  before update on artists
  for each row execute function set_updated_at();

create index artists_business_idx on artists (business_id) where active;

-- ============================================================
-- services
-- ============================================================
create table services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  name text not null,
  description text,
  price numeric(10, 2) not null default 0 check (price >= 0),
  duration_minutes int not null check (duration_minutes > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger services_set_updated_at
  before update on services
  for each row execute function set_updated_at();

create index services_business_idx on services (business_id) where active;

-- ============================================================
-- artist_services (many-to-many)
-- ============================================================
create table artist_services (
  artist_id uuid not null references artists (id) on delete cascade,
  service_id uuid not null references services (id) on delete cascade,
  primary key (artist_id, service_id)
);

-- ============================================================
-- bookings — the core table, with the double-booking guard
-- ============================================================
create table bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  user_id uuid not null references users (id) on delete restrict,
  artist_id uuid not null references artists (id) on delete restrict,
  service_id uuid not null references services (id) on delete restrict,
  date date not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status booking_status not null default 'PENDING',
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_time_order check (end_time > start_time),
  -- One artist cannot have two overlapping, non-cancelled bookings.
  -- Enforced by Postgres itself, not application code — this is what
  -- makes double-booking impossible even under concurrent requests.
  exclude using gist (
    artist_id with =,
    tstzrange(start_time, end_time) with &&
  ) where (status <> 'CANCELLED')
);

create trigger bookings_set_updated_at
  before update on bookings
  for each row execute function set_updated_at();

create index bookings_business_date_idx on bookings (business_id, date);
create index bookings_artist_date_idx on bookings (artist_id, date);
create index bookings_user_idx on bookings (user_id);

-- ============================================================
-- working_hours
-- ============================================================
create table working_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  artist_id uuid not null references artists (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_working boolean not null default true,
  constraint working_hours_time_order check (end_time > start_time),
  unique (artist_id, day_of_week)
);

-- ============================================================
-- breaks
-- ============================================================
create table breaks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  artist_id uuid not null references artists (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  constraint breaks_time_order check (end_time > start_time)
);

create index breaks_artist_idx on breaks (artist_id, day_of_week);

-- ============================================================
-- time_off
-- ============================================================
create table time_off (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  artist_id uuid not null references artists (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text,
  constraint time_off_date_order check (end_date >= start_date)
);

create index time_off_artist_idx on time_off (artist_id, start_date, end_date);

-- ============================================================
-- business_settings
-- ============================================================
create table business_settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references businesses (id) on delete cascade,
  booking_interval int not null default 30 check (booking_interval > 0),
  min_booking_notice int not null default 120 check (min_booking_notice >= 0),
  max_booking_days int not null default 30 check (max_booking_days > 0),
  cancellation_hours int not null default 24 check (cancellation_hours >= 0)
);

-- ============================================================
-- booking_drafts — technical table, not in section 30 of the spec.
-- Needed because Next.js API routes are stateless: while the bot waits
-- for the client's name/phone in the middle of the booking flow, this
-- is where the in-progress selection (service/artist/date/time) lives.
-- ============================================================
create table booking_drafts (
  telegram_id bigint primary key,
  business_id uuid not null references businesses (id) on delete cascade,
  step text not null default 'service',
  service_id uuid references services (id),
  artist_id uuid references artists (id),
  date date,
  start_time timestamptz,
  end_time timestamptz,
  name text,
  phone text,
  comment text,
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes')
);

-- ============================================================
-- telegram_updates_log — technical table for webhook idempotency
-- (section 36/40/56 "duplicate update").
-- ============================================================
create table telegram_updates_log (
  update_id bigint primary key,
  processed_at timestamptz not null default now()
);
