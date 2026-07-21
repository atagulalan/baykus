# React Native handover — web visual parity

**Date:** 2026-07-21  
**Scope:** `apps/mobile` (Expo) + shared `@baykus/ui` (NativeWind) toward **near-1:1** with `apps/web`.  
**Design source of truth:** web UI (not inventing new native patterns).

Related: [`docs/react-native-migration.md`](docs/react-native-migration.md), [`docs/native-push.md`](docs/native-push.md), root [`HANDOVER.md`](HANDOVER.md) (product specs 001–008 — separate track).

---

## Status

Mobile is a real product shell on the same HTTP API (`@baykus/api-client`). Series detail and app chrome were pushed hard toward web look-and-feel in this thread. **Not** pixel-identical yet; dual trees remain (DOM web vs RN `@baykus/ui`).

Uncommitted work may still sit in the working tree — commit only when asked.

---

## What was done (this parity pass)

### Series detail (`apps/mobile/app/series/[id].tsx` + `@baykus/ui`)

| Area | Change |
|------|--------|
| **Hero** | `SeriesDetailHero` — full-bleed backdrop, poster + italic title/year, Info, `SegmentedProgress` + counts; transparent stack header |
| **Banner fades** | `HeroBackdropFades` — web-like `black/45` + bottom `via-void/20→void` (+ side vignettes on wide); top-biased backdrop crop |
| **Chrome** | Header **⋮ only** (web mobile); refresh via overflow menu + pull-to-refresh (`refreshSeries`) |
| **Page structure** | `gap-6` stack: hero → needs-review → next-up → seasons; **cast in details sheet**, not on-page |
| **Details sheet** | Dense port: status chip, genre/tag pills, networks/logos, runtime, added/refreshed + stale, language, multi-source ratings, providers + JustWatch, cast rail |
| **Next up** | Centered pill + bordered card; landscape still; air date; rating prompt wiring |
| **Seasons** | Sticky `SectionHeader` via `stickyHeaderIndices`; CircularProgress leading (tap → season menu); web `collapseCompletedSeasonRuns` + specials-last + E176 auto-advance; empty season panel |
| **Episode rows** | Season list: `80×48` still, display-italic title, `SxE – date`, finale chip, **rounded** green checkboxes (`bg-green-500/12`) |
| **Watch sheets** | Up-to-here = confirm variant (italic title, desc, **yellow** primary); watched menu uses `removeRewatch` when `watchCount > 1` |
| **Needs review** | Square banner/CTAs (web, not rounded-full) |

Helpers: `packages/ui/src/lib/airDateLabel.ts`, `apps/mobile/src/lib/seriesDetailsMeta.ts` (`genreKey`, `releaseStatusLabel`, `isStale`, `languageDisplayName`).

### App chrome

| Area | Change |
|------|--------|
| **Tab bar** | Floating icon-only **MobileDock** (`apps/mobile/src/components/MobileDock.tsx`) — yellow active, fill/bold like web `AppTabBar`; absolute transparent bar |
| **Edge scrub** | Top + bottom gradient + masked blur (`AppEdgeBlur`) — web `AppEdgeBlur` parity; banner pages ramp over first 100px scroll |
| **Pull-to-history** | Watch + Library use `PullToRefresh variant="history"` (E160) — pull opens `/watch/history`; no History button on Watch |
| **Profile** | Transparent header when banner set; `HeroBackdropFades` on banner hero |

### Shared UI / earlier parity (same overall effort)

- Library home categories, watch tab sections, calendar buckets, schedule week grid, settings export/import/refresh-all, history, stats, favorites, etc. (see migration doc).
- Episode / WatchNext / Calendar rows: nested-press + poster size fixes; rounded checkboxes on list surfaces.
- `@baykus/ui` must **not** depend on `@baykus/api-client` for domain types used only by apps.

### Explicit non-goals / blocked

- **Native push** — blocked until contracts land (`docs/native-push.md`).
- **View transitions / poster morph** — web-only for now.
- Do **not** hand-edit `tr.json` / `en.json`.
- Do **not** force NativeWind into Vite web.

---

## What remains (priority)

### P0 — Series detail / lists still short of web

