# Repository knowledge index

Read this index first when answering a repository question. Retrieve only the matching source section instead of loading the whole repo into context. `npm run memory:mcp` starts a read-only stdio MCP server with `search_repository` and `read_repository_file` tools. It caches file contents by path, size, and modification time and refreshes changed files on the next call. Register this command in your MCP client to use it; this repo does not alter global MCP settings.

| Topic | Source of truth |
| --- | --- |
| Project setup and commands | `README.md`, `package.json`, `AGENTS.md` |
| Frontend layout and state | `docs/ARCHITECTURE.md`, `src/app/router.tsx`, `src/lib/query-keys.ts` |
| Database and access | `supabase/migrations/`, `docs/RLS_MATRIX.md`, `src/lib/supabase/database.types.ts` |
| Chat and feed | `src/features/chat/`, `src/features/feed/`, `src/features/notifications/` |
| Release and rollback | `docs/RELEASES.md`, `CHANGELOG.md` |
| Evidence | `e2e/backlog.spec.ts`, `e2e/collaboration-permissions.spec.ts`, `evidence/backlog/VERIFICATION.md` |

For a new feature, add its ownership and data contracts here. Record durable architecture decisions in `docs/ARCHITECTURE.md`; do not cache unstated assumptions as facts. Never place keys, `.env.local`, user messages, or private trip content in the knowledge cache.
