# RLS & Authorization Matrix

Database-level authorization is the source of truth. The UI hides actions for clarity,
but every table, storage object and RPC re-checks permissions.

## Helper functions (SECURITY DEFINER, `search_path = public`)

| Function | Purpose |
| --- | --- |
| `is_trip_member(trip_id)` | Caller has any membership row in the trip |
| `trip_role_for(trip_id)` | Caller's role (`owner` / `editor` / `viewer` / null) |
| `can_edit_trip(trip_id)` | Caller is `owner` or `editor` |
| `is_trip_owner(trip_id)` | `trips.owner_id = auth.uid()` |
| `shares_trip_with(user_id)` | Caller and target share at least one trip |

## Table policies

Legend: `M` = member, `O` = owner, `E` = owner or editor, `I` = authenticated invitee (email match).

| Table | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `profiles` | own profile **or** shares a trip | trigger only | own profile | — (cascades from auth) |
| `trips` | M | `owner_id = auth.uid()` | E (owner_id change blocked by trigger) | O |
| `trip_members` | M | O, `role <> 'owner'` | O, `role <> 'owner'` | O; or self when not owner |
| `trip_invitations` | O **or** `lower(email) = jwt.email` | **none** (Edge Function/service role only) | **none** (RPC only) | O |
| `trip_items` | M | E + `created_by = auth.uid()` | E | E |
| `tags` | M | E | E | E |
| `trip_item_tags` | M (via item) | E (via item) | — | E (via item) |
| `trip_item_images` | M (via item) | E (via item) | — | E (via item) |

## Storage (`trip-images`, private bucket)

Object path convention: `<trip_id>/<item_id or "cover">/<uuid>.<ext>`.

| Operation | Policy |
| --- | --- |
| SELECT (signed URL creation) | first path segment is a trip the caller is a member of |
| INSERT | first path segment is a trip the caller can edit |
| UPDATE | first path segment is a trip the caller can edit |
| DELETE | first path segment is a trip the caller can edit |

Uploads are limited to 10 MB and `image/jpeg`, `image/png`, `image/webp`, `image/gif`.
The bucket is **not public**; the client requests 1-hour signed URLs.

## Privileged RPCs

| RPC | Caller check | Effect |
| --- | --- | --- |
| `accept_trip_invitation(token)` | auth email matches invitation email, pending, not expired | insert membership, mark invitation accepted |
| `accept_trip_invitation_by_id(id)` | same checks using invitation id | same |
| `reject_trip_invitation(token)` / `_by_id` | same checks | mark invitation rejected |
| `transfer_trip_ownership(trip_id, new_owner)` | caller is current owner; target is a member | swap roles atomically |
| `reorder_trip_items(trip_id, item_ids[])` | `can_edit_trip` | rewrite sort order |
| `list_my_invitations()` | filters `lower(email) = jwt.email` | expose trip name/inviter to invitee before membership |

## Edge Function

`invite-member` (JWT required):

1. Resolves the caller from the Authorization header.
2. Verifies `trips.owner_id = caller`.
3. Validates email/role; rejects inviting the owner, the caller, or an existing member.
4. Generates a 32-byte token and stores only `sha256(token)`.
5. Upserts a pending invitation (7-day expiry) with the **service role** — the key never reaches the browser.
6. Sends email via Resend when configured; otherwise returns the invite link to the owner.

## Trigger-level guards

- `handle_new_user` creates the profile; `handle_new_trip` creates owner membership + default tags.
- `protect_trip_owner` prevents removing/demoting the owner except during trip deletion or transfer.
- `guard_trip_owner_change` blocks `trips.owner_id` updates unless done by the transfer RPC.
- `set_trip_item_sort_order` appends new items.
- `validate_trip_item_tag` prevents cross-trip tag assignments.
- `set_updated_at` maintains timestamps.

## Explicit non-goals

- No `service_role` key in frontend code or Vite env variables.
- No client-trusted role checks: hiding buttons is UX, not security.
- No public image bucket.
- No invitation insertion directly from the browser.
