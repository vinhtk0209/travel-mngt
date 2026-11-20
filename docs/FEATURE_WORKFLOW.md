# Feature delivery workflow

Every feature request moves through these steps. Store the artifacts beside the change so an AI-SDLC runner can inspect the same evidence.

| Step | Purpose | Artifact / gate |
| --- | --- | --- |
| Intake | Record feature, enhancement, or bug and target repo | Requirement text and requester |
| Analysis | Inspect code, RLS, migrations, tests, and deployment impact | Implementation plan and risks |
| Clarify | Resolve behavior, permissions, and acceptance | Approved answers; scope clear before code |
| Code | Implement UI, API, migrations, translations, and docs together | Reviewable diff |
| Verify | Run typechecks, unit tests, build, and focused E2E on local Supabase | Commands, outcomes, testcase names, screenshots |
| Review | Inspect evidence and approve production-impacting steps | Reviewer decision |
| Migrate | Apply reviewed SQL to the selected remote project | Migration log and rollback plan |
| Deploy | Deploy functions and frontend, then smoke-test | Deployment URL, status, screenshots |

The local evidence gate is `npm run release:verify` plus `npm run test:e2e` for the full suite after a cross-feature change. The E2E runner checks that `.env.local` and Supabase both point to localhost. Use `supabase migration up --local` for pending migrations; do not use `supabase db reset` for this gate because it erases local data. Store screenshots in `evidence/<feature>/` and link them in the delivery report.

For this collaboration backlog, `e2e/backlog.spec.ts` covers chat with two accounts, mentions and edits, the private feed, avatar actions, a dark-mode settings popup, the language menu at mobile width, and 100% progress styling. `e2e/collaboration-permissions.spec.ts` checks RLS, owner moderation, and muted notifications through authenticated local Supabase clients. Run both after every collaboration migration, then run the full suite.
