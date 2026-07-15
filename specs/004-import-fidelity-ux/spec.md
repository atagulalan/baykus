# Spec 004 — Import Fidelity, Aired-Only Progress & Navigation Polish

**Status:** Approved · **Owner:** xava · **Created:** 2026-07-16
**Scope:** Series (TV) module. Fixes two TV Time import-fidelity gaps found by
auditing the user's real GDPR export against the imported library, changes the
season-progress denominator from announced to aired episodes, adds
View-Transitions-based page animations (library poster → detail morph), and
makes series-detail URLs use the TMDB id (Serializd parity) with an
internal-id fallback and a refresh-time external-id backfill.

**Supersedes (in earlier specs):** 003 spec.md **E34**'s "total = announced,
not just aired" sentence and the frontier-bar denominator (replaced by E50
here — the segment *rendering* rules of E34 otherwise stand); 003
data-model.md §seasonProgress's "total counts announced episodes"; 001
tasks.md's "archived as paused" TV Time status mapping (replaced by E48).
Everything else in 001 + 002 + 003 stays normative (newest wins on overlap;
004 wins over all three).

## Summary

Every item from the 2026-07-16 `fikir.txt` is covered here — none dropped.
Three of its seven complaints turned out to be **already fixed or already
shipped** by 003's out-of-plan milestones (M17.11–M17.14) and are recorded as
verification-only rows rather than silently discarded: the watch-next
checkbox arriving pre-checked (E54 — root-caused to the old uncontrolled
native input, fixed by E45's controlled `Checkbox`), category-colored
progress bars (E55 — E45/M17.13's `categoryColors.ts` is exactly the
requested mapping), and hover-dependent buttons (E56 — E46/E47 removed them
all; a normative no-hover-required rule is added going forward).

The two import complaints were audited against the user's actual TV Time
GDPR export (281 followed-show rows) and the real imported library (277
items). **Neither is a matching bug.** "Troy: Street Magic", "Y Gwyll"
(= "Hinterland"), and "Gotham" are *relic follows*: rows with `active=0`
(unfollowed in TV Time, invisible in its own UI) and **zero watch events** —
e.g. the magic show "Troy" (tvdb 278460) was followed at 2019-02-16
21:35:13 and the intended "Troy: Fall of a City" (tvdb 327838) 24 seconds
later; TV Time kept the abandoned follow forever. E49 skips such relics.
"Suits" (tvdb 247808, 108 watches) exposes a genuine mapping gap: TV Time's
"stop watching" writes `archived=1` (`active` stays 1), which the importer
maps to `paused` → no manual list → the show lands in a computed category
instead of Bırakıldı. E48 remaps archived to stopped; the export has 48 such
shows, and the existing E26 post-import cleanup already keeps fully-watched
ended ones out of Bırakıldı (they stay Bitirildi).

The URL work rides on another audit finding: all 277 items were resolved via
TVmaze at import time (no TMDB key configured), so `items.tmdb_id` is NULL
across the board while `tvdb_id` coverage is 100%. TMDB ids therefore arrive
via a refresh-time fill (E53) that only works once a TMDB key is configured;
until an item has one, its URL falls back to the internal id (E52).

## Decisions locked in (from product Q&A, 2026-07-16)

| Topic | Decision |
|---|---|
| Unaired episodes in the segmented progress bar | **Excluded entirely** — season squares and the frontier bar count only aired episodes; seasons with zero aired episodes don't render at all. A caught-up series shows a completely filled bar. (Option "keep future seasons as hollow squares" was offered and declined.) |
| TV Time import fixes | **Both**: `archived=1 → stopped` (E48) *and* skip unfollowed zero-watch relics (E49). The user's existing library gets no migration — they will either hand-fix (remove 3 relics, move Suits to Bırakıldı) or danger-zone-wipe + re-import after the fix lands. |
| Page-transition scope | **Poster morph + cross-fade**: shared-element morph of the poster on library-card → detail navigation, subtle cross-fade on every other route change. View Transitions API; instant fallback on unsupporting browsers; `prefers-reduced-motion` always respected. |
| Series URL identity | **TMDB id, canonical** (`/series/94997`, Serializd parity — the user's explicit pick), with `i`-prefixed internal-id fallback (`/series/i965`) for items without a `tmdbId`, backfilled as refreshes run. TVDB (100% coverage today) and keep-internal were offered and declined. |

## User stories

### US-26: Trustworthy TV Time import
As a user, importing my TV Time export produces a library that matches what
TV Time's own UI showed me: shows I stopped watching land in Bırakıldı, and
abandoned relic follows I never watched don't appear at all — with the wizard
telling me what it skipped.

- Suits (archived=1, 108 watches) imports with `manual_list = stopped` (E48).
- Troy (the magic show), Gotham, Y Gwyll (active=0, zero watches) are not
  imported; the wizard reports them as skipped relics (E49).
- A fully-watched, ended, archived show still ends up Bitirildi, not
  Bırakıldı (existing E26 cleanup, re-asserted).

### US-27: Progress reflects aired reality
As a user, when I've watched everything that has actually aired, the progress
bar is full. Announced-but-unaired episodes and entirely-future seasons never
make my bar look incomplete (E50). Re:Zero at 77/77 watched/aired renders as
all-filled squares even though future episodes are announced.

### US-28: Fluid page transitions
As a user, navigating from the library to a series detail animates the poster
from the card into its place on the detail page; other page changes
cross-fade subtly. With reduced-motion set, everything is instant (E51).

### US-29: Provider-parity URLs
As a user, `/series/94997` shows the same series as
`serializd.com/show/94997`. Items that don't have a TMDB id yet use
`/series/i<internal>` and switch to the TMDB form automatically once a
refresh fills the id in (E52, E53).

## Functional requirements

- **FR-046** TV Time status mapping v2 (E48): `archived=1` (with `active=1`)
  parses as `dropped` (was `paused`); the `paused` member is removed from
  `TvTimeStatus` and from the route's status→manual-list map. E43's
  current-state-wins ordering is preserved: `active=0` checked first, then
  `archived=1`, then `for_later`.
- **FR-047** Relic skip (E49): shows with `active=0` **and** zero watch
  events (after parse-level dedupe/collapse) are excluded from matching and
  from the report; the import response carries an additive
  `skippedRelics: { name, tvdbId }[]` and the wizard surfaces it.
- **FR-048** `seasonProgress` counts aired episodes only (E50): per-season
  `watched`/`total` restricted to episodes with `air_date ≤ todayUtc()`;
  zero-aired seasons omitted; `sequential` computed over the aired-only
  list. Shape unchanged (no API/zip change) — values only.
- **FR-049** View transitions (E51): router-level cross-fade on route
  changes; shared-element poster morph between `SeriesCard` and the detail
  header via per-item `view-transition-name`; app chrome (header, tab bar)
  excluded from the fade; `prefers-reduced-motion: reduce` disables all of
  it; unsupporting browsers keep instant navigation.
- **FR-050** Canonical series URLs (E52): `SeriesSummary`/`SeriesDetail`
  gain `tmdbId: number | null` (additive); new endpoint
  `GET /api/library/series/by-tmdb/:tmdbId`; web links use the TMDB id when
  present, `i<internal>` otherwise; the detail page resolves bare numbers
  TMDB-first with internal fallback and canonicalizes the URL (replace) when
  a better form exists.
- **FR-051** Refresh fills missing external ids (E53): `refreshItem` merges
  `details.externalIds` into the item's null id columns — fill-only, never
  overwrite, unique-conflict-safe. With a TMDB key configured (TMDB is then
  `providers[0]`), a manual refresh-all backfills `tmdbId` across the
  library; without one, behavior is unchanged.
- **FR-052** *(verification only — no code change)* E54 (checkbox), E55
  (category colors), E56 (hover-free interactions) confirmed in the M22
  browser checkpoint; E56 additionally becomes a standing UI rule.

## Edge-case decisions (normative — do not re-decide these in code)

| # | Question | Decision |
|---|---|---|
| E48 | What does TV Time's `archived=1` mean? | "Stop watching" — confirmed against the real export: Suits, which the user stopped mid-run, carries `active=1, archived=1` and 110 watch rows. Mapping: `archived=1 → dropped → manual_list 'stopped'`. The `paused` member of `TvTimeStatus` (which mapped to no list) is **deleted**, not kept as an alias — nothing produces it anymore, and a dead enum member invites drift. Check order stays E43's: `active=0` first (unfollow beats archive), then `archived=1`, then `for_later` (only for still-actively-followed shows). Fully-watched *ended* archived shows are protected by the existing E26 post-import cleanup (stopped cleared where computed category = finished → they land Bitirildi); fully-watched *returning* archived shows keep `stopped` — the user explicitly stopped them, Bırakıldı is correct. Fixture note: the E43 parse test asserting `archived → paused` is **superseded**, not weakened — update its assertion to `dropped` and keep every other E43 assertion intact. |
| E49 | Which shows are "relics" and what happens to them? | A show is a relic iff **both**: its followed-file row has `active=0` (`TvTimeShow.unfollowed = true`; rows from fallback-shaped files without an `active` column are never marked unfollowed) **and** it has zero watch events for its tvdbId after parsing + duplicate-collapse of every watch file. Relics are dropped in `parseExport` *before* matching — no provider calls are spent on them, they never appear in matched/fuzzy/unmatched, and confirm can never import them. They are reported: parse result and the `POST /api/import/tvtime` `complete` payload gain `skippedRelics: { name: string; tvdbId: number }[]` (additive), and the wizard's report step lists them under a collapsed "n relics skipped" disclosure — the user must be able to see exactly what was left out (that opacity is this feature's whole point). `active=0` **with** watches is *not* a relic — the user genuinely watched then unfollowed; it keeps the existing `dropped → stopped` path. In the user's export: exactly 3 relics (Troy tvdb 278460, Gotham 274431, Y Gwyll 274775) out of 55 `active=0` rows. |
| E50 | Aired-only season progress details? | `getSeasonProgress` restricts every count to episodes with `air_date` non-null and `≤ todayUtc()` (E3 plain-date semantics, same rule the overall `progress.aired` already uses — E1/E4's "denominator is aired, not announced" now applies here too). `seasons` omits seasons with zero aired episodes entirely (an all-future season renders nothing — the "hollow future square" option was declined). `watched` counts aired episodes with ≥1 watch; a watch on an unaired episode (possible via edit-date) is ignored by both counts and by `sequential`, which is now the contiguous-prefix test over the (s,e)-ordered **aired** non-special list. Rendering rules of E34 are otherwise unchanged (≤12 seasons, frontier = first season with `watched < total`, fallback bar on non-sequential); a caught-up mid-season show now has no frontier and renders all-filled squares, exactly like a finished one — the category color (E55) is what distinguishes them. Interface shape, API contract, and zip format are untouched — this is a semantics-only change to computed values. |
| E51 | View-transition mechanics? | TanStack Router's built-in View Transitions support (`defaultViewTransition: true` on `createRouter` — verify the exact option name against the installed v1.128 API at implementation time; per-`navigate` `viewTransition: true` is the fallback wiring). Poster morph: the card poster *container* in `SeriesCard` and the detail-page poster container get inline `style={{ viewTransitionName: `poster-${item.internal id}` }}` — container not `<img>`, so the no-image placeholder morphs too; names are unique per item id, so only the clicked card pairs with the detail poster. Chrome stability: the sticky header gets `view-transition-name: app-header` and the mobile tab bar `app-tabbar` so they render as their own unchanged groups instead of participating in the root cross-fade. CSS (index.css): root cross-fade duration ~160ms; under `@media (prefers-reduced-motion: reduce)`, all `::view-transition-*` animations are set to `none`. No JS feature-detect needed — the router no-ops where `document.startViewTransition` is missing (Firefox <139 etc.). Scope is exactly the Q&A pick: card→detail poster morph + generic cross-fade; no calendar/watch-row shared elements, no list-entrance animations. |
| E52 | Series URL scheme? | Route stays `/series/$id`; the param is now interpreted: **bare number → TMDB id, `i`+number → internal id** (e.g. `/series/94997` vs `/series/i965`). Link generation: new helper `seriesParam(s: { id, tmdbId })` returns `String(tmdbId)` when non-null else `` `i${id}` ``; `SeriesCard` (has the summary) uses it; calendar/watch rows that only carry `itemId` link `i<id>` unconditionally — cheap, correct, and the detail page canonicalizes anyway. Detail resolution: `i`-prefix → existing internal endpoint; bare number → `GET /api/library/series/by-tmdb/:tmdbId` first, and on 404 fall back to the internal endpoint (pre-004 bookmarks were bare internal numbers). After loading, if the URL param ≠ the canonical form for the loaded item (`tmdbId` known but URL is internal/bare-internal), replace-navigate to canonical. Accepted edge: a pre-004 bare-number bookmark whose number collides with some *other* item's tmdbId resolves to that other item — rare, single-user, self-healing as canonical links take over; do not build disambiguation for it. All mutation endpoints keep internal ids (the detail response carries `id`); the API's `/api/library/series/:id` internal-id semantics are unchanged. |
| E53 | External-id backfill semantics? | `refreshItem`, inside its existing transaction, merges `details.externalIds` into the item row **fill-only**: each of `tmdb_id`/`tvmaze_id`/`imdb_id`/`tvdb_id` is written only when the item's column is NULL and the provider supplied a value; non-null columns are never overwritten (provider disagreement must not clobber identity). Uniqueness guard: before writing, any candidate value already held by a *different* item is silently dropped from the fill (the refresh itself still succeeds) — items.tmdb_id etc. are UNIQUE and a constraint abort would fail the whole refresh over a metadata nicety. No new endpoint, no background job (Article V): the fill rides the existing manual refresh; with a TMDB key set, TMDB is `providers[0]` (registry order) and one user-triggered refresh-all backfills `tmdbId` for the whole library; keyless instances simply never fill it and E52's fallback URLs remain. Zip already round-trips `externalIds` verbatim — no format change. |
| E54 | Watch-next checkbox arriving pre-checked? | *(verification-only)* Root cause found and already fixed: pre-E45 `WatchNextRow` used an **uncontrolled** native `<input type="checkbox">`, and the row is keyed by `series.id` — quick-marking swapped the summary to the next episode while React reused the same DOM input, carrying the browser's checked state onto the new episode. E45's `Checkbox` is fully controlled (`checked={false}` in this slot), which structurally removes the bug. No task, no code change; M22's checkpoint re-verifies the exact repro (series 2+ episodes behind → quick-mark → replacement row's checkbox must be unchecked). |
| E55 | Category-colored progress bars? | *(verification-only)* Already shipped exactly as requested by fikir.txt line 10: E45/M17.13's `lib/categoryColors.ts` maps stopped→red, finished→purple, up_to_date→green, everything else→yellow, and `SeriesCard`/detail header pass `series.category` into `SegmentedProgress`. No task; M22 confirms one series of each color in the browser. |
| E56 | Hover-dependent interactions? | E46/E47 already removed every hover-*gated* action (card hover buttons → detail "⋮" menu; episode "⋮" dropdown → checkbox modals); a repo grep confirms no `opacity-0`+`group-hover` reveal patterns remain. **New standing rule (normative for all future UI work):** no interaction may *require* hover — hover styling is allowed only as a redundant enhancement of an affordance that is fully visible and operable by touch/keyboard. M22's checkpoint includes a touch-viewport pass (DevTools mobile emulation) over library, detail, watch, calendar, settings asserting every action is reachable. |

## Non-goals

- Re-matching / re-linking an already-imported series to a different provider
  entry (the audit showed no actual mismatches — the "wrong matches" were
  relic follows; revisit only if a real mismatch ever surfaces).
- Migrating the user's existing library rows (relics + Suits are hand-fixable
  in the UI; danger-zone wipe + re-import is the clean path after M18).
