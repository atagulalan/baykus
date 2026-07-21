# HANDOVER — specs 001–008 fully done, §M33 browser pass executed; only M9.2 + user-only checks remain

**Status (2026-07-17, updated):** Specs 001–008 are all code-complete, and
**every browser checkpoint has now been executed** — 008's own §M52 (earlier)
and the combined pre-008 §M33 walk (specs 002–007) this session. Nothing is
queued for new code work. What's left is not automatable here:

- **M9.2** (hosted deploy of baykus.xava.me) — needs real DNS/TLS/hosting
  credentials, stays blocked on xava. Do not attempt.
- A handful of **USER-ONLY** manual checks that a headless environment cannot
  cover (listed below).

## The §M33 combined browser pass — what happened (2026-07-17)

Run the same way as §M52: an ad hoc headless playwright (chromium from
`~/.cache/ms-playwright`, **not** a standing project skill) driving the real
dev server. `MANUELTEST.md` §M11.4→§M33 are now checked with real results;
the file's top carries a full summary block.

- **Zero mutation of the real library** (`apps/server/data/`): only read-only
  checks ran against it; a table-count fingerprint taken before and after the
  walk is byte-identical. The one transient real mutation (locale EN↔TR) was
  reverted net-zero.
- **Every mutating scenario** (E61 favorites zip round-trip incl. a real
  reset, TV Time fixture import, E33/E63 fabrications, stale-sweep
  `last_refreshed_at` edits, episode-mark modals) ran against a `sqlite3
  .backup` **copy** of the real DB on a second server instance
  (`BAYKUS_DATA_DIR` + port 4104).
- **One real bug found and fixed:** switching locale to EN left `<html lang>`
  at "tr", so CSS `text-transform: uppercase` applied Turkish casing
  ("LİBRARY", "PROFİLE" with dotted İ). Fixed in
  `apps/web/src/i18n/index.ts` (a `languageChanged` → `document.documentElement.lang`
  sync); verified live. Committed separately.
- **One open product decision resolved (E74):** ResetLibraryDialog's confirm
  phrase is now a `bg-white/5 px-1 font-mono` block via react-i18next
  `<Trans>` (xava's call: implement). Spec 006 tasks.md M28.2 DECISION +
  spec.md acceptance updated to resolved.

### USER-ONLY checks still open (cannot be done headless — not blockers)
- **Push notification delivery (E39):** headless chromium has no Push API
  (incognito restriction), so the subscribe→test-notification chain can't run.
  Server-side `push.test.ts` is green; only real-device delivery is unverified.
- **TMDB backfill + tmdbId URL forms (§M22):** the whole library is
  TVmaze-matched (no `tmdbId` set), so `/series/<tmdbId>` and the
  i-form→bare-number replace-redirect need a real TMDB key + backfill first.
  Grammar/no-loop covered by `seriesPath.test.ts`.
- **Poster morph / cross-fade smoothness + Firefox <139 fallback:** the
  mechanical layer is verified live (`poster-${id}` view-transition names,
  `app-header`/`app-tabbar` groups, 160ms root cross-fade, reduced-motion
  `animation:none`, feature-detected `startViewTransition`); animation
  smoothness is a human-eye call and Firefox isn't in this environment.
- **Multi-mode-only surfaces:** DeleteAccountDialog and ClaimPage's warning
  branch don't render in single mode (this dev instance). `TriangleAlert` is
  wired and the same lucide icon was observed live in the import report; no
  `⚠` glyph exists in source.

## Housekeeping done the same session (2026-07-17)

Three commits before the §M33 walk, one after:
- **docs refresh:** AGENTS.md gained 006/007/008 entries + extended
  normative/reading-map through 008; README zip version 4→6 and a consolidated
  001–008 status block; stale acceptance boxes closed (008 §M52, 002 README);
  003/005 data-model.md got SUPERSEDED zip-version pointers.
- **dead-code + config cleanup** (fallow-verified): deleted the orphaned
  `ManualListPicker.tsx` (+ its now-unused i18n keys), dropped the `export`
  keyword from 9 in-file-only symbols, removed biome.json's stale
  `!dashboard.html` ignore + bumped its `$schema` to 2.5.3, aligned
  same-major dep ranges (better-sqlite3/drizzle-orm/zod).
- **E74 phrase block** (feat).
- **§M33 results** (docs, this final commit): MANUELTEST + all spec.md
  acceptance boxes + 002/003 checkpoint tasks.md + this handover.

## Commands

```bash
pnpm install
pnpm dev            # server (4004) + web (5173, proxies /api and /img)
pnpm test           # vitest across workspace (baseline: 576 tests, 64 files)
pnpm typecheck && pnpm lint && pnpm build
```

If M9.2 stays credential-blocked and the USER-ONLY checks above are all that's
left, there is nothing queued — ask xava what's next before starting new work.

**React Native dual-client — birebir product parity pass:** profile banner picker,
full stats sections, dedicated settings (general/providers/account/danger),
all-series per-section sort, history newest/oldest, profile all-series preview.
Remaining thinner: series-detail menus/bulk/rating depth, ScheduleGrid pan,
web DOM atom switch (TW4), push **spec delta**, device matrix. Commit when xava asks.
