# AniStream Mobile

React Native app (Expo SDK 58, Expo Router, TypeScript). Scope and milestones: [`../docs/PRD.md`](../docs/PRD.md).

```bash
npm install
npx expo start        # dev server
npm run typecheck     # tsc --noEmit
npm run lint          # expo lint
npx expo-doctor       # dependency / config health
```

Screens live in `src/app/` (file-based routes). Other code goes in `src/`.
Add dependencies with `npx expo install <pkg>`.

Foundation folders: `src/theme/` contains the PRD tokens and type scale;
`src/components/` contains Text, the screen wrapper, and `skeleton/` primitives;
`src/hooks/` contains the 150 ms skeleton delay; `src/api/` contains response types,
the timeout-aware client and TanStack Query hooks; `src/i18n/` contains typed
Indonesian/English dictionaries selected from the device locale.
`src/app/(tabs)/` holds the five placeholder tabs. In development, My Space links
to `/dev/design` for every type style, colour and skeleton. Production blocks this route.

Copy `.env.example` to `.env.local` to set `EXPO_PUBLIC_API_URL`. The default is
`https://waf-server.tail1ec650.ts.net:5175`. Use a host reachable from the device.
Fonts are bundled and loaded before dismissing the splash. Skeleton previews have
an explicit pause control and use static boxes with Reduce Motion enabled.