- Making TVDB or IMDb ids routable (TMDB + internal fallback only; the
  URL param grammar deliberately leaves `i`/bare-number as the full space).
- Automatic/background tmdbId backfill (Article V — the fill rides manual
  refresh only).
- Shared-element transitions from calendar/watch rows, list-entrance
  animations (declined in Q&A; poster morph + cross-fade only).
- Per-window or per-category progress-bar behavior toggles.

## Acceptance checklist (definition of done for 004)

- [~] All FRs implemented; every E48–E53 decision has at least one test
      asserting it (E54–E56 are browser-checkpoint rows by design).
      <!-- E48/E49: packages/importer-tvtime/src/parse.test.ts (archived
      -> dropped remap, unfollowed flag, relic skip, unfollowed-with-
      watches kept, fallback-shape never unfollowed) + apps/server/src/
      routes/tvtime.test.ts (skippedRelics in matched/report/complete
      payloads and nowhere else, progress total excludes it, archived+
      watches -> manual_list 'stopped', E26 cleanup still clears a
      fully-watched ended archived show back to Bitirildi) (M18.1/M18.2).
      E50: packages/core/src/library/progress.test.ts "getSeasonProgress
      (E34/E50)" (wholly-unaired season omitted, caught-up-with-
      announced-future season reports watched==total, edit-date watch on
      an unaired episode excluded, zero-aired series -> seasons: []) +
      apps/web/src/components/SegmentedProgress.test.ts caught-up fixture
      (M19.1/M19.2). E52: core service.test.ts tmdbId null/non-null +
      apps/server/src/app.test.ts "GET .../by-tmdb/:tmdbId" (200 parity,
      404, 400) + apps/web/src/lib/seriesPath.test.ts (param grammar,
      canonical-replace no-loop predicate) (M20.2/M20.3). E53: core
      refresh/engine.test.ts "external id fill (E53)" (fills a NULL
      column, never overwrites non-null, drops a same-column conflict
      from a different item without failing the refresh) (M20.1). E51
      has no dedicated unit test — presentational (CSS + one router flag
      + inline `viewTransitionName`s), per M21.1's own DoD ("Tests: none
      beyond typecheck"). Marked partial rather than done because E51
      and E54–E56 rely on a human browser pass, not an automated
      assertion — see MANUELTEST.md §M22. -->
