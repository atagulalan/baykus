# Tasks 006 — Design Conformance & UX Polish

Continues the numbering of tasks 001 (M0–M9), 002 (M10–M13), 003 (M14–M17),
004 (M18–M22) and 005 (M23–M27). Same rules (AGENTS.md § Execution
protocol): read the referenced spec sections BEFORE coding; a task is done
only when `pnpm lint && pnpm typecheck && pnpm test` is green; new UI
strings land in BOTH `tr.json` and `en.json` (none are expected — verify,
don't assume); check the box + one conventional commit per task; tests
never touch the network.

Reading map: every task reads `specs/006-design-conformance/spec.md`
§Edge-case decisions first, then ui.md's matching section. This spec is
**web-only** — if a task seems to need a core/server change, stop and
re-read; that's a signal the approach is wrong (or the spec needs a flagged
amendment, not silent divergence).

Restyle discipline (applies to M28, M29, M31, M33): className-level changes
only. Do not rearrange markup, rename props, or "fix" behavior in the same
commit — structural improvements get a `<!-- DECISION: flagged, not done -->`
note instead. This keeps diffs reviewable and MANUELTEST rows meaningful.

Order: M28 → M29 → M30 → M31 → M32 → M33 (M30/M31/M32 are mutually
independent, but M33's grep must run last).

---

## M28 — Modal E45 retrofit (E74)

Checkpoint goal: every dialog in the app is visually indistinguishable in
idiom from the FilterPanel bottom sheet.

- [x] M28.1 web: WatchDateDialog + ManualListPicker
  - **Files:** `apps/web/src/components/WatchDateDialog.tsx`,
    `apps/web/src/components/ManualListPicker.tsx`
  - **DoD:** ui.md §E45 overlay idiom applied exactly — container
    `bg-[#101010] border-white/10 shadow-2xl backdrop-blur-md`, no
    `rounded-*`; date input per input idiom; save = yellow primary,
    cancel = borderless secondary; ManualListPicker `<select>` per input
    idiom (native select stays — no custom listbox). Props, aria, dismiss
    wiring, ≥44px targets unchanged.
  - **Tests:** none beyond typecheck (presentational — 004 E51 precedent).
  - **Verify:** `pnpm dev` → mark an episode watched via the calendar/date
    flow; add a series from `/search` and see the restyled picker.

- [x] M28.2 web: DeleteAccountDialog + ResetLibraryDialog
  - **Files:** `apps/web/src/components/DeleteAccountDialog.tsx`,
    `apps/web/src/components/ResetLibraryDialog.tsx`
  - **DoD:** same idiom; confirm buttons keep `bg-red-600` (destructive
    semantics) in the primary shape; the type-to-confirm input per input
    idiom; the highlighted phrase block becomes `bg-white/5 font-mono`
    (sharp). Confirmation logic and disabled states untouched.
  - **Tests:** none beyond typecheck.
  - **Verify:** open both dialogs from Settings; cancel out (do NOT
    actually reset/delete against the real library).
  - <!-- DECISION: flagged, not done — ResetLibraryDialog's confirm
    phrase ("SİL") is interpolated as plain text inside the
    `settings.dangerZone.confirmLabel` i18n string
    (`Onaylamak için "{{phrase}}" yaz`), not a separate markup block.
    Making it a `bg-white/5 font-mono` highlighted block per the DoD
    requires either splitting the i18n key or introducing `<Trans>` —
    both structural/i18n changes outside M28's className-only scope.
    Left as plain interpolated text; needs an explicit call (spec
    amendment to drop the block requirement, or a follow-up task) before
    touching. -->

---

## M29 — Import wizard retrofit + lucide status icons (E75, E76)

Checkpoint goal: `/import` looks native to the app; zero unicode status
glyphs remain anywhere.

- [x] M29.1 web: ImportPage restyle + status icon map
  - **Files:** `apps/web/src/pages/ImportPage.tsx`
  - **DoD:** all four steps per ui.md §TVTime import wizard — dropzone,
    yellow primaries, `bg-white/10`/`bg-yellow` progress bars, hairline
    panels, mono column headings, E74-idiom candidate selects.
    `MATCH_STATUS_MARK` (string record) replaced by a lucide component
    map: `Check`/`CircleHelp`/`X`, `size={14}`, `aria-hidden`; colors
    matched `text-green-400` / fuzzy `text-yellow` / unmatched
    `text-muted`; the inline `✓ N` count uses the same `Check`. No
    behavior change — upload/confirm mutations, SSE handling, resolutions
    state byte-identical.
  - **Tests:** none beyond typecheck.
  - **Verify:** `pnpm dev` → walk upload → report → confirm against a
    fixture CSV (`fixtures/`) on a throwaway basis if feasible, or at
    minimum render the upload step and drag-over state;
    `grep -n "✓\|✗\|?" apps/web/src/pages/ImportPage.tsx` shows no icon
    usage (a literal `?` in code/ternaries is fine — the check is the
    rendered glyphs).

- [x] M29.2 web: ClaimPage glyph + emerald sweep
  - **Files:** `apps/web/src/pages/ClaimPage.tsx`, any file
    `grep -rln "emerald-" apps/web/src` still names
  - **DoD:** `⚠️` → `TriangleAlert size={32} text-yellow`;
    `grep -rn "emerald-" apps/web/src` → **zero hits** (E75's "emerald
    disappears entirely"); replacements follow E45 semantics (yellow
    accent, green only where E45 assigned green).
  - **Tests:** none beyond typecheck.
  - **Verify:** the grep, plus a render of `/claim` (bare-route page).

---

## M30 — Desktop search icon + page (E77)

Checkpoint goal: desktop search flows through `/search` exactly like
mobile; the dropdown is gone from the codebase.

- [x] M30.1 web: header icon + SearchBar deletion + desktop search layout
  - **Files:** `apps/web/src/components/Layout.tsx`,
    `apps/web/src/components/SearchBar.tsx` (delete),
    `apps/web/src/pages/SearchPage.tsx`
  - **DoD:** ui.md §App chrome — desktop header: wordmark left, nav
    cluster right ending in the `Search` icon-link (≥44px hit area,
    `aria-label` = `app.nav.search`, active-yellow on `/search`); center
    slot removed; `view-transition-name: app-header` stays on the header
    element. `SearchBar.tsx` deleted; confirm via grep that nothing
    imports it (SearchResultThumb/`useSeriesSearch` survive for
    SearchPage). SearchPage `sm+`: `mx-auto w-full max-w-xl` column;
    mobile rendering and all behavior unchanged.
  - **Tests:** none new (useSeriesSearch tests already cover the engine);
    typecheck proves the deletion left no dangling imports.
  - **Verify:** `pnpm dev` at desktop width → icon renders, navigates to
    `/search`, add flow works, icon highlights yellow while there; mobile
    tab bar unchanged.

---

## M31 — Calendar: header row + segmented switcher, mark-watched pin (E78, E81)

Checkpoint goal: Takvim opens with a standard title/switcher header row in
E45 style; checking a timeline episode keeps its row on screen; BUGÜN
anchor regression-free.

- [x] M31.1 web: ModeTabs → segmented control + page drift cleanup
  - **Files:** `apps/web/src/pages/CalendarPage.tsx`
  - **DoD:** ui.md §Calendar — one `justify-between` header row: title
    from `app.nav.calendar` (`font-display italic text-2xl`), segmented
    control right (`inline-flex border border-white/10`; segments mono
    uppercase `px-3 py-2`; active `bg-yellow text-[#080808]`;
    `aria-pressed`); `calendar.mode.*` keys reused. Same-pass cleanup:
    skeletons `bg-white/5` sharp, retry buttons secondary idiom,
    month-nav arrows `ChevronLeft`/`ChevronRight` if text glyphs, month
    label mono uppercase. Mode state/query logic and E73 anchor code
    untouched.
  - **Tests:** none beyond typecheck.
  - **Verify:** `pnpm dev` → open Takvim: row renders, both modes switch,
    BUGÜN still lands under the sticky app header (E73 spot check —
    the full matrix is M33's).

- [x] M31.2 web: timeline mark-watched persistence (E81)
  - **Files:** `apps/web/src/pages/CalendarPage.tsx`,
    `apps/web/src/components/CalendarEntryRow.tsx`
  - **DoD:** spec E81 exactly — CalendarPage `justWatched: Set<episodeId>`
    state; toggle-on = optimistic add + `addEpisodeWatch`, toggle-off =
    optimistic remove + `removeLatestEpisodeWatch`, error paths roll back
    the set and show the existing generic toast; success paths invalidate
    `["library"]` ONLY (the `["calendar"]` invalidation is removed from
    this mutation — that's the fix); `CalendarEntryRow` gains `watched:
    boolean` → `Checkbox checked={watched}` + `opacity-60` on the row
    content (not the checkbox); no layout/height change; timeline only,
    month views untouched; web-only (no core/server edits — if the
    approach seems to need one, re-read spec E81). Code comment explains
    why deleting the *latest* watch is safe here.
  - **Tests:** none beyond typecheck if the logic stays inline; if a
    toggle helper is extracted, a unit test mirroring `staleSweep.test.ts`
    style is welcome but not required.
  - **Verify:** `pnpm dev` → timeline: check an episode → row stays,
    checkbox filled, dimmed; uncheck → restored; navigate away and back →
    row gone (natural refetch); **net-zero trace** (end with the watch
    removed unless using a throwaway item).

---

## M32 — Favorites cap + `/user/$handle/favorites` (E79)

Checkpoint goal: rail caps at 6; overflow title-link opens a full grid
page that honors the E57 self-only matrix and the E72 back arrow.

- [x] M32.1 web: rail cap + favorites page + route + back fallback
  - **Files:** `apps/web/src/pages/ProfilePage.tsx`,
    `apps/web/src/pages/FavoritesPage.tsx` (new),
    `apps/web/src/router.tsx`, `apps/web/src/lib/backFallback.ts`,
    `apps/web/src/lib/backFallback.test.ts`
  - **DoD:** `PROFILE_FAVORITES_LIMIT = 6` constant; rail renders
    `slice(0, 6)`, order unchanged. Heading row: >6 → `Link` to
    `/user/$handle/favorites` with count + `ChevronRight`, ≥44px; ≤6 →
    plain heading (no link/chevron). New route registered beside the
    other profile subpages, ProfileGuard-wrapped; page = reused
    `profile.favorites.title` + count + all favorites in
    `SERIES_GRID_CLASSNAME` grid (SeriesCard, morph names intact);
    zero-favorites deep link → `profile.favorites.empty`. Data via the
    existing `listSeries({sort:"lastWatched"})` query, client-filtered.
    `backFallback` subpage regex → `(all-series|stats|favorites)`.
  - **Tests:** `backFallback.test.ts` gains the favorites rows (fallback
    → profile). If the >6-link predicate is extracted as a pure helper,
    mirror the FilterPanel active-dot test; otherwise presentational
    precedent applies. i18n parity stays green.
  - **Verify:** `pnpm test apps/web` · `pnpm dev`: with a test account or
    by temporarily hearting 7 items **and un-hearting them afterwards**
    (net-zero trace), click through rail → page → back arrow;
    `/user/bogus/favorites` renders not-found.

---

## M33 — Residual drift audit + browser checkpoint (E80)

Checkpoint goal: the grep output equals the exemption list; MANUELTEST
carries the browser rows for everything presentational in 006.

- [x] M33.1 web: token sweep
  - **Files:** whatever
    `grep -rn "zinc-\|emerald-\|rounded" apps/web/src --include="*.tsx"
    --include="*.ts" --include="*.css"` names after M28–M32
  - **DoD:** every hit converted to tokens or exempted below with a
    reason. Pre-approved exemptions (spec E80): `rounded-full` on the
    filter FAB (E70-normative), the avatar circle (E58), progress
    tracks/fills per M29's shipped treatment, active-dot indicators.
    Class strings only; structural changes flagged, not made. Record the
    final exemption list here:
    <!-- EXEMPTIONS (file:line — reason):
         apps/web/src/components/FilterPanel.tsx:160 — rounded-full on
           the mobile filter FAB; genuinely circular, E70-normative (005
           spec).
         apps/web/src/components/FilterPanel.tsx:166 — rounded-full on
           the active-filter red dot indicator; pre-approved exemption.
         apps/web/src/pages/ProfilePage.tsx:41 — rounded-full on the
           avatar placeholder circle; pre-approved exemption (E58).
         The DoD is grep == this list — verified: full-repo
         `grep -rn "zinc-\|emerald-\|rounded" apps/web/src --include="*.tsx"
         --include="*.ts" --include="*.css"` returns exactly these three
         lines, zero `zinc-`/`emerald-` hits anywhere. -->
  - **Tests:** full workspace gate green (`pnpm lint && pnpm typecheck &&
    pnpm test && pnpm build`); zip round-trip untouched (536 tests, all
    green). One post-sweep formatting pass (`biome format --write`) was
    needed on 6 files touched by the parallel M28–M33 work — no logic
    changed, whitespace/wrap only.
  - **Verify:** the grep, diffed against the recorded list — matches
    exactly.

- [x] M33.2 checkpoint: MANUELTEST §M33 + docs
  - **Files:** root `MANUELTEST.md` (append §M33), root `HANDOVER.md`,
    `README.md` (only if it mentions the inline desktop search),
    `specs/006-design-conformance/spec.md` (acceptance boxes)
  - **DoD:** §M33 lists the browser rows: all three dialogs + picker in
    E45 style; import wizard walk (upload/report/confirm/summary visuals
    + icon marks); desktop header icon + `/search` desktop layout + add
    flow; calendar row/switcher + E73 BUGÜN re-check; timeline check →
    row stays dimmed/checked, uncheck restores, re-entry drops it (E81);
    favorites 6-cap,
    7+ title-link, page grid, back arrow, foreign-handle 404; TR + EN
    pass. Fold a pointer into the pending combined pass (HANDOVER
    convention — one sitting with §M27's leftovers). Spec acceptance
    boxes updated to reflect automated-vs-browser split.
  - **Verify:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
    all green; git log shows one conventional commit per task.
