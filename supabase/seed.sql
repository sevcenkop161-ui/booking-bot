-- Demo data (PROJECT_SPEC.md section 66). Fictional business and people,
-- used for local development and portfolio screenshots — not real data.

insert into businesses (id, name, slug, description, timezone, phone, telegram, address)
values (
  '00000000-0000-0000-0000-000000000001',
  'Ink House',
  'ink-house',
  'Demo tattoo & piercing studio for the Booking Bot portfolio project.',
  'Europe/Moscow',
  '+7 900 000 00 00',
  '@inkhouse_demo',
  'Moscow, demo address'
);

insert into business_settings (business_id, booking_interval, min_booking_notice, max_booking_days, cancellation_hours)
values ('00000000-0000-0000-0000-000000000001', 30, 120, 30, 24);

-- ============================================================
-- Artists
-- ============================================================
insert into artists (id, business_id, name, slug, bio, specialization, active) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000001', 'Alex', 'alex', 'Bold linework and solid black fills.', 'Blackwork', true),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000001', 'Mia', 'mia', 'Delicate single-needle fine line work.', 'Fine Line', true),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000001', 'Noah', 'noah', 'Photorealistic black & grey portraits.', 'Realism', true);

-- ============================================================
-- Services
-- ============================================================
insert into services (id, business_id, name, description, price, duration_minutes, active) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000001', 'Small Tattoo', 'Small-sized tattoo, simple design.', 3000, 60, true),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000001', 'Custom Tattoo', 'Custom-sized tattoo, from sketch to finished piece.', 8000, 120, true),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-000000000001', 'Piercing', 'Standard ear or body piercing.', 1500, 30, true),
  ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-000000000001', 'Consultation', 'Free chat about design, placement and pricing.', 0, 30, true);

-- ============================================================
-- Artist <-> Service (many-to-many)
-- Alex and Mia cover the core tattoo services; Noah focuses on
-- custom/realism work; Mia also does piercing.
-- ============================================================
insert into artist_services (artist_id, service_id) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2'),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b4'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000b2'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000b3'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000b4'),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000b2'),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000b4');

-- ============================================================
-- Working hours — Mon-Fri 10:00-19:00, Sat/Sun closed, for all
-- three artists. day_of_week follows Postgres EXTRACT(DOW ...):
-- 0 = Sunday ... 6 = Saturday.
-- ============================================================
insert into working_hours (business_id, artist_id, day_of_week, start_time, end_time, is_working)
select
  '00000000-0000-0000-0000-000000000001',
  artist_id,
  day_of_week,
  '10:00',
  '19:00',
  (day_of_week between 1 and 5)
from (values
  ('00000000-0000-0000-0000-0000000000a1'::uuid),
  ('00000000-0000-0000-0000-0000000000a2'::uuid),
  ('00000000-0000-0000-0000-0000000000a3'::uuid)
) as a(artist_id)
cross join (values (0), (1), (2), (3), (4), (5), (6)) as d(day_of_week);

-- ============================================================
-- Breaks — 14:00-15:00 lunch break on working days for all artists.
-- ============================================================
insert into breaks (business_id, artist_id, day_of_week, start_time, end_time)
select
  '00000000-0000-0000-0000-000000000001',
  artist_id,
  day_of_week,
  '14:00',
  '15:00'
from (values
  ('00000000-0000-0000-0000-0000000000a1'::uuid),
  ('00000000-0000-0000-0000-0000000000a2'::uuid),
  ('00000000-0000-0000-0000-0000000000a3'::uuid)
) as a(artist_id)
cross join (values (1), (2), (3), (4), (5)) as d(day_of_week);

-- ============================================================
-- Time off — one example so the "artist on vacation" edge case
-- (section 56) has real data to test against.
-- ============================================================
insert into time_off (business_id, artist_id, start_date, end_date, reason)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-0000000000a3',
  current_date + interval '10 days',
  current_date + interval '16 days',
  'Vacation'
);
