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
