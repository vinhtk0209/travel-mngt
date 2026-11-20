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
| `trip_invitations` (legacy) | O **or** `lower(email) = jwt.email` | **none** | **none** (RPC only) | O |
| `trip_items` | M | E + `created_by = auth.uid()` | E | E |
| `tags` | M | E | E | E |
| `trip_item_tags` | M (via item) | E (via item) | — | E (via item) |
| `trip_item_images` | M (via item) | E (via item) | — | E (via item) |
| `trip_messages` | M | M (`sender_id = auth.uid()`) | author within 15 minutes | author within 15 minutes (upload cleanup) |
| `trip_message_attachments` | M (via message) | M (message sender) | — | — (message cascade) |
| `trip_message_reactions` | M (via message) | M | M (own reaction) | M (own reaction) |

## Collaboration additions (November 2026)

| Table / channel | Read | Write |
| --- | --- | --- |
| `trip_messages` | trip members | any trip member inserts; author edits content within 15 minutes |
| `trip_chat_reads` | trip members | user updates only their own read position and notification setting through RPCs |
| `trip_message_mentions` | trip members | message author mentions current trip members within 15 minutes; edit RPC replaces recipients atomically |
| `trip_posts` | trip members | any member posts; author edits/deletes; owner moderates and pins |
| `trip_post_images` | trip members | post author adds images; author/owner removes |
| `trip_post_reactions` | trip members | member changes their own emoji; trigger prevents moving a reaction to another post |
| `trip_post_comments` | trip members | member comments; author edits; author/owner deletes |
| `trip_notifications` | recipient and current trip member | database triggers create; recipient marks read |
| `trip-typing-<trip_id>` private Broadcast | trip members | trip members send ephemeral typing signals |

Private `trip-images` paths in `chat/` and `posts/` allow member uploads and deletion of their own objects. Existing editor rights continue to cover covers, places, and chat wallpaper. The collaboration rows supersede the older chat entries in the table above.

## Storage (`trip-images`, private bucket)

Object path convention: `<trip_id>/<item_id, "cover", "chat" or "chat-background">/<uuid>.<ext>`.

Feed images also use `<trip_id>/posts/<uuid>.<ext>`. Members can insert images under `chat/` and `posts/`; the object owner can delete their own uploads there. Other paths retain editor-only insertion and deletion.

| Operation | Policy |
| --- | --- |
| SELECT (signed URL creation) | first path segment is a trip the caller is a member of |
| INSERT | first path segment is a trip the caller can edit |
| UPDATE | first path segment is a trip the caller can edit |
| DELETE | first path segment is a trip the caller can edit |

Uploads are limited to 10 MB and `image/jpeg`, `image/png`, `image/webp`, `image/gif`.
The bucket is **not public**; the client requests 1-hour signed URLs.

## Storage (`avatars`, private bucket)

Object path convention: `<user_id>/<uuid>.<ext>`.

| Operation | Policy |
| --- | --- |
| SELECT (signed URL creation) | own avatar or a user who shares a trip with the caller |
| INSERT / UPDATE / DELETE | own folder only (`<user_id>`) |

The bucket is **not public**; avatar URLs are signed and cached by React Query.

## Privileged RPCs

| RPC | Caller check | Effect |
| --- | --- | --- |
| `get_or_create_trip_share(trip_id, role)` | caller is owner | return/create the link token and role |
| `set_trip_share_role(trip_id, role)` | caller is owner | update the role granted by the link |
| `regenerate_trip_share_token(trip_id)` | caller is owner | rotate the token, revoking old links |
| `disable_trip_share(trip_id)` | caller is owner | clear the token |
| `resolve_trip_share(token)` | any signed-in caller | preview trip name/destination without membership |
| `join_trip_by_share(token)` | any signed-in caller, valid token | insert one membership with `share_role` |
| `transfer_trip_ownership(trip_id, new_owner)` | caller is current owner; target is a member | swap roles atomically |
| `reorder_trip_items(trip_id, item_ids[])` | `can_edit_trip` | rewrite sort order |
| `edit_trip_message(message_id, content, mentioned_user_ids[])` | author, current member, within 15 minutes (RLS) | update text and mention recipients in one transaction |
| `send_trip_message(trip_id, content, mentioned_user_ids[])` | current trip member (RLS) | insert message and mention recipients atomically |
| `mark_trip_chat_read(trip_id, at)` | current trip member | advance own read position |
| `set_trip_chat_notifications(trip_id, enabled)` | current trip member | mute or unmute own chat notifications |

## Edge Function

`trip-assistant` (JWT required):

1. Resolves the caller from the Authorization header.
2. Verifies the caller is a trip member before answering.
3. Basic mode returns a deterministic local-style reply; Gemini mode calls the Gemini API.
4. `GEMINI_API_KEY` never reaches the browser; a missing key returns a clear configuration error.

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
- No public image or avatar bucket.
- No share-token mutation from the browser; only the owner RPCs above.
