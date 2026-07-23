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
pnpm dev            # server (4004) + web (5173) + Expo mobile
pnpm test           # vitest across workspace (baseline: 576 tests, 64 files)
pnpm typecheck && pnpm lint && pnpm build
```

If M9.2 stays credential-blocked and the USER-ONLY checks above are all that's
left, there is nothing queued — ask xava what's next before starting new work.

**React Native dual-client — SeriesDetailHero:** full-bleed backdrop hero + poster
rail + SegmentedProgress (library) / start-watching CTA (preview), transparent
stack header. Remaining thinner: custom tab chrome, schedule strip-span, search
preview seasons, push **spec delta**. Commit when xava asks.

---

## Spec 013 — UX Polish Round 5 + mobile polish batch (2026-07-22)

**Active work:** Uncommitted delta across `apps/mobile`, `apps/web`,
`packages/ui`, `packages/i18n`, `specs/013-ux-polish-round5/spec.md`.
Spec 013 web acceptance (E167–E197) is checked off in spec.md; the user’s
31-item mobile/mweb checklist below is tracked here.

### Checklist status (user batch 2026-07-22)

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Mobile accordion jank on open | **Done** | Series-detail seasons use `AccordionPanel animated={false}` (instant expand); `pinSection` defaults to one post-layout rememeasure (`correctMs: 0`) — no height-tween + rAF correction storm |
| 2 | mweb overscroll / rubber-band excess | **Done** | `apps/mobile/global.css` `overscroll-behavior-y: none`; web `index.css` same |
| 3 | Bottomsheet UX review | **Done** | `Modal` spring open, snappier swipe dismiss (lower threshold / fling), larger drag handle |
| 4 | Bottomsheet list items monospace → sans | **Done** | `ActionSheet` list rows `font-sans` (`ActionSheet.tsx`); `SettingsSelect` option sheet title fixed to sans |
| 5 | No auto-advance to TBD / when unaired remain | **Done** | `isSeasonFinished` + `nextIncompleteSeasonAfter` skip empty/TBD seasons (`packages/ui/src/lib/seasons.ts`); E180/E176 |
| 6 | Mobile “13 days” countdown | **Done** | `UnairedTrailingMark` + `useAiringClock` wired in `apps/mobile/app/series/[id].tsx` |
| 7 | Series detail blur even with banner | **Done** | `HeroBackdropFades` always rendered (`SeriesDetailHero.tsx`) |
| 8 | Profile settings icon right of camera | **Done** | `apps/mobile/app/(tabs)/profile.tsx` icon row order |
| 9 | Info icon position vs title | **Done** | Title row `items-start` in shared `SeriesDetailHero` + web hero |
| 10 | Episode still placeholder (SxE) | **Done** | E188 — `EpisodeRow` reserved frame + code (`packages/ui/src/organisms/EpisodeRow.tsx`, web parity) |
| 11 | Profile photo upload loader | **Done** | Avatar overlay + `accessibilityState.busy` (`profile.tsx`, E197) |
| 12 | Remove mobile “extra info sources” | **Done** | Section absent from `apps/mobile/app/(tabs)/settings.tsx` |
| 13 | Mobile backup & transfer UI polish | **Done** | Data actions sans body weight + taller dashed import target; native still routes zip pick via `/import` (no in-app file input) |
| 14 | Mobile settings back button | **Done** | `MobileWordmark` + `backAffordance` for `/settings` → profile |
| 15 | “Search series” not monospace | **Done** | Mobile `TextInput` `font-sans`; web search input sans |
| 16 | “Find a show” / descriptions not monospace | **Done** | `EmptyPanel` hint `font-sans`; web `search.page.hint` sans; loading line de-monospaced |
| 17 | Grid refresh after mark watched | **Done** | `useFocusEffect` refetch on library + watch tabs (`index.tsx`, `watch.tsx`) |
| 18 | Cover photo via series menu | **Done** | `useAsCover` in series menu; profile modal howto-only (E194) |
| 19 | Cover picker normal bottomsheet | **Done** | Profile banner modal uses default sheet (removed `size="large"`) |
| 20 | Tablet bottomsheets max-width centered | **Done** | `Modal` tablet `maxWidth` 384/512 (`Modal.tsx` `TABLET_MIN_WIDTH`) |
| 21 | Expo web max 1024; tablet native full width | **Done** | `WEB_CONTENT_MAX` gated to `Platform.OS === "web"` (`_layout.tsx`, `layout.ts`) |
| 22 | Android accordion animation | **Done** | Series detail: instant expand (no Reanimated height tween of huge lists). Library grids keep Reanimated `AccordionPanel` (works on New Arch / Android). Device QA optional. |
| 23 | Watch history chrome + poster | **Done** | E189/E190 — no title row, `posterStretch` + `stillUrl` (`watch/history.tsx`) |
| 24 | Tap season → scroll into view | **Done** | `pinSeasonSection` → `StickySectionScroll.pinSection` (`series/[id].tsx`, E191) |
| 25 | Next-up title → episode info | **Done** | E192 — `NextUpCard` `onPress` → `EpisodeDetailsSheet` |
| 26 | Tablet menus as popovers | **Done** | E193 — `ActionSheet` `presentation="popover"` + `anchorRef` at ≥640 |
| 27 | Profile cover modal howto + remove only | **Done** | E194 — mobile + web `ProfileBannerPicker` |
| 28 | Settings Data→Danger gap + tablet columns | **Done** | E195 — `mt-6` spacer + `sm:columns-2` parity in settings |
| 29 | Header ⋮ leak on profile navigate | **Done** | E196 — `useHeaderRightAction` clears on blur |
| 30 | Avatar upload loader overlay | **Done** | E197 — z-index overlay on profile avatar |
| 31 | Grain effect on mobile | **Done** | `FilmGrainOverlay` in root layout (`apps/mobile/src/components/FilmGrainOverlay.tsx`) |
| 32 | SeriesCard long-press lift menu | **Done** | E202 — `LiftContextMenu` + `SeriesCardMenuProvider` on Library / All / Favorites / Profile |

### Remaining / follow-up

None blocking from the 31-item batch. Optional: device feel-check of series-detail season open on Android/iOS; native in-app zip file picker if desired later; device feel-check of E202 lift menu on Android/iOS.

### Session implementation (this pass)

- **SeriesCard lift context menu (32 / E202):** Cross-platform long-press menu — Reanimated lift preview + branded actions under the card (`packages/ui` `LiftContextMenu`); wired via `SeriesCardMenuProvider` / `MenuSeriesCard` on library grids. Actions match series detail ⋮; remove uses `ConfirmDialog` after the lift closes.
- **Accordion jank (1, 22):** Root cause = Reanimated height tween of a full `EpisodeRow` list inside a FlatList body cell + `pinSection`’s ~320ms rAF rememeasure/scroll storm. Fix: series-detail seasons use `AccordionPanel animated={false}` (instant natural height); `pinSection` defaults to one post-layout rememeasure (`correctMs: 0`); pin immediately on expand (no 300ms defer). E191 decision updated.
- **Sticky pill wrong after accordion/gap (follow-up):** FlatList does not re-fire sibling header `onLayout` when a body above changes height — `yByKey` went stale. `StickySectionScroll` now remesasures **all** mounted headers on body layout, section-structure changes, and before `pinSection`; exposes `remeasureHeaders()`.
- **Bottomsheet (3):** Modal spring open, easier swipe dismiss, larger handle.
- **Backup UI (13):** Settings Data buttons/import target de-monospaced to sans body.
- Prior: `FilmGrainOverlay`, info icon top-align, search/settings sans, profile cover sheet, etc.

Run before commit: `pnpm test packages/ui packages/ui/src/lib/seasons.test.ts apps/mobile/src/lib/backAffordance.test.ts && pnpm typecheck`.

