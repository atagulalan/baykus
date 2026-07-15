# Spec 003 — Dynamic Watching Signals & UI Polish

**Status:** Approved · **Owner:** xava · **Created:** 2026-07-15
**Scope:** Series (TV) module. Extends the computed-category engine of spec 002
with two new "İzleniyor" signals (new-episode lift, newly-added lift) behind a
configurable window, and ships a batch of UX improvements: season-segmented
progress bars, posters in the calendar, sticky/mobile navigation, series-detail
polish, a unified watch page, a push test button, and a filter-reset fix.

**Supersedes (in spec 002):** the fixed 30-day window (E17 and the "Recently"
row of 002's decisions table), E16's rungs 3–7 (replaced by E30 here),
002 ui.md's "RESET = Tümü + Son eklenen" rule, 002 ui.md §Watch page's
history-list rendering, 002 contracts' "freshly added series lands in
`not_started`" note, and 002's non-goal "Configurable window length". Spec 002
carries inline `SUPERSEDED by 003` markers at each affected spot. Everything
else in 001 + 002 stays normative (002 still wins over 001 on overlap; 003
wins over both).

## Summary

Spec 002 made categories a pure function of watch history — but "İzleniyor"
only reacts to *my* watching. Two real-world signals are missing: a dormant
show airing a new episode (House of the Dragon returns after 1.5 years —
it should surface immediately, not sit in "Bir süredir izlenmedi"), and a
series I just added from search (I added it because I intend to watch it now).
Spec 003 adds both signals to the category engine, still computed on read
(Article V intact), with the window length finally configurable. The rest of
the spec is UI polish captured from product notes: every item from the
2026-07-15 `fikir.txt` is covered here — none dropped (the browser-cache
question turned out to be already implemented; see E40).

## Decisions locked in (from product Q&A, 2026-07-15)

| Topic | Decision |
|---|---|
| Zero-watch series after the window | Falls to **`not_started`** (not `not_watched_recently`). The category keeps its "backlog shelf" meaning; `not_watched_recently` stays reserved for started-then-stalled shows. |
| Window setting granularity | **One setting** — `watching_window_days` (default 30) governs all three windows: watch recency (E17), new-episode lift, newly-added lift. |
| Which adds get the newly-added lift | **Manual adds only** (search bar). Requires a new `items.added_via` column + zip schemaVersion 3 (v1/v2 still importable). TV Time / zip imports never flood İzleniyor. |
| Icon source | **lucide-react** (MIT, tree-shakeable). FontAwesome is explicitly banned. |

## User stories

### US-18: İzleniyor follows real activity
As a user, a series enters the İzleniyor category when something real happens
— I watch it, a new episode airs on a show I've started, or I just added it —
and leaves after a quiet window, all without background jobs.

- A series I've watched before whose newest episode aired within the window
  shows as `watching`, even if my last watch is years old (E30 rung 6, E33).
- A series I added manually within the window shows as `watching` even with
  zero watches; if the window passes with no watch it falls to `not_started`
  (E30 rung 3).
- Import-created series (TV Time, zip) never get the newly-added lift (E32).
- All windows use the single configurable length (E31).

### US-19: Configurable watching window
As a user, I can change the "1 month" window from settings (days, default 30).
Changing it takes effect on the next read — no job, no migration.

### US-20: Season-segmented progress bar
As a user, the progress bar under a series shows my position by season:
fully-watched seasons as filled squares, the season I'm in as a mini bar,
remaining seasons as hollow squares (`◼◼◼[▰▰▰▱▱]◻◻`). If I've skipped
around (any gap), it falls back to the plain percentage bar (E34).

### US-21: Calendar with posters
As a user, calendar entries (timeline rows, month cells, mobile month list)
show the series poster (E35). Today stays highlighted (already shipped in 002
+ the 2026-07-15 local-date fix; re-verified here).

### US-22: Sticky header & mobile bottom nav
As a user, the top bar (logo + search) sticks to the top while scrolling; on
mobile the nav links move to a fixed bottom tab bar with icons (E36).

### US-23: Series detail polish
As a user, on the series detail page the Specials season section sits at the
bottom, and the poster renders uncropped (E37).

### US-24: Unified watch page
As a user, the watch page's history uses the same visual rows as the other
sections (poster, title, SxEy, tags) instead of a boxed text list, the full
history renders on the page itself, and the page opens scrolled to "Sıradaki
bölümler" — like the timeline's today anchor (E38).

### US-25: Test notification
As a user, I can send myself a sample push notification from settings to
confirm the pipeline works on this device (E39).

## Functional requirements

- **FR-029** Category engine v2 per E30/E33: two new `watching` predicates
  (newly-added lift, new-episode lift), window length read from settings.
  Still computed on read, still batch (one grouped query per aggregate).
- **FR-030** `watchingWindowDays` on GET/PATCH `/api/settings` (E31): integer
  1–365, default 30, zod-validated at the route.
- **FR-031** `items.added_via` (E32): migration 0002 with backfill heuristic;
  `addSeries` takes `addedVia` (default `manual`); TV Time import passes
  `import:tvtime`; zip export/import at schemaVersion **3** carrying
  `addedVia` (v1 and v2 still importable). Round-trip invariant unchanged
  (Article III).
- **FR-032** `seasonProgress` on series summaries and detail (E34); web
  renders the segmented bar on SeriesCard and the detail header, with the
  fallback rules of E34.
- **FR-033** Calendar timeline rows, month cells, and the mobile month list
  render poster thumbnails (E35). No API change (`posterRef` already served).
- **FR-034** Sticky header on all viewports; on `<sm` the nav renders as a
  fixed bottom tab bar with lucide-react icons + labels (E36).
- **FR-035** Series detail: Specials season section ordered last; poster
  uncropped (E37).
- **FR-036** Watch page unification (E38): history entries gain `airDate` +
  `episodeType` (additive API change), history rows use the shared row
  component, no inner scroll container, auto-scroll to the watch-next section.
- **FR-037** `POST /api/push/test` sends a sample notification to exactly the
  requesting device's subscription (E39); settings gains a test button.
- **FR-038** Library filter RESET returns the draft to the page defaults —
  sort `lastWatched`, category `all` (E41). Fixes the reported bug.
- **FR-039** *(verification only)* Series images are browser-cacheable: the
  `/img` route already serves `Cache-Control: public, max-age=31536000,
  immutable` and `img.test.ts` already asserts it (E40). No code change;
  keep the test green.
- **FR-040** `DELETE /api/library` (E42): irreversibly deletes every row in
  the library — items (cascades tracking/seasons/episodes/watches),
  ratings, settings, push subscriptions, refresh log. Strict body
  `{ confirm: "DELETE" }`. Settings gains a "Danger zone" section with a
  type-to-confirm dialog (mirrors `DeleteAccountDialog`'s export-first
  pattern, but no password — single mode has none).
- **FR-041** TV Time parser correctness fixes against real GDPR exports
  (E43): `for_later` status only applies when the show is still actively
  followed (active/archived checked first); `collapseDriftingDuplicates`
  keeps a within-window duplicate's season/episode numbers instead of
  silently dropping them depending on file iteration order.
- **FR-042** `POST /api/import/tvtime` streams matching-phase progress over
  SSE (E44), same pattern as `/confirm`: one `progress` event per show as it
  resolves, then a trailing `complete` event carrying the existing report
  shape. Import wizard shows a live per-show log + progress bar while
  uploading.
- **FR-043** Brand refresh (E45): new dark design system (void/snow/muted/
  yellow palette, DM Serif Display + DM Sans + JetBrains Mono, lucide-react
  icons replacing emoji throughout) applied across the web app; new shared
  `Checkbox` primitive. Visual only — no behavior change beyond what E46/E47
  call out separately.
- **FR-044** Series-level actions consolidated (E46): `SeriesCard` drops its
  hover actions (remove/refresh/move-to-list); those + mute/unmute now live
  in a single "⋮" menu on the series detail page header. Library grid card
  is now a pure link + progress display.
- **FR-045** Episode watch-action redesign (E47): the episode row's "⋮"
  dropdown is replaced by checkbox-driven modals — marking an unwatched
  episode that has unwatched episodes before it prompts "mark up to here or
  just this one"; unmarking a watched episode opens a "watch again / edit
  date / mark as unwatched" sheet. A season section auto-collapses once
  complete and swaps its "mark all watched" button for a checkbox.

## Edge-case decisions (normative — do not re-decide these in code)

| # | Question | Decision |
|---|---|---|
| E30 | Category precedence v2? | First match wins (replaces E16 rungs 3–7; display order unchanged): **1)** `manual_list = watch_later` → watch_later **2)** `manual_list = stopped` → stopped **3)** zero watch events on non-special episodes: **3a)** `added_via = 'manual'` AND `added_at ≥ nowUtc − W days` → **watching**, **3b)** else → not_started **4)** aired non-special count > 0 AND every aired non-special episode watched AND `releaseStatus` ∉ {returning, in_production} → finished **5)** same but `releaseStatus` ∈ {returning, in_production} → up_to_date **6)** newest non-special watch ≥ nowUtc − W **OR** `newestAiredAt ≥ today − W` → **watching** **7)** else → not_watched_recently. W = the E31 setting. |
| E31 | Window setting details? | Settings key `watching_window_days`, integer days as string in the settings table, default **30**, valid range 1–365 (route rejects otherwise with 400). One value governs all three windows (E30 rungs 3a and 6, both operands of rung 6). Changing it takes effect on the next read. It flows through zip settings.json like every other key (`ZipSettings` is a verbatim mirror — no format change). |
| E32 | `added_via` semantics? | New column `items.added_via` TEXT NOT NULL DEFAULT `'manual'`, values `'manual' \| 'import:tvtime' \| 'import:zip'` (type `AddedVia`). `addSeries` defaults to `manual`; the TV Time confirm path passes `import:tvtime`. Zip v3 items carry `addedVia` and import restores it verbatim; **v1/v2 zips default to `import:zip`** (prevents an İzleniyor flood right after a library migration; the rare "manually added yesterday, then migrated" case degrades to not_started, which is harmless). Migration 0002 backfill: default everything to `'manual'`, then set `'import:zip'` where the item has ≥1 watch with source `import:zip`, then `'import:tvtime'` where it has ≥1 watch with source `import:tvtime` (tvtime wins when both exist). Zero-watch imported items stay `'manual'` — undetectable, accepted (their `added_at` is usually outside the window anyway). On zip merge, `addedVia` follows the same rule item-level fields like `addedAt` already follow (001 data-model §Merge governs). |
| E33 | New-episode lift details? | `newestAiredAt` = max `air_date` over **non-special** episodes with `air_date ≤ todayUtc()` (E1/E3 semantics, plain-date compare). Rung 6's second operand compares `newestAiredAt ≥ today − W days` as plain dates. The lift only reaches items with ≥1 non-special watch — zero-watch items exit at rung 3, so a never-started series does **not** jump to watching when a new episode airs. `releaseStatus` is irrelevant to the lift (rungs 4/5 already exited caught-up items). Boundary: exactly `today − W` is included (≥). |
| E34 | Segmented progress bar? | New summary field `seasonProgress: { seasons: [{ number, watched, total }], sequential: boolean }` — non-special seasons with ≥1 episode, ordered by number; `watched`/`total` count that season's episodes (total = announced, not just aired). `sequential` = the watched set forms a contiguous prefix of the (s,e)-ordered non-special episode list (no watched episode after the first unwatched one). Rendering: if `sequential` AND 1 ≤ season count ≤ **12**: seasons with `watched == total` before the frontier → filled square; the frontier season (first with `watched < total`) → mini progress bar filled `watched/total`; seasons after the frontier → hollow square; all seasons full → all filled squares. Otherwise (non-sequential, 0 or >12 seasons) → the existing single percentage bar (watched/aired overall). Applies to SeriesCard and the detail header. |
| E35 | Calendar images? | Series poster (`posterRef`, thumb size — the same `/img` size WatchNextRow uses). Timeline rows: 40×56px thumb (`h-14 w-10`) left of the text. Month desktop cells: a small poster (~24px wide, 2/3 aspect) beside the compact text; `+n` overflow unchanged. Month mobile list: timeline-style rows with thumbs. Missing poster → placeholder block (card pattern), never a broken image. No API change. |
| E36 | Sticky header & mobile nav? | Header wrapper becomes `sticky top-0 z-40` with an opaque background + existing bottom border, all viewports. Desktop (`sm+`): nav links stay in the header as today. Mobile (`<sm`): nav links leave the header; a fixed bottom tab bar renders the 5 nav items as lucide-react icons with ~10px labels underneath, active route emphasized; `<main>` gets bottom padding ≥ the bar height; the bar respects `env(safe-area-inset-bottom)`. Icons: Kütüphane `LayoutGrid`, İzleme `Play`, Takvim `CalendarDays`, İstatistik `ChartColumn`, Ayarlar `Settings`. **Never FontAwesome.** Labels reuse the existing `app.nav.*` keys. |
| E37 | Detail polish? | (a) Season sections: numeric seasons ascending, season 0 (Specials) rendered **last** — a presentation concern, sorted client-side in SeriesDetailPage (core/zip season ordering untouched). (b) Poster: remove the `aspect-[2/3]` + `object-cover` crop; render at `w-40` with natural height (`h-auto`) so non-2:3 posters (e.g. TVmaze) show fully; the no-image placeholder keeps the 2/3 aspect box. |
| E38 | Watch page unification? | History rows render with the same visual row component as watch-next: poster thumb, title, SxEy, episode title, EpisodeTags — with the checkbox slot replaced by the right-aligned relative watch time (existing `watch.relativeDay.*` formatting). To render tags, history entries gain `airDate` + `episodeType` (both nullable; additive, non-breaking). The history list renders in full on the page (no `max-h`/inner scroll); order unchanged (E27: oldest top, newest bottom). On load the page scrolls the "Sıradaki bölümler" heading to the top of the viewport (instant, once, after data load — same pattern as the timeline's today anchor). E27's "auto-scroll to bottom of history" behavior is replaced by this. |
| E39 | Test notification? | `POST /api/push/test`, strict zod body `{ endpoint: string }` — the requesting device's own subscription endpoint (web reads it from `getCurrentPushSubscription()`). Unknown endpoint → 404 NOT_FOUND. Sends one web-push to exactly that subscription: payload `{ title: "baykuş", body: "Test bildirimi", url: "/settings" }` (hardcoded TR body — mirrors `notifyNewEpisodes`' existing hardcoded-TR convention). Push-service 404/410 → remove the subscription and return 404; other send failures → 502 `UPSTREAM_ERROR` if that code exists in the error envelope, else the generic 500 mapping — reuse whatever `middleware/errors.ts` already provides, don't invent a new envelope. Success → 200 `{}`. Settings UI: a "Test bildirimi gönder" button, visible only while subscribed; success/failure toasts. |
| E40 | Browser caching of series images? | Already implemented and asserted: `createImageRoute` sets `Cache-Control: public, max-age=31536000, immutable` on every `/img` response (cache keys are content-addressed by provider path, so immutable is correct), and `img.test.ts` asserts the exact header. Recorded here so the product note isn't silently dropped — **no task, no code change.** |
| E41 | Filter RESET? | RESET sets the draft to the page-load defaults: sort `lastWatched` ("Son izlenen"), category `all` ("Tümü"). Draft-only — APPLY still applies, panel stays open. Supersedes 002 ui.md's "RESET = Tümü + Son eklenen" (which contradicted the page default and is the reported bug). |
| E42 | Danger zone (delete all data)? | Added post-checklist (2026-07-15), surfaced while debugging a real-library E32 edge case (see below) — not in the original `fikir.txt` set. `DELETE /api/library`, strict `{ confirm: "DELETE" }` body; deletes items (cascade), ratings, settings, push subscriptions, refresh log — a superset of the zip-import "replace" wipe (which leaves push subscriptions and the refresh log alone). Web: a red-bordered "Danger zone" section in Settings, always visible (not gated by single/multi mode — multi-mode account deletion is a separate, account-level action); the confirm dialog requires typing a locale-specific phrase (`settings.dangerZone.confirmPhrase`: "SİL" / "DELETE") rather than a password, since single mode has none. No auto-navigation on success (unlike account deletion, which redirects to `/login`) — the library is simply empty on the same page. |
| E43 | TV Time parser bugs against real exports? | Added post-checklist (2026-07-15), surfaced while running the importer against a real TV Time GDPR export (out of the original `fikir.txt` set). Two independent bugs: **(a)** `user_show_special_status.csv`'s `for_later` row can be a stale marker left over from before a show was later dropped/archived — `followed_tv_show.csv`'s `active`/`archived` reflect *current* state and must be checked first; `for_later` only applies when the show is still actively followed. **(b)** `collapseDriftingDuplicates` (parse.ts) merges same-(show, episode) watches within a 60s window down to one; `show_seen_episode_latest.csv` rows never carry season/episode numbers, but a numbered duplicate of the *same* watch can appear in another file within that window — the merge now keeps the numbers if any copy in the window has them, instead of an order-dependent "first one sorted wins" pick that could silently drop them (forcing a network `resolveEpisodePosition()` call at confirm time that may fail and skip the episode). Both confirmed against a real export; fixtures for both live in `parse.test.ts`. |
| E44 | TV Time import progress feedback? | Added post-checklist (2026-07-15) — a real export can carry hundreds of shows, and the matching phase (one metadata lookup/search per show, bounded concurrency) was a silent multi-minute spinner. `matchShows` gains an optional `onProgress` callback fired once per show in *completion* order (not input order) with `{ done, total, name, status }`; the route streams it as SSE `progress` events ahead of the existing trailing `complete` event — same wire pattern `/confirm` already uses. Web shows a progress bar + a capped (8-entry) live log of the most recent matches with a ✓/?/✗ mark per outcome. |
| E45 | Brand refresh? | Added post-checklist (2026-07-15), design-led (not in `fikir.txt`). New token set (`apps/web/src/index.css` `@theme`): colors `void #080808` (bg), `snow #ebebeb` (text), `muted #666666`, `yellow #f0e000` (accent — replaces emerald as the one accent color); fonts `DM Serif Display` (italic, headings/titles), `DM Sans` (body), `JetBrains Mono` (labels/metadata, uppercase+tracked). Cards/panels: sharp corners (no `rounded-*`), hairline `border-white/5` or `/10` instead of filled `bg-zinc-900` blocks. Rating (👍/😐/👎) and category-status coloring move from emoji to lucide arrow icons (`ArrowUp`/`Minus`/`ArrowDown`) colored red/yellow/green. New shared `Checkbox` primitive (button + `Check` icon, not a native `<input>`) replaces every native checkbox in the app. Design reference: `specs/003-dynamic-watching-ux/design/brand-identity.html` (static Tailwind mockup, not part of the built app — excluded from biome). Supersedes every hardcoded `zinc-*`/`emerald-*` color and rounded-corner mention in 001/002/003 ui.md — treat this row as the current palette, not those. |
| E46 | Where do series actions live? | Added post-checklist (2026-07-15), paired with E45. `SeriesCard`'s hover-reveal buttons (remove, refresh, move-to-watch_later/stopped/auto) are gone — the library grid card is now a pure link (poster + title + progress) with no per-card mutation surface. All of those actions, plus mute/unmute (previously two small header icon-buttons), now live in one "⋮" menu on the series detail page header, next to the category badge. Rationale: the hover-button grid was the last remaining `rounded`/`bg-zinc-950/80` chrome that didn't fit the E45 palette, and consolidating avoids six overlapping hover targets on a card that's also a link. `RatingControl` and the segmented progress bar's category coloring move up next to the title in the same header restructure. |
| E47 | Episode-row watch actions after the redesign? | Added post-checklist (2026-07-15), paired with E45. The episode row's "⋮" dropdown (watch again / edit date / mark up to here) is replaced by two checkbox-driven modals, gated on click by watch state: clicking an **unwatched, aired** episode's checkbox — if any earlier episode in the season is unwatched (`hasUnwatchedBefore`, computed in `SeasonSection` from the series' `nextUnwatched` cursor), shows a confirm modal ("mark everything up to here, or just this one?"); otherwise marks it directly (unchanged one-tap behavior). Clicking a **watched** episode's checkbox opens a "watch again / edit date / mark as unwatched" sheet (same three actions the old menu had, plus unwatch is now reachable without a separate control). `SeasonSection`'s "mark all watched" button becomes a `Checkbox` (checked = season complete, disabled when complete or nothing aired yet); a season now auto-collapses on mount once it's complete (still starts expanded otherwise, season 0 still starts collapsed). |

## Non-goals

- Per-window lengths (one setting governs all three; revisit only if it chafes).
- Distinguishing add-source beyond the three `AddedVia` values (no per-user
  attribution, no "re-added" tracking).
- Segmented progress for skip-around watchers (fallback bar is the feature).
- Poster images inside push notifications.
- Service-worker/offline image caching (HTTP cache is sufficient — E40).
- Theme/light-mode work (still parked, unchanged from 001).

## Acceptance checklist (definition of done for 003)

- [~] All FRs implemented; every E30–E41 decision has at least one test
      asserting it (E40 counts via the existing `img.test.ts` assertion).
      <!-- E30: core/library/category.test.ts rungs 1-7 + "rung 3a: the
      newly-added lift" + "rung 6: the new-episode lift" + "custom
      watching window" describe blocks (M14.3). E31: core/library/
      settings.test.ts "watchingWindowDays" + apps/server routes/
      settings.test.ts PATCH/GET tests (M14.2/M14.5). E32: db/open.test.ts
      "migration 0002" + zip/import.test.ts v1+v2 addedVia tests +
      service.test.ts addSeries defaults (M14.1/M14.4). E33: category.
      test.ts "rung 6" block incl. the zero-watch-stays-not_started case
      (M14.3). E34: progress.test.ts "getSeasonProgress" + web
      SegmentedProgress.test.ts (M15.1/M15.2). E37(a) season-sort: web
      lib/seasons.test.ts (added this task, M17.5 — closing a gap found
      during this walk, same as 002's M13.1 precedent). E38: core
      history.test.ts airDate/episodeType null-safety + server routes/
      watches.test.ts response shape + web WatchNextRow.test.ts
      (computeOverflowBadge/shouldShowQuickMarkCheckbox unchanged,
      still green) (M17.1/M17.2). E39: server routes/push.test.ts, 8
      cases incl. 410-removes-and-404 (M17.3). E40: apps/server/src/
      routes/img.test.ts (pre-existing, unchanged, per this line's own
      exception). E35, E36, E37(b) poster-crop, and E41 have **no**
      dedicated unit test — each is a presentation-only change with no
      branching logic to extract (their own tasks' DoD says "Tests: none
      beyond typecheck"); all four are covered instead by the
      MANUELTEST.md browser checklists (M14.7/M15.4/M16.4/M17 sections).
      Marked partial rather than done because those four rely on a human
      browser pass, not an automated assertion. -->
- [x] `pnpm lint && pnpm typecheck && pnpm test` green across the workspace.
      <!-- 53 test files, 449 tests, zero typecheck errors across all 10
      packages, confirmed after this task's seasons.test.ts addition. -->
- [x] DB migration 0002 proven by a seeded upgrade test (added_via backfill
      heuristic incl. the tvtime-wins-over-zip case).
      <!-- packages/core/src/db/open.test.ts "migration 0002: items.
      added_via backfill (E32)" — seeds import:zip/import:tvtime/both/
      manual-only/zero-watch items, asserts tvtime wins on overlap
      (M14.1). -->
- [x] Zip round-trip green at schemaVersion 3; v1 **and** v2 zips import
      (v2 zips get `addedVia = 'import:zip'`); v4 rejected 422.
      <!-- packages/core/src/zip/roundtrip.test.ts (Article III,
      unweakened — fixtures widened to all three addedVia values, M14.4);
      import.test.ts "v1 import (E26)" extended with an addedVia
      assertion + new "v2 import (E32)" describe block; "rejects an
      unsupported schemaVersion (4)" (renamed from 3, M14.4). -->
- [ ] Browser: HotD scenario — a caught-up (`up_to_date`) series whose new
      episode airs inside the window appears under İzleniyor; after the
      window with no watch it falls to Bir süredir izlenmedi.
      <!-- Logic test-covered (category.test.ts rung 6); needs a human
      browser pass. See MANUELTEST.md §M14.7. -->
- [ ] Browser: a search-bar add appears under İzleniyor immediately;
      import-created items do not.
      <!-- Mechanically verified via curl against the real dev library
      (M14.7) and the tvtime non-lift test (M14.5/M17.5); full browser
      confirmation still pending. See MANUELTEST.md §M14.7. -->
- [ ] Browser: window setting change (e.g. 30 → 7) visibly re-buckets the
      home page on refresh.
      <!-- Mechanically verified via curl against the real dev library
      (M14.6/M14.7: İzleniyor 75->74 of 280 items on 30->7). Visual
      confirmation still pending. See MANUELTEST.md §M14.7. -->
- [ ] Browser: segmented progress bar renders on card + detail; a
      skip-around series falls back to the plain bar.
      <!-- Pure logic unit-tested (SegmentedProgress.test.ts); API shape
      confirmed live against the real library (197 multi-season, 5
      non-sequential items, M15.2). Visual pass pending. See
      MANUELTEST.md §M15.4. -->
- [ ] Browser: calendar timeline + month + mobile month list show posters;
      today highlighted (re-verify the 2026-07-15 local-date fix).
      <!-- Implemented (M16.2); needs a human browser pass. See
      MANUELTEST.md §M16.4. -->
- [ ] Browser: sticky header while scrolling; mobile bottom tab bar with
      icons navigates all five pages.
      <!-- Implemented (M16.1); needs a human browser pass. See
      MANUELTEST.md §M16.4. -->
- [ ] Browser: detail page — Specials at the bottom, poster uncropped.
      <!-- Specials-last sort now unit-tested (lib/seasons.test.ts,
      M17.5); poster-crop removal is presentation-only. Needs a human
      browser pass. See MANUELTEST.md §M15.4. -->
- [ ] Browser: watch page — history rows match the other sections visually,
      page opens anchored to Sıradaki bölümler.
      <!-- Implemented (M17.2), shared-row refactor unit-tested at the
      pure-helper level. Needs a human browser pass. See MANUELTEST.md
      §M17 (added this task). -->
- [ ] Browser: settings — test notification arrives on the subscribed
      device; filter RESET restores Son izlenen + Tümü.
      <!-- Push-test send path fully unit-tested server-side (push.
      test.ts, M17.3); filter RESET is a two-constant swap (M16.3).
      Actual device delivery + visual RESET confirmation need a human
      browser pass. See MANUELTEST.md §M16.4 (filter) and §M17 (push,
      added this task). -->
- [x] UI complete in TR and EN; i18n parity test green.
      <!-- i18n parity test green (confirmed this session, 449/449
      total). "UI complete" (renders correctly end-to-end in both
      languages) still needs the same human browser pass as the items
      above — tracked there, not blocking this mechanical checkbox. -->
- [ ] README feature list updated (dynamic İzleniyor signals, configurable
      window, mobile nav).
      <!-- Deferred to M17.6 (next task), per tasks.md ordering. -->
