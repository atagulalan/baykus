# @baykus/mobile — Expo client

Expo Router app with NativeWind + shared `@baykus/ui` / `@baykus/api-client` /
`@baykus/i18n`. Full roadmap: [`docs/react-native-migration.md`](../../docs/react-native-migration.md).

## Run

**Multi mode (handles / login / logout)** — preferred for phone testing:

```bash
# Root .env: BAYKUS_TMDB_API_KEY (+ optional BAYKUS_GOOGLE_CLIENT_IDS)
# apps/mobile/.env: EXPO_PUBLIC_API_BASE_URL the *device* can reach
#   phone → http://<lan-ip>:4004
#   iOS Simulator / Expo web on this machine → http://127.0.0.1:4004
#   Android emulator → http://10.0.2.2:4004
cp apps/mobile/.env.example apps/mobile/.env   # first time only
pnpm dev:multi   # server :4004 + web :5173 + Expo (forces BAYKUS_MODE=multi)
```

**Single mode** (open library, no accounts — logout UI is hidden):

```bash
pnpm dev   # or: pnpm --filter @baykus/server dev + pnpm dev:mobile
```

After changing `apps/mobile/.env`, restart Metro (Expo inlines `EXPO_PUBLIC_*` at bundle time).
Server allows CORS for Expo web.

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
