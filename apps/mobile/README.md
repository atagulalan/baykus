# @baykus/mobile — Expo client

Expo Router app with NativeWind + shared `@baykus/ui` / `@baykus/api-client` /
`@baykus/i18n`. Full roadmap: [`docs/react-native-migration.md`](../../docs/react-native-migration.md).

## Run

```bash
# Terminal A — API must be up on :4004
pnpm --filter @baykus/server dev

# Terminal B — Expo
cp .env.example .env
# Set EXPO_PUBLIC_API_BASE_URL to a host the *device* can reach
# (LAN IP for a phone; 127.0.0.1 for iOS Simulator / Expo web on this machine;
# 10.0.2.2 for Android emulator). Server allows CORS for Expo web.
pnpm --filter @baykus/mobile start
# or: pnpm dev:mobile
# Expo web: pnpm --filter @baykus/mobile web
```

After changing `.env`, restart Metro (Expo inlines `EXPO_PUBLIC_*` at bundle time).

Shared UI RN-Web Storybook (NativeWind + Tailwind 3.4, not production Vite):

```bash
pnpm --filter @baykus/ui storybook   # http://localhost:6007
```

## Screens

| Route | What |
|---|---|
| `/(tabs)/watch` | Category sections + quick-mark + history link |
| `/(tabs)` | Library grid + link to All series |
| `/library/all` | Category-grouped library (E60) |
| `/library/favorites` | Full favorites grid |
| `/profile/stats` | Stats first slice (hero / recent / top / categories) |
| `/(tabs)/calendar` | Timeline only |
| `/(tabs)/search` | Search, preview, quick-add |
| `/(tabs)/profile` | Hub + account + reset library + favorites preview |
| `/series/[id]` | Detail, favorite, remove, next-up, seasons |
| `/series/new` | Preview + add to library |
| `/watch/history` | Recent watches |
| `/login` / `/claim` | Bearer session via SecureStore |
| `/import` | Zip merge/replace + TV Time SSE match/confirm |
| `/dev/smoke` | BrandSmoke |

## Auth

- Token key: **`baykus.accessToken`** (SecureStore).
- Password + Google (`expo-auth-session`) + Apple (`expo-apple-authentication`,
  iOS) → `id_token` → `/auth/oauth/callback` with `returnToken`.
  First-time OAuth users complete handle claim on `/login`.
- Optional env: `EXPO_PUBLIC_GOOGLE_{WEB,IOS,ANDROID}_CLIENT_ID` (see `.env.example`).
  Append native Google/Apple IDs as **non-first** entries in server
  `BAYKUS_*_CLIENT_IDS` (014 E122).

HTTP API only — never import `@baykus/core` or providers.
