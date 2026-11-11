# AGENTS.md

Instructions for AI coding agents (and humans) working in this repo.

## What this repo is

AniStream is an anime streaming app backed by a samehadaku scraping API.

| Path | What | Status |
|---|---|---|
| `server/` | Express API: scraper, mirror resolver, HLS proxy | Live, shared by web and mobile |
| `src/`, `index.html`, `vite.config.js` | Web prototype (React + Vite PWA) | Reference implementation |
| `mobile/` | React Native app (Expo + TypeScript). Expo-specific rules: `mobile/AGENTS.md` | Being built, see `docs/PRD.md` |
| `docs/PRD.md` | Product requirements and milestones | Source of truth for scope |

Read `docs/PRD.md` before starting feature work. Read `README.md` for how playback and the HLS proxy work.

## Git workflow (required)

Every change goes through a branch and a squash-merged PR. Never commit directly to `main`.

1. Start from an up-to-date main: `git switch main && git pull --ff-only`
2. Create a branch, `<type>/<short-kebab-desc>`, where type is one of `feat`, `fix`, `docs`, `chore`, `refactor`, `test`.
   Example: `feat/mobile-home-screen`
3. Commit in small, focused commits. Use Conventional Commit subjects, e.g. `feat(mobile): add home screen rails`.
4. Push and open a PR: `git push -u origin HEAD && gh pr create --fill` (or pass `--title/--body`).
   - The body says what changed, why, and how it was verified.
5. Squash and merge: `gh pr merge --squash --delete-branch`
6. Return to main: `git switch main && git pull --ff-only`

The repo only allows squash merges, and branches are deleted automatically on merge.
Keep each PR to one milestone step from the PRD, or smaller.

## Commands

```bash
# API + web prototype (repo root)
npm install
npm run dev        # API :5178 + Vite :5177
npm run build && npm start   # single port :5178
./start.sh         # detached production run (used on waf-server)

# Mobile
cd mobile
npm install
npx expo start     # dev server; open in a dev build / Expo Go
npx expo install <pkg>   # add deps (never plain npm install <pkg>)
npm run typecheck
npm run lint
```

## CI/CD and releases

- **CI** (`.github/workflows/ci.yml`) runs on every PR and every push to `main`. It builds the web app and checks the API files, then runs typecheck, lint and expo-doctor on the mobile app and bundles its Android JS. Don't merge a PR while CI is red.
- **Release** (`.github/workflows/release.yml`) runs when a `v*` tag is pushed. It builds a signed Android APK on EAS (profile `production`, Expo project `@sankya/anistream`) and publishes it as a GitHub Release.
  1. In a PR, bump `expo.version` in `mobile/app.json` (e.g. `0.2.0`), then squash-merge it.
  2. `git switch main && git pull --ff-only && git tag v0.2.0 && git push origin v0.2.0`
  3. The tag must equal `v` + `expo.version`, or the workflow fails. EAS increments the Android `versionCode` itself.
- EAS auth comes from the `EXPO_TOKEN` repo secret. Signing keys are stored on EAS (`npx eas-cli credentials`). Never commit them.
- Every EAS build uses up the account's monthly build quota. Builds run only for release tags, not on every merge.
- Ad-hoc test build: `cd mobile && npx eas-cli build -p android --profile preview`

## Conventions

- **Scraping lives only in `server/scraper.js`.** The mobile app never fetches samehadaku directly. It only calls `/api/*`.
- **Don't break the API contract.** The web prototype and the mobile app both depend on it. Add fields freely. Renaming or removing a field needs both clients updated in the same PR.
- **Mobile code is TypeScript**, with strict mode on. Put API response types in `mobile/src/api/types.ts`, matching `server/index.js`.
- **Data fetching** goes through TanStack Query hooks in `mobile/src/api/`. Screens don't call `fetch` themselves.
- **Local storage** keys and shapes match `src/storage.js` (`anistream.bookmarks.v1`, `anistream.history.v1`).
- The API base URL comes from `EXPO_PUBLIC_API_URL`. Never hardcode hosts in components.
- Follow the existing style. Don't reformat or refactor code your change doesn't need.

## Verification before opening a PR

- Server change: `curl` the affected `/api/*` endpoint and paste a trimmed response in the PR.
- Web change: `npm run build` passes.
- Mobile change: `npm run typecheck` and `npm run lint` pass in `mobile/`. Run the screen you touched on Android (emulator or device) and describe what you checked in the PR.
- Playback change: test at least one HLS episode and one iframe-only episode.

## Don'ts

- Don't commit `node_modules/`, `dist/`, `.env*`, build outputs (`*.apk`, `*.aab`), or secrets.
- Don't expose the server publicly or change `tailscale serve` / nginx config without asking.
- Don't run `tailscale serve --https=443`. nginx owns 443 on this host.
- Don't add dependencies "just in case". Each one needs a reason in the PR.
