# Booking Bot

Telegram booking automation system for small businesses (tattoo studios, barbershops, beauty salons, and similar service providers) — a Telegram bot for clients, and a web dashboard for the business.

> **Demo / Concept Project.** All business data (studio name, artists, services, client interactions) is fictional, created for portfolio purposes. See [Demo Data](#demo-data).

> 📄 See [PORTFOLIO_CASE.md](PORTFOLIO_CASE.md) for the portfolio-style case study version of this document.

---

## Overview

Small service businesses usually take bookings manually — over Telegram, Instagram DMs, or phone calls. That doesn't scale: slots get double-booked, messages get lost, and the owner spends time on scheduling instead of the actual work.

Booking Bot automates the whole loop:

```
Client                          Business
  │                                 │
  ├─ Telegram: pick service,        │
  │  artist, date, time             │
  ├─ Enters contact details         │
  ├─ Confirms                       │
  │                                 │
  ├──────── booking created ───────►│
  │                                 ├─ Gets notified in Telegram
  │◄──── confirmed / rejected ──────┤   with Confirm/Reject buttons
  │                                 │
  │                          Manages everything (services, artists,
  │                          schedule, bookings) from a web dashboard
```

The client never leaves Telegram. The business never has to manually track who's booked where — the dashboard and the bot read and write the same database.

---

## Features

**Telegram bot (client-facing)**
- `/start`, main menu, browsing services and artists
- Full booking flow: service → artist → date → time → contact info → confirmation
- Real-time availability (respects working hours, breaks, time off, and existing bookings)
- "My bookings" with cancellation (respecting a configurable cancellation deadline)
- Two-way notifications: admin gets notified of new bookings and cancellations; client gets notified when their booking is confirmed or rejected

**Admin dashboard (business-facing)**
- Email/password login (Supabase Auth), authorization enforced server-side and via RLS — not just hidden UI
- **Overview** — today's stats, upcoming bookings, popular services, artist load
- **Bookings** — filterable, paginated table with one-click status changes (Confirm / Cancel / Complete / No-show)
- **Calendar** — day / week / month views
- **Services** & **Artists** — full CRUD, including the artist↔service many-to-many relationship
- **Schedule** — per-artist working hours, breaks, and time off

**Under the hood**
- Double-booking is structurally impossible, enforced by the database itself (see [Double Booking Prevention](#double-booking-prevention))
- Webhook idempotency — Telegram's retried updates never get processed twice
- Rate limiting on the webhook

---

## Architecture

```
Telegram User
     │
     ▼
Telegram Bot API
     │  (webhook, secret-token verified)
     ▼
Next.js API Route  ──────────────┐
  (grammY bot logic)             │
     │                           │
     ▼                           ▼
PostgreSQL (Supabase) ◄──── Next.js App Router
     ▲                     (Server Components + Server Actions)
     │                           ▲
     │                           │
     └──────── Row Level Security ────────┐
                                           │
                                    Browser (admin)
```

Two things worth calling out, because they differ from a "typical" REST setup:

1. **One Next.js app, not two services.** The Telegram webhook is just another API route in the same Next.js project as the dashboard. One deployment, one set of environment variables, one Supabase project.
2. **The dashboard has no separate REST API.** Server Components query Supabase directly (session-bound, so RLS applies), and mutations go through Server Actions rather than hand-rolled `POST /api/admin/*` endpoints. The only "real" API route in the project is the Telegram webhook, which has no other way to receive updates. This is a deliberate simplification over the REST API sketched early in planning — it removes an entire layer of endpoints that would have just re-implemented what Server Actions + RLS already do.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Turbopack) | One codebase for the webhook, the dashboard, and Server Actions |
| Language | TypeScript | Shared types between the bot, the dashboard, and the availability engine |
| Styling | Tailwind CSS | Fast to build a consistent design system with |
| Database & Auth | [Supabase](https://supabase.com) (PostgreSQL + Supabase Auth) | Row Level Security as a real authorization boundary, not just an app-layer check |
| Telegram | [grammY](https://grammy.dev) | TypeScript-first, built with serverless/webhook deployments in mind |
| Validation | [Zod](https://zod.dev) | Same validation logic reused across bot input, forms, and the webhook body |
| Dates & Timezones | [Luxon](https://moment.github.io/luxon/) | Business-timezone-aware date math without hand-rolled UTC conversions |
| Testing | [Vitest](https://vitest.dev) | Fast unit tests for the availability engine, calendar math, and validation |

---

## Telegram Flow

```
/start
  │
  ▼
Main Menu ── 💇 Services ── 👤 Artists ── ℹ️ About ── ❓ Help
  │
  ▼
📅 Book
  │
  ├─ Choose service        (from the database, active only)
  ├─ Choose artist         (only artists linked to that service)
  ├─ Choose date           (only dates with real availability)
  ├─ Choose time           (computed by the availability engine)
  ├─ Enter name             ┐
  ├─ Enter phone            ├─ Zod-validated
  ├─ Enter comment          ┘
  ├─ Confirm / Change / Cancel
  │
  ▼
Booking created (status: PENDING)
  │
  ├──► Admin notified, with Confirm/Reject buttons
  └──► Client gets an acknowledgement

Admin taps Confirm/Reject
  │
  ▼
Client notified of the outcome
```

Each step's message is edited in place (not resent) to keep the chat from filling up with clutter, and every selection is re-validated server-side before moving to the next step — the bot never trusts that a service/artist/slot chosen a few screens ago is still valid.

### Why a `booking_drafts` table exists

Next.js API routes are stateless between requests — there's no in-memory place to remember "this user is on step 3 of booking, with service X and artist Y already chosen." `booking_drafts` (keyed by `telegram_id`, with a 15-minute TTL) is that state, updated at every step. It's the mechanism that makes a multi-step conversation possible on top of a serverless webhook.

---

## Database Schema

PostgreSQL via Supabase. All entities carry a `business_id`, even though the current deployment only serves one business — that keeps the door open for multi-tenant support later without a schema rewrite.

```
businesses
├── business_settings        (booking_interval, min_notice, max_days, cancellation_hours)
├── artists ──── artist_services ──── services   (many-to-many)
├── users                              (Telegram clients — not Supabase Auth users)
│     └── bookings ── artist, service
├── admins                              (linked to Supabase Auth users)
├── working_hours   (per artist, per day of week)
├── breaks          (per artist, per day of week)
└── time_off        (per artist, date range)
```

Two tables exist purely for infrastructure reasons, not because the spec asked for them directly:

- **`booking_drafts`** — in-progress bookings, see above.
- **`telegram_updates_log`** — every processed `update_id`, so a Telegram-retried webhook delivery is recognized and dropped instead of reprocessed.

Migrations live in [`supabase/migrations`](supabase/migrations), demo seed data in [`supabase/seed.sql`](supabase/seed.sql).

### Double Booking Prevention

This is the part of the spec that mattered most to get right. The guarantee isn't "the app checks before inserting" — it's enforced by PostgreSQL itself:

```sql
exclude using gist (
  artist_id with =,
  tstzrange(start_time, end_time) with &&
) where (status <> 'CANCELLED')
```

An exclusion constraint means Postgres physically rejects a second `INSERT` that overlaps an existing (non-cancelled) booking for the same artist — even if two requests race each other at the exact same millisecond. The application still re-checks availability before inserting (to give a friendly "this time was just taken" message instead of a raw database error), but that check is a UX nicety, not the actual safety net.

### Row Level Security

Every table has RLS enabled. The Telegram bot always talks to Postgres with the service-role key (it's a trusted backend, not a public client, so authorization there is the bot's own job). RLS is the actual authorization boundary for the **dashboard**: an admin's session can only see and modify their own business's data, gated by a `is_business_admin()` helper function checked against the `admins` table. Nothing gets anonymous/public access — every policy requires an authenticated admin.

---

## Security

- Secrets live in environment variables only; `.env.local` is git-ignored (`.env.example` documents the shape without values)
- `SUPABASE_SERVICE_ROLE_KEY` is never imported outside `lib/supabase/service-client.ts`, and never reaches the browser
- The Telegram webhook verifies `X-Telegram-Bot-Api-Secret-Token` against `TELEGRAM_WEBHOOK_SECRET` before doing anything else, and its JSON body is Zod-validated (not just type-annotated)
- Webhook updates are idempotent (`telegram_updates_log`) and rate-limited per Telegram user
- Dashboard authorization is checked in two independent places: an explicit `requireAdmin()` call in every Server Action, and RLS policies at the database level — either one failing blocks the request
- Telegram IDs are always taken from the verified webhook payload, never typed in by the user
- Only the personal data actually needed for a booking is stored: name, phone, Telegram username/ID, and an optional comment

---

## Installation

Requirements: Node.js 20+, pnpm, Docker (for local Supabase), a Telegram bot token from [@BotFather](https://t.me/BotFather).

```bash
pnpm install
cp .env.example .env.local     # fill in the values (see below)
pnpm exec supabase start       # local Postgres + Auth + Studio via Docker
pnpm test                      # sanity check
pnpm dev
```

Create the first admin account (also works against a real deployed Supabase project, not just local):

```bash
node --env-file=.env.local scripts/create-admin.mjs owner@example.com "a-real-password"
```

---

## Environment Variables

```bash
# Supabase — from `supabase start` output locally, or your project settings in production
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server-only — never expose this

# Telegram
TELEGRAM_BOT_TOKEN=             # from @BotFather
TELEGRAM_WEBHOOK_SECRET=        # any random string; verified on every webhook call
ADMIN_TELEGRAM_ID=              # numeric Telegram ID that receives booking notifications

# Business
BUSINESS_TIMEZONE=Europe/Moscow
```

No secret in this list should ever be committed — `.gitignore` already excludes every `.env*` file except `.env.example`.

---

## Local Development

```bash
pnpm dev            # Next.js dev server
pnpm test           # Vitest — availability engine, calendar math, validation
pnpm run lint        # ESLint
pnpm run build       # production build + typecheck
```

To test the Telegram side locally, the webhook needs a public HTTPS URL. A quick tunnel (e.g. `cloudflared tunnel --url http://localhost:3000`) plus a `setWebhook` call pointing at it is enough — see the Deployment section for the permanent version of this.

---

## Deployment

Intended target: **Vercel** (Next.js app) + a **Supabase Cloud** project (Postgres/Auth), with the Telegram webhook pointed at the deployed URL:

```
Telegram → Telegram Bot API → Vercel (Next.js) → Supabase (Postgres)
Browser  →                    Vercel (Next.js) → Supabase (Postgres)
```

Rough steps once a Supabase Cloud project exists:

1. `pnpm exec supabase link --project-ref <ref>` then `pnpm exec supabase db push` to apply migrations + seed
2. Deploy to Vercel with the environment variables above set to the Cloud project's values
3. Register the webhook: `POST https://api.telegram.org/bot<TOKEN>/setWebhook` with `url` pointing at `https://<your-domain>/api/telegram/webhook` and the same `secret_token` as `TELEGRAM_WEBHOOK_SECRET`
4. Run `scripts/create-admin.mjs` against the production environment to create the real admin account

This project hasn't been pushed to a production deployment yet — everything above has been built and verified against a local Supabase instance.

---

## Demo Data

The seeded business, "Ink House," and its artists (Alex, Mia, Noah) and services are entirely fictional, created for this portfolio project. No real client data is used anywhere.

---

## Screenshots

_To be added: Telegram booking flow, admin dashboard (Overview, Bookings, Calendar, Services, Artists, Schedule), mobile view._

---

## Future Improvements

Deliberately out of scope for this version, in roughly the order they'd make sense to add:

- Online payments / deposits
- Automatic reminders (24h / 2h before a booking) — the schema and booking data already support this, it just needs a scheduler
- Multi-business (multi-tenant) support — every table already carries `business_id`, so this is additive, not a rewrite
- Multiple admin roles beyond OWNER/ADMIN (STAFF was designed for but not exposed in the UI)
- Client booking history / loyalty features
- Google Calendar sync
- Multilingual bot
