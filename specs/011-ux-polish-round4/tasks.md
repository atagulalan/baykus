# Tasks 011 — UX Polish Round 4

Continues M62+. Same rules as AGENTS.md § Execution protocol. Read
`specs/011-ux-polish-round4/spec.md` §Edge-case decisions before coding.
M62 and M63 are **parallel-safe** — do not cross owns.

---

## M62 — Episode / detail (E149–E152) — Track A

Checkpoint goal: spoiler posters sharp; rating prompt gated; TBD mark;
Next Up is a single card.

- [x] M62.1 web: `unairedTrailingState` helper (E151)
  - **Files:** `apps/web/src/lib/airDateLabel.ts`,
    `apps/web/src/lib/airDateLabel.test.ts`
  - **DoD:** `unairedTrailingState(airDate, today?)` returns
    `{ kind: "countdown"; days: number } | { kind: "tbd" } | { kind: "none" }`
    — future → countdown, null → tbd, aired/today → none.
  - **Tests:** null → tbd; future → countdown days; today/past → none.
  - **Verify:** `pnpm test apps/web -- airDateLabel`

- [x] M62.2 web: EpisodeRow spoiler poster + TBD (E149 / E151)
  - **Files:** `apps/web/src/components/EpisodeRow.tsx`,
    `apps/web/src/i18n/{tr,en}.json`
  - **DoD:** Series-chrome poster never blurs under `hideSpoilers`. Null
    airDate shows trailing `t("episode.tbd")` instead of checkbox;
    future keeps countdown. i18n: TR `"TBD"` / EN `"TBD"`.
  - **Tests:** none beyond typecheck (presentation).
  - **Verify:** `pnpm typecheck`

- [x] M62.3 web: skip rating prompt when already rated (E150)
  - **Files:** `apps/web/src/pages/SeriesDetailPage.tsx`,
    optional `apps/web/src/lib/shouldPromptEpisodeRating.ts` (+ test)
  - **DoD:** `toggleWatch` / `watchAgain` `onSuccess` only call
    `setPromptEpisodeId` when episode `myRating == null`.
  - **Tests:** helper unit test if extracted.
  - **Verify:** `pnpm typecheck && pnpm test apps/web`

- [x] M62.4 web: NextUpCard replaces carousel (E152)
  - **Files:** `apps/web/src/components/NextUpCard.tsx` (new),
    `apps/web/src/pages/SeriesDetailPage.tsx`,
    delete `NextEpisodeCarousel.tsx`,
    `apps/web/src/i18n/{tr,en}.json` (settings label rename),
    `apps/web/src/pages/SettingsPage.tsx` only if label keys change
    (prefer key-value rename in i18n only — Track A owns Next Up copy;
    SettingsPage markup stays Track B)
  - **DoD:** Single bordered card for `nextUnwatched`; same episode
    handlers as SeasonSection; uiPrefs key unchanged; carousel file gone.
  - **Tests:** none beyond typecheck; `uiPrefs` tests stay green.
  - **Verify:** `pnpm typecheck && pnpm test apps/web -- uiPrefs`

---

## M63 — Profile / settings (E153) — Track B

Checkpoint goal: profile order stats → favorites → all series; Refresh
all under Settings → Data.

- [x] M63.1 web: ProfilePage reorder + remove chrome (E153)
  - **Files:** `apps/web/src/pages/ProfilePage.tsx`
  - **DoD:** banner → identity → stat tiles → favorites → all series.
    Remove Detailed stats / Settings link rows and Refresh all button;
    drop unused sweep imports/hooks.
  - **Tests:** none beyond typecheck.
  - **Verify:** `pnpm typecheck`

- [x] M63.2 web: Refresh all in Settings → Data (E153)
  - **Files:** `apps/web/src/pages/SettingsPage.tsx`
  - **DoD:** Data section gains Refresh all button wired to
    `startManualSweep` with progress + existing toast keys.
  - **Tests:** none beyond typecheck; `staleSweep` tests stay green.
  - **Verify:** `pnpm typecheck && pnpm test apps/web -- staleSweep`

---

## M64 — Suite + browser verify

- [x] M64.1 full suite + verify skill
  - **DoD:** `pnpm lint && pnpm typecheck && pnpm test` green.
    Headless verify: spoiler poster sharp; rated rewatch no popup; TBD;
    Next Up card; profile order; Settings Data refresh.
  - **Verify:** verify skill + suite

---

## M65 — Search keyboard (E154)

Checkpoint goal: `/search` results operable via ↓/↑ / Enter / Shift+Enter.

- [x] M65.1 web: search result path + active-index helpers (E154)
  - **Files:** `apps/web/src/lib/searchResultPath.ts` (new),
    `apps/web/src/lib/searchListKeyboard.ts` (new),
    matching `*.test.ts`
  - **DoD:** `searchResultPath(result)` → `/series/i{id}` or
    `/series/new?…` (external ids as query). `nextSearchActiveIndex`
    implements ↓/↑ clamp rules from E154 (including −1 = none).
  - **Tests:** library vs preview paths; arrow edges; empty list → −1.
  - **Verify:** `pnpm test apps/web -- searchResultPath searchListKeyboard`

- [x] M65.2 web: SearchPage combobox wiring (E154)
  - **Files:** `apps/web/src/pages/SearchPage.tsx`
  - **DoD:** Input is combobox with `aria-activedescendant`; list/options
    roles; ↓/↑/Enter/Shift+Enter/Escape per E154; same-tab open keeps
    View Transitions; Shift+Enter uses `window.open(…, "_blank",
    "noopener,noreferrer")`; highlight resets when `results` identity
    changes. No new i18n keys.
  - **Tests:** none beyond typecheck (helpers cover key math).
  - **Verify:** `pnpm typecheck`

---

## M66 — Browse view control placement (E155)

- [x] M66.1 web: move browse controls into both page headings
  - **Files:** `apps/web/src/components/Layout.tsx`,
    `apps/web/src/pages/WatchPage.tsx`,
    `apps/web/src/pages/LibraryPage.tsx`
  - **DoD:** On `/watch` and `/`, the destination-view toggle sits right-aligned
    in the page heading (History icon removed — E160). Watch shows grid;
    Library shows list. The mobile app header keeps a centering spacer instead
    of rendering a duplicate toggle. Existing persistence and `/watch` ↔ `/`
    navigation remain unchanged.
  - **Tests:** none beyond typecheck (presentation).
  - **Verify:** `pnpm typecheck`

---

## M67 — Pull-to-history on Library / Watch (E160)

- [x] M67.1 web: history variant on browse pulls; keep refresh elsewhere
  - **Files:** `apps/web/src/components/PullToRefresh.tsx`,
    `apps/web/src/pages/LibraryPage.tsx`,
    `apps/web/src/pages/WatchPage.tsx`
  - **DoD:** `/` and `/watch` use `PullToRefresh variant="history"` → navigate
    to `/watch/history` past threshold (History indicator). Remove History
    heading buttons. Calendar / all-series / favorites / watch-history keep
    default refresh variant + `useLibrarySweepRefresh`.
  - **Tests:** none beyond typecheck (gesture is touch-only).
  - **Verify:** `pnpm typecheck`
