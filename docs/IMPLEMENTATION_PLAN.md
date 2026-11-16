# Implementation Plan

## Phase 0 — Foundations (done first)

1. Inspect the empty repository; scaffold Vite + React + TypeScript.
2. Configure Tailwind design tokens, fonts, aliases, Vitest.
3. Write architecture, ERD, RLS matrix and this plan.

## Phase 1 — Database & security

1. `supabase/migrations/20260101000000_schema.sql`
   - enums, tables, FKs, checks, indexes, updated_at triggers
   - profile/trip bootstrap triggers, owner guards, sort order, tag consistency
   - helper functions + invitation/ownership/reorder RPCs
2. `supabase/migrations/20260101000100_rls.sql`
   - enable RLS, grants, policies on every public table
3. `supabase/migrations/20260101000200_storage_realtime.sql`
   - private `trip-images` bucket, storage policies, realtime publication
4. Edge Function `invite-member` + Resend delivery (optional) + CORS.
5. Verify with `supabase db reset` and manual two-account RLS checks.

## Phase 2 — App foundation

1. Typed Supabase client, env validation, query keys.
2. Design system: Button, Input, Select, Textarea, Modal, Avatar, Badge, TagPill,
   Progress, Empty/Error/Skeleton, Toast.
3. Providers (QueryClient, Auth, Toaster), router, AppShell/AuthShell, protected routes.

## Phase 3 — Authentication

Sign in, sign up, sign out, forgot/reset password, profile (display name), loading and errors.

## Phase 4 — Trips

Dashboard (owned vs shared, progress, covers), create/edit dialog with cover upload,
trip detail header with members/progress, delete with confirmation, trip settings shell.

## Phase 5 — Collaboration

Member list with roles, invite dialog (Edge Function), pending invitations, accept/reject
banner/email page, role changes, removal, ownership transfer, realtime invalidation.

## Phase 6 — Places, tags, images, maps

Places CRUD modal, search/tag/status filters, list/card views, completion toggle,
drag-and-drop reorder (optimistic + RPC), private image upload with compression and lightbox,
tag manager with colours + default seed tags, Google Maps URL service + auto-generation.

## Phase 7 — Polish & verification

Loading/empty/error states, mobile layouts, focus/keyboard basics, toasts,
documentation, env example, unit tests, `tsc` and production build.

## Deliberately deferred

- Google Places Autocomplete (Phase 2 maps): the service layer exposes the seam; no API key required yet.
- Email templates beyond a clean transactional HTML invite.
- Avatar file uploads (initials avatars now; `avatar_url` reserved).
- Offline support, activity feed, comments, expenses.

## Manual acceptance checklist

- [ ] Register → confirm → sign in → sign out
- [ ] Forgot/reset password
- [ ] Create trip with cover, edit, delete
- [ ] Invite editor and viewer via email; accept from dashboard and link
- [ ] Viewer cannot edit (UI hidden + RLS error if forced)
- [ ] Editor can CRUD places/tags/images but not members
- [ ] Owner transfers ownership, removes members
- [ ] Places: create, edit, delete, complete, reorder, filter, search
- [ ] Images upload, preview, delete; signed URLs expire safely
- [ ] Google Maps button opens correct query/URL
- [ ] Two browsers see changes in real time
- [ ] Mobile and desktop layouts
