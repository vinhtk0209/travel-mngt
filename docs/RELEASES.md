# Releases and rollback

Wanderlist uses Git tags as the source of truth for versions. Every production
deployment must map to one tag. A tag is never moved after it is pushed.

- Version format: `vMAJOR.MINOR.PATCH` (SemVer).
- Patch: fixes only. Minor: new features, backward compatible. Major: breaking
  product or data changes.
- What each version contains: [CHANGELOG.md](../CHANGELOG.md) and
  `git show vX.Y.Z`.
- Current version: `git describe --tags --always`.

## Cut a release

1. Start from a clean `main` and run the full gate:

   ```powershell
   git status
   npm run release:verify
   ```

2. With the local Supabase stack running, run the feature evidence suite:

   ```powershell
   npx playwright test e2e/features.spec.ts
   ```

3. Update `CHANGELOG.md` (move items out of `Unreleased`) and bump the package
   version without creating a tag yet:

   ```powershell
   npm version minor --no-git-tag-version
   ```

4. Commit the release, then create an annotated tag whose message is the
   one-line summary:

   ```powershell
   git add -A
   git commit -m "chore(release): v0.4.0"
   git tag -a v0.4.0 -m "Short summary of what this version contains"
   ```

5. Push the commit and the tag. Pushing `main` is what triggers the Vercel
   production deployment; the tag is what makes that deployment identifiable.

   ```powershell
   git push origin main
   git push origin v0.4.0
   ```

6. Apply backend changes before or with the frontend, never after a rollback
   window has started:

   ```powershell
   npx supabase db push --remote
   npx supabase functions deploy invite-member
   ```

7. In Vercel, open the project's **Deployments** list, confirm the new
   production deployment is the release commit, and run a short smoke test
   (sign in, open a trip, add a place, toggle dark mode, open an invite link).

## Identify what is deployed

- Vercel shows the deployed commit SHA on each deployment card.
- Map that SHA to a tag: `git tag --contains <sha>` or
  `git describe --tags --always <sha>`.
- Read the version contents: `git show v0.3.0` and `CHANGELOG.md`.
- List versions newest first: `git tag --sort=-v:refname -n99`.

## Roll back a bad release

### Preferred: instant production rollback (frontend only)

1. Open the Vercel project → **Deployments**.
2. Find the last known-good production deployment (match it to a tag).
3. Use **Promote to Production** / **Instant Rollback** on that deployment.
4. Confirm the production URL serves the old commit.
5. Open an issue and fix forward on a branch, then ship a patch release.

This does not touch the database or Edge Functions.

### Git rollback when main must change

Do not force-push or reset shared `main`. Revert the bad release commit so the
history stays auditable:

```powershell
git revert <bad-release-commit>
git push origin main
```

Vercel deploys the revert commit. Tag the fix as the next patch version.

### Edge Function rollback

Deploy the function from the old tag without switching the whole working tree:

```powershell
git worktree add ..\travel-mngt-v0.2.0 v0.2.0
npx --prefix ..\travel-mngt-v0.2.0 supabase functions deploy invite-member
git worktree remove ..\travel-mngt-v0.2.0
```

### Database changes

Migrations are forward-only. Never edit or delete a migration that has already
been applied to production.

- A frontend rollback is safe if the migration was additive/backward compatible
  (for example `v0.3.0` makes `trip_invitations.email` nullable).
- If a migration is the problem, write a new compensating migration that restores
  the old shape, apply it with `npx supabase db push --remote`, then roll back the
  app if needed.
- Supabase has no automatic down-migration. Keep a tested backup before large
  data rewrites.

## Current known-good versions

| Version | Contents | Backend notes |
| --- | --- | --- |
| `v0.3.0` | Dark mode, maps links, link invites, Wanderbot, image upload fixes | Requires migration `20260101000300_share_links.sql` and the `invite-member` build from this tag |
| `v0.2.0` | Social-only Google/GitHub auth | No link-invite schema |
| `v0.1.1` | Vercel SPA rewrite | Same schema as `v0.1.0` |
| `v0.1.0` | Initial MVP | Initial schema |
