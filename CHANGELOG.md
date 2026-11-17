# Changelog

All notable changes to Wanderlist are documented here. Releases follow
[Semantic Versioning](https://semver.org/) and every release is tagged `vX.Y.Z`
in Git. The tag message is a short summary; this file is the detailed record.

## [Unreleased]

Nothing yet.

## [0.3.0] - 2026-11-17

### Added

- Dark mode with a persisted light/dark preference, a no-flash boot script, a
  theme toggle in the app and auth shells, and a matching Sonner toast theme.
- Clickable Google Maps links for places in both list and card views. Photo-less
  places open Maps from the thumbnail/card image, and cards show an
  "Open in Maps" badge plus a dedicated Maps action.
- Shareable trip invite links. Owners can create an invite without an email;
  anyone signed in who opens the link joins with the selected role. Invites
  still expire after 7 days.
- Wanderbot trip assistant: curated trip ideas, quick prompts, budget/vibe/day
  matching, and a "Plan" action that prefills the trip planner.
- `e2e/features.spec.ts` evidence suite with admin-created users, injected auth
  sessions, and full-page screenshots for dark mode, maps, share links,
  Wanderbot, and photo upload.
- `npm run release:verify` to run typecheck, E2E typecheck, unit tests, and the
  production build before tagging a release.

### Fixed

- Image uploads now validate MIME type/magic bytes and reject HEIC or empty
  files with clear messages. `file.type` is normalized when browsers leave it
  blank.
- Place photos are capped at 12 per place, sort orders continue from the current
  maximum, and partially failed uploads clean up both storage objects and
  database rows.
- Trip cover changes upload the replacement first and delete the previous cover
  only after the database update succeeds.
- Failed trip/place deletions no longer leave orphaned uploaded images.

### Changed

- Invite dialogs, pending invitations, and trip settings distinguish email
  invites from link invites and explain link expiry and role assignment.
- Local Supabase development ports are now `55321`–`55324` because the default
  `54321`–`54324` range is excluded by Windows on this machine. Update
  `supabase/config.toml` and `.env.local` together.
- E2E helpers read the Mailpit URL and API URL from `supabase status` instead of
  hard-coding the default ports.

### Backend / deployment

- Migration `20260101000300_share_links.sql`: `trip_invitations.email` is now
  nullable and the accept/reject RPCs skip the email check for link invites.
- `invite-member` Edge Function accepts a blank email, reuses pending link
  invites, and only calls Resend when an email and the email secrets exist.
- Frontend release `v0.3.0` depends on the migration above. The migration is
  forward-only; see [docs/RELEASES.md](docs/RELEASES.md) for rollback rules.

### Verification

- `npm run typecheck` — pass
- `npm run typecheck:e2e` — pass
- `npm run test:run` — 7 files, 36 tests pass
- `npm run build` — pass
- `npx playwright test e2e/features.spec.ts` — 5/5 pass

## [0.2.0] - 2026-11-16

### Changed

- Replaced email/password and passwordless auth with social-only Google/GitHub
  sign-in.
- Removed the email login, register, forgot-password, and reset-password pages,
  and the related auth schemas/tests.
- `/login` and `/auth/callback` are now the only auth routes.

## [0.1.1] - 2026-11-16

### Fixed

- Added the `vercel.json` rewrite to `/index.html` so client-side routes survive
  a refresh or direct visit on Vercel.

## [0.1.0] - 2026-11-16

### Added

- Initial Wanderlist MVP: trips, places, tags, photo uploads, members and
  invitations, Supabase RLS, passwordless email auth, and the first Playwright
  E2E baseline.
