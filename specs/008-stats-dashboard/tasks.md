# Tasks 008 — Stats Dashboard

Continues M44+. One conventional commit per milestone when practical.
Approved 2026-07-16 (all four open decisions confirmed as specced: E95
date flag, single long page, full 20-section scope, Monday-first weekday).
Entry point: M44.2, then M45.1.

- [ ] **M44 docs: spec 008 package**
  - [x] M44.1 spec.md + contracts/api.md + plan.md + ui.md + tasks.md
        (committed alongside 007's M41–M43 packaging; renumbered from
        M41/E89 drafts after 007 grew to E94)
  - [ ] M44.2 root housekeeping: delete `dashboard.html` (biome already
        ignores it; keep until M52's value spot-checks if convenient) —
        HANDOVER.md + CLAUDE.md pointers already updated
        <!-- DECISION: deferred to M52 per this task's own convenience
        clause — the file is untracked (never in git), and M52.1's spot-check
        against dashboard.html's values needs it on disk; deleting now would
        just mean re-creating the comparison from memory. Deleted at M52. -->

- [x] **M45 core+importer: watch date fidelity (E95)**
  - [x] M45.1 schema: `watches.date_unknown` bool default false; migration
        (hand-bump `_journal.json` `when` past the future-dated entries)
  - [x] M45.2 `addWatch` accepts `dateUnknown`; persists flag; dedupe/result
        shapes unchanged
  - [x] M45.3 importer: `TvTimeWatchEvent.dateUnknown` set in `parse.ts`
        when the raw record has no usable timestamp; propagate through
        `resolve-watch.ts` + `routes/tvtime.ts` (incl. season-0 bulk marks)
        — resolve-watch.ts itself needed no change: `WatchResolveInput` is a
        position-only subset type that never carried date info.
  - [x] M45.4 tests: parse flag cases, addWatch persistence, zip round-trip
        extended (not weakened), import route wiring

- [x] **M46 core: date-independent aggregates (stats/ part 1)**
  - [x] M46.1 split `stats.ts` → `stats/` (index/totals) keeping `getStats`
        signature + existing fields byte-compatible
  - [x] M46.2 `seriesCount`, `favoritesCount`, `datedWatches`
  - [x] M46.3 `mostWatchedByTime` top 12 (E110)
  - [x] M46.4 `favoriteProgress` (E108) + `production` (E109)
  - [x] M46.5 `genreDistribution` + `networkDistribution` (E98)
  - [x] M46.6 `backlog` (E99) + `rewatchSummary` (E103)
  - [x] M46.7 unit tests per aggregate incl. empty-DB and no-genre/network
        items

- [x] **M47 core: timezone + time-bucketed aggregates (stats/ part 2)**
  - [x] M47.1 `buckets.ts`: Intl-based local day/hour/ISO-week helpers (E96,
        E104); unit tests on year boundaries (Dec 29–Jan 4) and DST zones
  - [x] M47.2 `recent` (E96) + `pace` (E100) + `upcoming` (E101)
  - [x] M47.3 `binges` (E102) + `streaks` incl. current-streak grace (E104)
  - [x] M47.4 `timeByYear` (E105) + `activityByDay` (E106) +
        `byWeekday`/`byHour` (E107)
  - [x] M47.5 tests: dateUnknown exclusion everywhere, tz-sensitivity
        (UTC vs Europe/Istanbul day flip), bucket thresholds

- [x] **M48 server: GET /api/stats?tz= (contract 008)**
  - [x] M48.1 zod `tz` param, Intl probe → UTC fallback (E96)
  - [x] M48.2 contract tests: new payload shape, invalid tz, empty DB,
        auth unchanged

- [ ] **M49 web: client + sections group 1**
  - [ ] M49.1 api client/types: extended `Stats`, send browser tz, query key
  - [ ] M49.2 primitives: `HBarList`, `StackedBar`, `MiniBars`, `StatTile`
        reuse (ui.md)
  - [ ] M49.3 hero + tiles + Son Dönem + En Çok İzlediklerim
  - [ ] M49.4 İzleme Durumu stacked bar + Favoriler grid + Prodüksiyon
        Durumu (15 + expand)
  - [ ] M49.5 i18n tr+en for group 1

- [ ] **M50 web: sections group 2**
  - [ ] M50.1 Tür + Network dağılımı
  - [ ] M50.2 Kalan Bölümler + Yakalama Hızı (hide on `pace: null`)
  - [ ] M50.3 Yaklaşan Bölümler + horizon caveat copy
  - [ ] M50.4 En Hızlı Binge'ler + Tekrar İzlemeler (keep E86 list) +
        Haftalık Seri
  - [ ] M50.5 i18n tr+en for group 2

- [ ] **M51 web: sections group 3 + polish**
  - [ ] M51.1 `YearSelect` + Haftalık/Aylık İzleme Süresi split panel
  - [ ] M51.2 `Heatmap` Yıllık Aktivite (Mon-first grid, 3 buckets, mobile
        scroll)
  - [ ] M51.3 Haftanın Günü + Günün Saati split
  - [ ] M51.4 footer caveat (dated/total, E95); drop legacy 12-month chart
        (E111); loading/empty states; a11y pass per ui.md
  - [ ] M51.5 i18n sweep tr+en; lint/typecheck clean

- [ ] **M52 browser checkpoint**
  - [ ] M52.1 extend MANUELTEST.md: re-import zip → footer counts; spot-check
        each section against `dashboard.html` values where the model matches
        (hero totals, favorites count, binge top row); tz sanity
        (Europe/Istanbul day boundaries) — foldable into the pending
        combined pass
