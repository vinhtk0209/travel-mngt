# Wanderlist — Collaborative Trip Planner

A warm, responsive trip planner built for small groups. Collect places, tag them, mark plans as done, upload photos, and keep everyone in sync in real time.

Built with **React 19 + TypeScript + Vite + Tailwind CSS + Supabase**.

## Features

- **Email/password auth** with password reset, profile editing, and passwordless email sign-in (magic link + 6-digit code for existing accounts).
- **Trips** with cover photos, destination, date range, description and progress.
- **Role-based collaboration**: `owner`, `editor`, `viewer`, enforced by Postgres RLS.
- **Email invitations** via an Edge Function, with a copyable 7-day invite link fallback.
- **Places** with notes, tags, Google Maps links, completion status and multi-photo galleries.
- **Drag-and-drop reordering** (list or card view) with optimistic updates.
- **Trip tags** with pastel presets, inline create/edit/delete.
- **Realtime updates** across members via Supabase Realtime.
- **Private image storage** at `<trip_id>/<item_id|cover>/<uuid>.<ext>` with signed URLs and client-side compression.
- Owner controls: member roles, remove members, transfer ownership, pending invitations, delete trip.

Google Places Autocomplete is intentionally **Phase 2**. Map links are stored as plain Google Maps URLs (or built from the address) through `src/services/google-maps.ts`, so the upgrade stays isolated.

## Quick start

### 1. Prerequisites

- Node.js 20+ and npm
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
- Docker Desktop (for local Supabase)

### 2. Frontend

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill `.env.local` with your project values. Only the **anon** key belongs in the browser:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Without these variables the app renders a setup screen instead of crashing.

### 3. Local Supabase

```bash
supabase start
supabase db reset          # applies migrations + seed
```

After `supabase start`, run `supabase status` to get the local `API URL` and `anon key`, then put them in `.env.local`.

If you change `supabase/config.toml` or email templates, restart the stack so Auth picks up the changes:

```bash
supabase stop
supabase start
```

Recent Supabase CLI versions serve the Edge Functions with `supabase start`. If you need hot reload while editing a function, serve it separately:

```bash
supabase functions serve invite-member
```

Local auth emails (password reset and passwordless sign-in) are captured by Mailpit at `http://127.0.0.1:54324`. Invitation delivery is optional: without Resend credentials the invite function still creates the invitation and returns a shareable link.

### 4. End-to-end tests

Playwright runs against the local Supabase stack only. It refuses to start if `.env.local` points at a remote project, and it does not reset your local database.

```bash
npx playwright install chromium   # first run only
npm run test:e2e
npm run test:e2e:ui               # interactive mode
npx playwright show-report        # inspect the last HTML report
```

The suite starts Vite automatically, creates unique `e2e.*@example.com` users, and cleans them up after the run. Magic-link tests read the email from Mailpit. Keep the Supabase stack running and restart it after changing `config.toml` or email templates.

### 5. Production deployment

```bash
supabase link --project-ref <your-project-ref>
supabase db push
supabase secrets set APP_URL=https://your-domain.example
# Optional email delivery:
supabase secrets set RESEND_API_KEY=re_... INVITE_FROM_EMAIL="Wanderlist <trips@your-domain.example>"
supabase functions deploy invite-member
```

Set the hosted **Authentication → URL Configuration** site URL to your deployed app and allow your production origin plus `/reset-password` and `/auth/callback` redirect URLs. Keep the passwordless magic-link email template in sync with `supabase/templates/magic_link.html`.

Then build the frontend:

```bash
npm run build
```

Deploy `dist/` to any static host (Vercel, Netlify, Cloudflare Pages). The router uses browser history, so configure an SPA fallback to `index.html`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite on port 5173 |
| `npm run build` | Typecheck and build production assets |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run typecheck:e2e` | Typecheck Playwright config/specs |
| `npm run test` | Vitest watch mode |
| `npm run test:run` | One-off test run |
| `npm run test:e2e` | Playwright E2E against local Supabase + Mailpit |
| `npm run test:e2e:ui` | Playwright interactive UI mode |

## Permissions at a glance

| Action | Owner | Editor | Viewer |
| --- | :---: | :---: | :---: |
| View trip, places, tags, members | ✅ | ✅ | ✅ |
| Edit trip details / cover | ✅ | ✅ | — |
| Add, edit, delete, reorder places | ✅ | ✅ | — |
| Upload/delete photos | ✅ | ✅ | — |
| Create/edit/delete tags | ✅ | ✅ | — |
| Invite members, manage roles, cancel invites | ✅ | — | — |
| Transfer ownership | ✅ | — | — |
| Delete trip | ✅ | — | — |
| Leave trip | — | ✅ | ✅ |

SQL policies in `supabase/migrations/20260101000100_rls.sql` are the source of truth. UI gating is only UX. See `docs/RLS_MATRIX.md` for the full matrix.

## Project structure

```
src/
  app/            providers, router, 404
  components/     ui primitives + shared shell components
  features/
    auth/         session context, guards, auth pages
    trips/        trip CRUD, dashboard, detail, settings
    trip-members/ members, roles, ownership transfer
    trip-invitations/ Edge Function client + acceptance
    trip-items/   places, photos, tags, drag-and-drop
    tags/         per-trip tags
    images/       upload, signed URLs, lightbox
  hooks/          realtime subscription
  lib/            Supabase client/types, query keys
  services/       Google Maps URL resolution (Phase 2 seam)
  utils/          format, validation, image, tag helpers
supabase/
  migrations/     schema, RLS, storage + realtime
  functions/      invite-member Edge Function
  templates/      magic-link sign-in email
  seed.sql
e2e/              Playwright specs + local test helpers
docs/
  ARCHITECTURE.md, RLS_MATRIX.md, IMPLEMENTATION_PLAN.md
```

## Notes & limitations

- Image uploads are compressed to WebP when over ~300 KB (GIFs and small files are kept as-is).
- Signed URLs last one hour and are cached for 50 minutes.
- Invitation tokens are stored only as SHA-256 hashes; the raw token exists only in the link.
- Ownership must be transferred before an owner can leave a trip.
- Pages are route-split; the shared vendor/main chunk still exceeds Vite's default 500 kB warning threshold.