- [x] `pnpm lint && pnpm typecheck && pnpm test` green across the workspace.
      <!-- 54 test files, 484 tests, zero typecheck errors across all 10
      packages, confirmed after M21.1. -->
- [x] Zip round-trip test green and untouched (schemaVersion 3, Article III —
      nothing in 004 changes the zip format).
      <!-- packages/core/src/zip/roundtrip.test.ts unmodified, re-run
      green after every 004 task that touched packages/core. -->
- [x] Importer: a fixture modeled on the real export (Suits-like archived
      row, Troy/Gotham/Y Gwyll-like relic rows) produces: archived show →
      stopped; relics absent from report + present in `skippedRelics`;
      active=0-with-watches show still imported as stopped.
      <!-- parse.test.ts's Suits-shape/Troy-shape/Gotham-shape cases +
      tvtime.test.ts's combined archived-show-with-watches + relic
      fixture (M18.1/M18.2). -->
- [ ] Browser: re-import (or fixture walkthrough) shows the skipped-relics
      disclosure in the wizard.
      <!-- Wizard disclosure implemented (ImportPage.tsx, M18.2); the
      report-payload shape it renders from is fixture-tested end to end
      at the route level. Needs a human browser pass. See MANUELTEST.md
      §M22. -->
- [ ] Browser: Re:Zero-shaped series (all aired watched, future episodes
      announced) renders an all-filled segmented bar on card and detail.
      <!-- Pure logic unit-tested (progress.test.ts + SegmentedProgress.
      test.ts, M19.1/M19.2). Visual pass pending. See MANUELTEST.md §M22. -->
