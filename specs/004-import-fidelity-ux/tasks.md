# Tasks 004 — Import Fidelity, Aired-Only Progress & Navigation Polish

Continues the numbering of tasks 001 (M0–M9), 002 (M10–M13) and 003
(M14–M17). Same rules (AGENTS.md § Execution protocol): read the referenced
spec sections BEFORE coding; a task is done only when `pnpm lint && pnpm
typecheck && pnpm test` is green; new UI strings land in BOTH `tr.json` and
`en.json`; check the box + one conventional commit per task; tests never
touch the network (fixtures only).

Reading map for this spec: every task below reads
`specs/004-import-fidelity-ux/spec.md` §Edge-case decisions first; importer/
core tasks add data-model.md, server tasks add contracts/api.md, web tasks
add ui.md. 001+002+003 docs stay normative where 004 doesn't override them.

Every API change is additive — the app must stay runtime-working after every
task. The four milestones M18–M21 are independent; do them in the listed
order anyway (user-facing pain first).

Browser verification: no browser-automation tool is assumed. The checkpoint
task appends its manual steps to the root `MANUELTEST.md` (established 002
convention) and mechanically verifies everything else.

---

## M18 — TV Time import fidelity (E48 archived→stopped, E49 relic skip)

Checkpoint goal: a re-import of the real export puts Suits in Bırakıldı and
silently-but-visibly skips Troy/Gotham/Y Gwyll.

- [ ] M18.1 importer: archived remap + relic skip in the parse layer
  - **Files:** `packages/importer-tvtime/src/{parse.ts,parse.test.ts}`
    (+ `index.ts` if `TvTimeStatus`/parse-result types are re-exported —
    grep)
  - **DoD:** data-model 004 §Importer parse shapes exactly: `TvTimeStatus`
    loses `"paused"`; `TvTimeShow.unfollowed: boolean` (true iff the
    preferred-shape followed-file row has `active === "0"`; fallback-shape
    rows always false); status derivation order unchanged from E43 with
    `archived === "1"` now yielding `"dropped"`; `parseExport` result gains
    `skippedRelics: { name, tvdbId }[]` — shows with `unfollowed && zero
    surviving watch events` (count watches **after**
    `collapseDriftingDuplicates`, via one per-tvdbId count map) are removed
    from `shows` and listed there. `dedupeShows` keeps carrying the flag
    (first row wins, unchanged).
  - **Tests (parse.test.ts):** E43's `archived → paused` assertion updated
    to `dropped` (assertion only — the fixture and every other E43 case stay
    byte-identical); new: archived+active row (Suits-shape:
    `active=1,archived=1`) → status dropped, not skipped; unfollowed
    zero-watch row (Troy-shape) → absent from `shows`, present in
    `skippedRelics` with name+tvdbId; unfollowed row WITH watches → kept,
    status dropped, not in skippedRelics; fallback-shape file (no `active`
    column) → nothing marked unfollowed, nothing skipped; `for_later` on a
    still-followed show still → plan_to_watch (E43 order intact).
  - **Verify:** `pnpm test packages/importer-tvtime`

- [ ] M18.2 server+web: skippedRelics through the route into the wizard
  - **Files:** `apps/server/src/routes/{tvtime.ts,tvtime.test.ts}`,
    `apps/web/src/pages/ImportPage.tsx`, `apps/web/src/api/types.ts`,
    `apps/web/src/i18n/{tr,en}.json`
  - **DoD:** contracts 004 §TV Time import: the route's status→manual-list
    map drops the `paused` row (type now forbids it); the `complete` SSE
    payload gains `skippedRelics` straight from `parseExport` (NOT stored in
    the report — confirm unchanged). Web: report-step disclosure per ui.md
    §Import wizard (collapsed count line, names on expand, rendered only
    when non-empty); `import.skippedRelics(+Hint)` keys in both catalogs.
  - **Tests (tvtime.test.ts):** upload fixture containing an archived show
    with watches + an unfollowed zero-watch show → `complete` payload:
    archived show in matched (and, after confirm, its item has
    `manual_list = 'stopped'` — extend the existing confirm test),
    relic in `skippedRelics` and nowhere else, `progress` events' `total`
    excludes it; existing E26-cleanup test still green (fully-watched ended
    archived show ends finished — add the assertion if no test covers it).
  - **Verify:** `pnpm test apps/server` · i18n parity green

