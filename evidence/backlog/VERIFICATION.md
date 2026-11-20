# Travel collaboration verification — 2026-11-20

## Gates

| Gate | Result |
| --- | --- |
| `npm run release:verify` | Passed: app typecheck, E2E typecheck, 49 Vitest cases, 1 MCP cache test, production build |
| `npm run test:e2e` | Passed: 33 Playwright cases, Chromium, local Supabase |
| `git diff --check` | Passed |
| `supabase migration up --local` | Applied all eight collaboration migrations without resetting local data |
| `supabase db push --remote --dry-run --skip-vault` | Listed six initial migrations, then only `06000`, then only `07000`; no seed, roles, or vault changes |
| `supabase db push --remote --skip-vault --yes` | Applied all eight migrations to linked production project `travel-mngt` |
| `supabase migration list --remote` | All local and remote migration versions match |

## New feature cases

| Case | Test | Screenshot |
| --- | --- | --- |
| Two members chat, typing, read receipt, mention notification | `backlog.spec.ts`: viewer chats, mentions, sees typing and read receipts | [chat and read](01-chat-mentions-read.png) |
| Edit message; mention recipients stay in sync, removal clears them; `@all` resolves to trip members | `backlog.spec.ts`: viewer chats, mentions, sees typing and read receipts | [edited message](02-chat-edited.png) |
| Member feed post with photo, reaction, and comment | `backlog.spec.ts`: members publish, react and comment in private trip feed | [post](03-feed-post.png), [reaction and comment](04-feed-reaction-comment.png) |
| Owner pins a post and replies to a comment | `backlog.spec.ts`: members publish, react and comment in private trip feed | [pinned reply](10-feed-pinned-reply.png) |
| Avatar crop, view, change and remove | `backlog.spec.ts` and `avatars.spec.ts` | [crop](05-avatar-crop.png), [view](06-avatar-view.png), [removed](../avatars/03-profile-avatar-removed.png) |
| Dark settings popup, mobile language menu, completed progress | `backlog.spec.ts`: avatar menu, language layout, dark popup and completed progress | [dark popup](07-dark-settings-popup.png), [language](08-mobile-language.png), [complete](09-progress-complete.png) |
| Member and nonmember RLS, atomic send/mention rollback, duplicate mentions, viewer cleanup, notification cleanup, owner pinning, muted chat notifications | `collaboration-permissions.spec.ts` | API assertions; screenshots above cover the UI |
| Chat reaction, GIF, wallpaper, viewer participation | `chat.spec.ts` | [reaction and GIF](../chat/04-chat-reaction-and-meme.png), [viewer](../chat/06-chat-viewer-participating.png) |

Playwright only targets local Supabase. The remote check verifies migration history; it does not exercise the hosted frontend.

Attachment uploads still occur after the database creates a message. If the upload fails, the client deletes that recent message; the database then removes its mention and notification rows. This cleanup depends on the client remaining connected long enough to issue the delete request.
