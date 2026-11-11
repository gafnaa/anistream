---
name: anistream-workflow
description: How to ship a change in the AniStream repo (React Native mobile app, Express scraping API, web prototype). Use for any code or docs change in this repo, including adding a mobile screen, changing the API or scraper, or fixing playback. Covers the required branch → PR → squash-merge flow and the verification each kind of change needs.
---

# AniStream workflow

Read `AGENTS.md` (rules) and `docs/PRD.md` (scope and milestones) first. This skill is the step-by-step procedure.

## 1. Ship every change through a PR

```bash
git switch main && git pull --ff-only
git switch -c <feat|fix|docs|chore|refactor|test>/<short-kebab-desc>
# ...make changes, verify (section 3)...
git add -A && git commit -m "<type>(<scope>): <summary>"
git push -u origin HEAD
gh pr create --title "<type>(<scope>): <summary>" --body "<what / why / how verified>"
gh pr merge --squash --delete-branch
git switch main && git pull --ff-only
```

Scopes: `mobile`, `server`, `web`, `docs`, `repo`.
Merge only after the verification in section 3 passes. Never push to `main` directly.

## 2. Recipes

### Add a mobile screen
1. Find the screen's requirements in PRD §5. Implement only the P0/P1 items in scope.
2. Create the route under `mobile/src/app/` (Expo Router), e.g. `src/app/series/[slug].tsx`. Non-route code goes elsewhere in `mobile/src/`.
3. Add or extend a query hook in `mobile/src/api/` and the response type in `mobile/src/api/types.ts`.
4. Handle the loading, error-with-retry, and empty states.
5. Check that the web prototype's matching page (`src/pages/*.jsx`) shows the same data. It is the reference.

### Change the API or scraper
1. Parsing changes go only in `server/scraper.js`. Routing, caching, and proxying changes go in `server/index.js`.
2. Keep response shapes backward compatible, or update `src/` and `mobile/` in the same PR.
3. Restart the running server: `./start.sh`. Then `curl -s localhost:5178/api/<endpoint> | head -c 600`.

### Fix playback
- Find the mirror type: `curl -s "localhost:5178/api/resolve?mirror=<url>"` returns `hls|mp4|iframe`.
- `hls`/`mp4` play through `/api/hls` in `expo-video`. `iframe` plays in `react-native-webview`.
- Test one HLS episode and one iframe-only episode before opening the PR.

### Cut a release (Android APK)
1. PR: bump `expo.version` in `mobile/app.json`, then squash-merge it once CI is green.
2. `git switch main && git pull --ff-only && git tag v<version> && git push origin v<version>`
3. Follow the run with `gh run list --workflow release.yml`. On success, the APK is attached to the GitHub Release for that tag.

## 3. Verify before the PR

| Change | Must pass |
|---|---|
| `server/` | curl the affected endpoint; paste the trimmed output in the PR |
| `src/` (web) | `npm run build` |
| `mobile/` | `cd mobile && npm run typecheck && npm run lint`, then run on Android |
| docs only | Proofread; check that paths and commands exist |

If a check fails, fix it or say so in the PR body. Never claim a check passed if it didn't run.