---

## M19 — Aired-only season progress (E50)

Checkpoint goal: a Re:Zero-shaped series (77/77 aired watched, future
episodes announced) renders an all-filled segmented bar on card and detail.

- [ ] M19.1 core: `getSeasonProgress` counts aired only
  - **Files:** `packages/core/src/library/{progress.ts,progress.test.ts}`
  - **DoD:** data-model 004 §seasonProgress: all counts restricted to
    episodes with non-null `air_date ≤ todayUtc()` (same plain-date compare
    `getProgress` already uses); zero-aired seasons omitted from `seasons`;
    watches on unaired episodes ignored by `watched` AND by `sequential`,
    which now runs over the (s,e)-ordered aired non-special list. Keep the
    single-scan implementation (plan.md §Progress notes).
  - **Tests (progress.test.ts):** caught-up series with announced future
    episodes in the frontier season → that season reports
    `watched == total`; a wholly-future season → omitted; watch on an
    unaired episode (edit-date scenario) → excluded from watched/total and
    doesn't break `sequential`; existing announced-based expectations
    updated to aired-based (assertion values only — scenarios stay);
    zero-aired series → `seasons: []`.
  - **Verify:** `pnpm test packages/core -- progress`

- [ ] M19.2 web: pin the caught-up rendering
  - **Files:** `apps/web/src/components/SegmentedProgress.test.ts`
  - **DoD:** no component change expected (plan.md §Progress notes — the
    all-filled branch already exists). Add the regression fixture: every
    season `watched == total` → all `filled` segments, no `frontier`.
    If the helper DOES need a change to satisfy that fixture, stop and
    re-read E50 before touching it.
  - **Tests:** the new fixture; existing cases untouched.
  - **Verify:** `pnpm test apps/web`

---

## M20 — TMDB ids: exposure, lookup, canonical URLs, refresh backfill
(E52, E53)

Checkpoint goal: `/series/94997` opens the same show Serializd shows at
`/show/94997`; items without a tmdbId use `/series/i<id>` and flip to the
TMDB form after a keyed refresh.

