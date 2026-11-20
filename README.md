# Wanderlist — Collaborative Trip Planner

A warm, responsive trip planner built for small groups. Collect places, tag them, mark plans as done, upload photos, and keep everyone in sync in real time.

Built with **React 19 + TypeScript + Vite + Tailwind CSS + Supabase**.

## Features

- **Social-only auth** with Google and GitHub sign-in.
- **English and Vietnamese** UI, persisted per profile and browser, with localized dates, validation, and errors.
- **Trips** with cover photos, destination, date range, description and progress.
- **Role-based collaboration**: `owner`, `editor`, `viewer`, enforced by Postgres RLS.
- **Share links** with `editor`/`viewer` access, rotation, and revocation.
- **Places** with notes, tags, Google Maps links, completion status and multi-photo galleries.
- **Drag-and-drop reordering** (list or card view) with optimistic updates.
- **Trip tags** with accessible pastel colours, inline create/edit/delete, and dark-mode contrast.
- **Realtime updates and trip chat** across members via Supabase Realtime.
- **Trip chat collaboration** with member messaging, typing signals, read receipts, mentions, 15-minute edits, and per-trip notification settings.
- **Private trip feed** with text, up to ten photos, linked places, reactions, comments, one-level replies, and owner pinning/moderation.
- **In-app and optional browser notifications** for chat messages, mentions, comments, and reactions.
- **Basic and Gemini assistant modes**, with Gemini backed by the `trip-assistant` Edge Function.
- **Profile avatars** in private storage, shown across trips, members, and chat.
- **Avatar actions** from the profile photo: view, crop/change, and remove.
- **Private image storage** at `<trip_id>/<item_id|cover>/<uuid>.<ext>` with signed URLs and client-side compression.
- Owner controls: member roles, remove members, transfer ownership, share links, delete trip.

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
supabase migration up       # applies pending migrations without clearing local data
```

After `supabase start`, run `supabase status` to get the local `API URL` and `anon key`, then put them in `.env.local`.

If you change `supabase/config.toml` or email templates, restart the stack so Auth picks up the changes:

```bash
supabase stop
supabase start
```

Recent Supabase CLI versions serve the Edge Functions with `supabase start`. If you need hot reload while editing a function, serve it separately:

```bash
supabase functions serve trip-assistant --env-file supabase/functions/.env
```

The Gemini assistant mode needs `GEMINI_API_KEY`; Basic mode works without any key. Mailpit is available at `http://127.0.0.1:55324` for local mail. The `invite-member` function sends invite mail when `RESEND_API_KEY` and `INVITE_FROM_EMAIL` are configured; otherwise it returns a seven-day invite link.

### 4. End-to-end tests

Playwright runs against the local Supabase stack only. It refuses to start if `.env.local` points at a remote project, and it does not reset your local database.

```bash
npx playwright install chromium   # first run only
npm run test:e2e
npm run test:e2e:ui               # interactive mode
npx playwright show-report        # inspect the last HTML report
```

The suite starts Vite automatically, creates unique `e2e.*@example.com` users with injected sessions, and cleans them up after the run. Keep the Supabase stack running and restart it after changing `config.toml` or Edge Functions.

The focused collaboration evidence suite is `npm run test:e2e -- e2e/backlog.spec.ts`. It saves screenshots under `evidence/backlog/`. The full suite is the release gate and includes the current social-only auth and trip tabs.

## Feature workflow and repository knowledge

Use [docs/FEATURE_WORKFLOW.md](docs/FEATURE_WORKFLOW.md) for the requirement-to-evidence pipeline and [docs/KNOWLEDGE.md](docs/KNOWLEDGE.md) for the versioned knowledge index intended for MCP retrieval. Architecture, RLS, and README changes belong in the same change as their feature.

The November 2026 collaboration verification, including all 33 E2E cases and screenshots, is in [evidence/backlog/VERIFICATION.md](evidence/backlog/VERIFICATION.md).

Run `npm run memory:mcp` from this repo to expose a read-only, cached MCP index of documentation, source, migrations, and tests. The server excludes `.env*`, screenshots, dependencies, and build output.

### 5. Production deployment

```bash
supabase link --project-ref <your-project-ref>
supabase db push --remote
supabase secrets set APP_URL=https://your-domain.example
# Optional Gemini assistant mode:
supabase secrets set GEMINI_API_KEY=...
supabase functions deploy trip-assistant
```

Set the hosted **Authentication → URL Configuration** site URL to your deployed app and allow `https://your-domain.example/auth/callback` in the Google/GitHub provider settings. Optional model override: `supabase secrets set GEMINI_MODEL=gemini-3.8-flash`.

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
| `npm run test:e2e` | Playwright E2E against local Supabase |
| `npm run test:e2e:ui` | Playwright interactive UI mode |
| `npm run release:verify` | Typechecks, unit tests, and production build |

## Permissions at a glance

| Action | Owner | Editor | Viewer |
| --- | :---: | :---: | :---: |
| View trip, places, tags, members | ✅ | ✅ | ✅ |
| Edit trip details / cover | ✅ | ✅ | — |
| Add, edit, delete, reorder places | ✅ | ✅ | — |
| Upload/delete photos | ✅ | ✅ | — |
| Create/edit/delete tags | ✅ | ✅ | — |
| Manage share links, member roles, remove members | ✅ | — | — |
| Transfer ownership | ✅ | — | — |
| Delete trip | ✅ | — | — |
| Leave trip | — | ✅ | ✅ |

SQL policies in `supabase/migrations/` are the source of truth. UI gating is only UX. See `docs/RLS_MATRIX.md` for the full matrix.

## Project structure

```
src/
  app/            providers, router, 404
  components/     ui primitives + shared shell components
  features/
    auth/         session context, guards, social auth, profile
    trips/        trip CRUD, dashboard, detail, settings
    trip-members/ members, roles, ownership transfer
    sharing/      share-link creation, rotation, public join
    trip-items/   places, photos, tags, drag-and-drop
    tags/         per-trip tags and accessible colours
    images/       upload, signed URLs, lightbox
    avatars/      private profile avatars
    chat/         realtime trip chat
    assistant/    Basic/Gemini trip assistant
  i18n/           EN/VI dictionaries, provider, date locale
  hooks/          realtime subscription
  lib/            Supabase client/types, query keys
  services/       Google Maps URL resolution (Phase 2 seam)
  utils/          format, validation, image, tag helpers
supabase/
  migrations/     schema, RLS, storage, realtime, locale
  functions/      trip-assistant Edge Function
  seed.sql
e2e/              Playwright specs + local test helpers
evidence/         Real screenshots produced by E2E runs
docs/
  ARCHITECTURE.md, RLS_MATRIX.md, RELEASES.md
```

## Notes & limitations

- Image uploads are compressed to WebP when over ~300 KB (GIFs and small files are kept as-is).
- Signed URLs last one hour and are cached for 50 minutes.
- Invitation tokens are stored only as SHA-256 hashes; the raw token exists only in the link.
- Ownership must be transferred before an owner can leave a trip.
- Pages are route-split; the shared vendor/main chunk still exceeds Vite's default 500 kB warning threshold.