1. ~~**Sticky season (and library) section pills**~~ — done: `stickyHeaderIndices` on series detail, Library, Watch, and `/library/all`; `SectionHeader` uses `bg-void` so rows don't bleed through.
2. **Episode watch sophistication** — bulk-up-to-here / watch-again / edit-date flows exist, but shift-click shortcuts and some modal polish still web-only.
3. ~~**Season collapse logic**~~ — done: shared `@baykus/ui` `collapseCompletedSeasonRuns` + specials-last + E176 auto-advance (parity with web `lib/seasons.ts`).
4. **Search → `/series/new` preview** — thinner than web (season accordion / hero preview depth).

### P1 — Shell identity (“feels like another app”)

5. ~~**Custom top chrome**~~ — edge blur + baykuş wordmark shipped (`AppEdgeBlur`, `MobileWordmark`, `EdgeScrubProvider`). Residual: dock-hide-on-hero; sticky pills still pin at scroll top (under wordmark overlay, not under a measured `--app-header-height`).
6. ~~**Tab order / Library↔Watch peer**~~ — dock is Watch · Calendar · Profile · Search (4); Library (`index`) hidden from dock, Watch stays active on Library (E142).
7. **Safe-area / content `pb` under absolute dock** — verify all tab screens clear the floating bar like web `MainShell` bottom pad.

### P2 — Other surfaces

8. ~~**Schedule**~~ — web-only; mobile calendar is timeline-only.
9. **Calendar / Watch / Library** — sticky pills, density, and empty states vs web.
10. **Profile / Settings / Stats** — structure largely there; residual spacing, blur, and banner picker polish.
11. **Motion** — deferred (VT, rating slide, accordion height easing).

### P3 — Platform / ops

12. **Device matrix** — iOS + Android smoke; fonts (DM Serif / DM Sans / JetBrains) loading.
13. **Native push** — after API contract delta.
14. **Commit / PR** — parity changes may still be uncommitted; conventional commits when user asks.

---

## Key paths

```
packages/ui/src/lib/seasons.ts                  # E37/E165/E176 (shared with mobile)
packages/ui/src/molecules/SeriesDetailHero.tsx
packages/ui/src/molecules/HeroBackdropFades.tsx
packages/ui/src/molecules/SeriesDetailsSheet.tsx
packages/ui/src/molecules/ActionSheet.tsx          # list | confirm
packages/ui/src/molecules/SectionHeader.tsx       # bg-void for sticky lists
packages/ui/src/organisms/EpisodeRow.tsx
packages/ui/src/atoms/Checkbox.tsx                 # variant="rounded"
apps/mobile/app/series/[id].tsx
apps/mobile/app/(tabs)/index.tsx                   # sticky category pills
apps/mobile/app/(tabs)/watch.tsx
apps/mobile/app/library/all.tsx
apps/mobile/app/(tabs)/_layout.tsx
apps/mobile/src/components/MobileDock.tsx
apps/mobile/app/(tabs)/profile.tsx
apps/web/src/pages/series/components/SeriesDetailHero/SeriesDetailHero.tsx   # visual reference
apps/web/src/lib/seasons.ts                        # still used by web; ui copy for RN
```

---

## Verify

```bash
# API + web (optional while developing mobile)
pnpm dev

# Metro (from apps/mobile or monorepo scripts)
# clear cache if NativeWind/class changes look stale

cd packages/ui && ../../node_modules/.bin/tsc --noEmit -p tsconfig.json
cd apps/mobile && ../../node_modules/.bin/tsc --noEmit -p tsconfig.json
```

Reload a **series detail** page after UI token/class changes: hero fades, round checkboxes, details sheet density, floating dock, profile banner under transparent header.

---

## Suggested next session

1. Search → `/series/new` preview depth (or episode watch modal polish).  
2. Edge blur / dock-hide-on-hero (tab native headers already hidden).  
3. Schedule strip identity.  
4. Commit when ready.

**Scale note:** Metro `inlineNativeRem: 16` (was NativeWind default 14) — restart Metro with `-c` after changing. Hard-coded `px` / Lucide `size={n}` do not follow rem; bump those separately if needed. Further size: try `17`–`18`.