- [ ] Browser: library card → detail animates the poster (Chrome);
      reduced-motion renders instantly; Firefox <139 degrades to instant.
      <!-- Implemented (M21.1); needs a human browser pass across the
      Chrome/reduced-motion/Firefox matrix. See MANUELTEST.md §M22. -->
- [ ] Browser: a series with `tmdbId` opens at `/series/<tmdbId>` and the
      number matches `serializd.com/show/<same>`; an item without one opens
      at `/series/i<id>`; visiting the `i`-form of an item that has a tmdbId
      replace-redirects to the bare-number form.
      <!-- Server route + param grammar + canonical-replace unit-tested
      (M20.2/M20.3); mechanically verified via curl against the real dev
      library (by-tmdb 404/400/200 cases). Visual click-through pass
      pending. See MANUELTEST.md §M22. -->
- [ ] With a TMDB key set: refresh-all fills `tmdb_id` (spot-check via
      sqlite); URLs flip to TMDB form on next navigation.
      <!-- fillExternalIds unit-tested (engine.test.ts, M20.1); this dev
      environment has no TMDB key configured (library is 100% TVmaze-
      matched, per HANDOVER.md), so the end-to-end backfill needs a
      session with a real key. See MANUELTEST.md §M22. -->
- [ ] Browser (E54): quick-mark on a 2-behind series → replacement row's
      checkbox unchecked. (E55): one series each of red/purple/green/yellow
      bar. (E56): touch-viewport pass — every action reachable without hover.
      <!-- All three are verification-only per E54-E56 (no code change in
      004). See MANUELTEST.md §M22. -->
- [~] UI complete in TR and EN; i18n parity test green.
      <!-- apps/web/src/i18n/parity.test.ts green (importWizard.
      skippedRelics(+Hint) added to both catalogs, M18.2). Full visual TR/
      EN pass pending a browser session. See MANUELTEST.md §M22. -->
- [x] README feature list updated (TMDB-parity URLs, page transitions,
      import fidelity notes).