- [ ] M20.1 core: `SeriesSummary.tmdbId` + refresh external-id fill
  - **Files:** `packages/core/src/library/{service.ts,types.ts,
    service.test.ts}`, `packages/core/src/refresh/{engine.ts,engine.test.ts}`
  - **DoD:** `SeriesSummary.tmdbId: number | null` read off the existing
    base items select (no extra query; detail inherits). `refreshItem`
    merges `details.externalIds` per data-model 004 §items: fill-only into
    NULL columns, inside the existing UPDATE/transaction, with a
    per-candidate same-column-different-item pre-check that silently drops
    conflicting values (refresh still succeeds).
  - **Tests:** summary carries tmdbId (null and non-null); refresh with a
    fake provider returning `{ tmdbId }` fills a NULL column; a non-null
    `tvdbId` is NOT overwritten by a disagreeing provider value; two items
    where the provider reports the same tmdbId for the second → second
    refresh succeeds, column stays NULL; zip round-trip stays green
    untouched (Article III — run it, don't modify it).
  - **Verify:** `pnpm test packages/core`

- [ ] M20.2 server: `GET /api/library/series/by-tmdb/:tmdbId`
  - **Files:** `apps/server/src/routes/{library.ts,library.test.ts}`
  - **DoD:** contracts 004 §by-tmdb: zod positive-int param; item-id lookup
    by `items.tmdb_id` delegating to the same SeriesDetail builder as the
    internal route; 404 `NOT_FOUND` on miss; auth requirements identical to
    the sibling route.
  - **Tests:** 200 with identical body to the internal-id fetch of the same
    item; 404 unknown tmdbId; 400 on `abc` / `-1`; auth-gated like the
    sibling (mirror whatever the existing detail-route tests assert).
  - **Verify:** `pnpm test apps/server`

- [ ] M20.3 web: param grammar, links, detail resolution, canonicalize
  - **Files:** `apps/web/src/lib/{seriesPath.ts,seriesPath.test.ts}` (new),
    `apps/web/src/api/{types.ts,client.ts}`,
    `apps/web/src/components/{SeriesCard,CalendarEntryRow,MonthGrid,
    WatchNextRow}.tsx`, `apps/web/src/pages/SeriesDetailPage.tsx`
  - **DoD:** ui.md §SeriesCard/§Series detail: `seriesParam` +
    `parseSeriesParam` per data-model 004 §URL grammar; `SeriesCard` links
    via `seriesParam(series)`; itemId-only link sites use `i<id>` (grep
    `to="/series/$id"` for the full list); `getSeriesByTmdb` client fn;
    detail page resolves bare-number → by-tmdb → 404-fallback internal,
    `i`-prefix → internal, one query keyed by the raw param; canonical
    replace-navigate only when `seriesParam(detail) !== param`. Mutations
    keep using `detail.id` (internal) — no other call sites change.
  - **Tests (seriesPath.test.ts):** `seriesParam` with/without tmdbId;
    `parseSeriesParam` on `"94997"`, `"i965"`, junk (`"i"`, `"0x1"`, `""` →
    whatever the page treats as not-found — pin it); canonical-replace
    predicate (param equality) covered so the no-loop guard is asserted.
  - **Verify:** `pnpm test apps/web && pnpm build` · mechanical: `pnpm dev`,
    curl the by-tmdb endpoint, click through card → detail → URL shows
    `i<id>` (keyless dev library), reload works, no redirect loop in the
    network log.

---

## M21 — View transitions (E51)

Checkpoint goal: library card → detail morphs the poster in Chrome; instant
under reduced-motion; Firefox <139 just navigates.

- [ ] M21.1 web: router transitions + poster morph + chrome opt-out
  - **Files:** `apps/web/src/router.tsx`, `apps/web/src/index.css`,
    `apps/web/src/components/{SeriesCard,Layout}.tsx`,
    `apps/web/src/pages/SeriesDetailPage.tsx`
  - **DoD:** ui.md §Page transitions: `defaultViewTransition: true` (verify
    the option name on the installed @tanstack/react-router 1.128 — plan.md
    §View-transition notes has the fallback wiring; do NOT hand-roll
    `startViewTransition`); `poster-${item.id}` names on the poster
    containers (card + detail — internal id, never tmdbId); `app-header`/
    `app-tabbar` names on the chrome; ~160ms root fade + reduced-motion
    kill-switch CSS.
  - **Tests:** none beyond typecheck — presentational (CSS + one router
    flag + inline styles). The behavior matrix is M22's browser material.
  - **Verify:** `pnpm lint && pnpm typecheck && pnpm build` green;
    `pnpm dev` + navigate with Chrome devtools "Emulate prefers-reduced-
    motion" toggled both ways if a browser is available, else note it for
    M22.

---

## M22 — CHECKPOINT 004 + docs

- [ ] M22.1 CHECKPOINT: MANUELTEST section + acceptance walk + README
  - **Files:** root `MANUELTEST.md`, `README.md`,
    `specs/004-import-fidelity-ux/spec.md` (checklist boxes)
  - **DoD:** append an "M22" section to `MANUELTEST.md` covering, in both
    locales: the import-wizard relic disclosure (fixture or real re-import);
    Suits-shape archived import landing in Bırakıldı; Re:Zero all-filled
    bar on card + detail; poster morph / cross-fade / reduced-motion /
    Firefox matrix; `/series/<tmdbId>` ↔ Serializd number parity,
    `i<id>` fallback, canonical replace (no loop); E54 checkbox repro
    (2-behind quick-mark → replacement row unchecked); E55 one series per
    bar color; E56 touch-viewport action-reachability pass. Walk spec.md
    §Acceptance checklist, check every box that has an automated assertion,
    leave browser-only boxes for the human pass (003's `[~]`/comment
    convention). README gains: TMDB-parity URLs, page transitions, import
    fidelity (archived→stopped, relic skip). Mechanical verification where
    no browser is available: curl by-tmdb + import fixture run + sqlite
    spot-checks, recorded in the commit message.
  - **Verify:** full gate `pnpm lint && pnpm typecheck && pnpm test &&
    pnpm build`; MANUELTEST section complete; boxes checked.
  <!-- NOTE: the user's own library cleanup (delete the 3 relic items, move
  Suits to Bırakıldı — or danger-zone wipe + re-import) is a user action,
  not a task; offer it in the session summary when M18 ships. -->
