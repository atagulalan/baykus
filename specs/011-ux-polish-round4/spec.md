# Spec 011 — UX Polish Round 4

**Status:** Active · **Owner:** xava · **Created:** 2026-07-18
**Scope:** Web-only UI/UX polish. No core/server schema changes, no new
API *endpoints*, no zip schema changes. Additive query params on existing
routes are allowed when recorded in an edge-case decision (E159). Delta over
001–010; **011 wins on overlap**.

## Summary

Nine product asks from 2026-07-18 through 2026-07-19:

1. Spoiler protection must not blur series portrait posters.
2. Skip the post-watch rating popup when the episode already has a rating
   (especially on rewatch).
3. Episodes with unknown air dates show **TBD** instead of a dead/disabled
   checkbox; known future dates keep the day countdown.
4. Replace the E144 Next Up carousel with a single prominent next-episode
   card.
5. Profile order becomes stats → favorites → all series; drop the redundant
   Detailed stats / Settings link rows; move Refresh all into Settings →
   Data.
6. Search results must be operable from the keyboard (arrow highlight, Enter
   to open, Shift+Enter for a new tab).
7. List/grid and History controls belong together at the right of both Watch
   and Library page headings, rather than in the mobile app header.
8. `needs_review` auto-shows at the top when non-empty (hidden when empty,
   never via Kategori ekle, no sort control).
9. The mobile bottom navigation mirrors the header edge fade: a bottom→top
   black gradient scrub with icon tabs on top; progressive backdrop blur
   (gradualblur) also scrubs both viewport edges under the chrome.

## User stories

### US-47: Honest spoiler posters
As a user with spoiler protection on, unwatched episode stills/titles blur,
but the series portrait poster stays sharp so I can still identify the show.

### US-48: No forced re-rate on rewatch
As a user who already rated an episode, marking it watched again does not
pop the rating prompt — I can still change the rating from the details modal.

### US-49: TBD for unknown air dates
As a user, unaired episodes with no known air date show **TBD** in the
trailing mark; episodes with a known future date keep the day countdown.

### US-50: Single Next Up card
As a user, series detail shows one bordered next-episode card (not a
horizontal carousel) when there is a next unwatched episode.

### US-51: Cleaner profile chrome
As a user, my profile leads with stats, then favorites, then all series.
Settings and Detailed stats are not duplicated as bottom link rows. Refresh
all lives under Settings → Data (gear in the identity row still opens
Settings).

### US-52: Keyboard search results
As a keyboard user on `/search`, I can move through results with the arrow
keys, open the highlighted show with Enter, and open it in a new tab with
Shift+Enter — without Tab-walking every row.

### US-53: Watch view controls together
As a user on `/watch` or `/`, I see the destination-view toggle on the right
of the page heading (history opens via pull-to-history).

## Edge-case decisions (normative)

| # | Question | Decision |
|---|---|---|
| E149 | Spoiler protection vs series poster? | Spoiler protection (`spoilerProtection && !watched`) blurs/hides **episode** content only: episode still thumbnails (E148 omit), episode titles, overviews in the details modal. The series portrait poster on series-chrome `EpisodeRow`s **never** blurs. Series title stays sharp (unchanged). Amends the unspoken implementation that applied `blur-md` to `posterRef`. <!-- DECISION: 2026-07-18 — series poster is identity, not a spoiler. --> |
| E150 | When does the post-watch rating popup open? | **Amends 001 E8 / 009 E122.** After a successful single-episode watch or rewatch on series detail, open the left-of-checkbox rating prompt **only when `myRating === null`**. If the episode already has a rating, skip the prompt. Re-rating remains available via the episode details modal. Dismissal still is not persisted. Bulk / season / watch-page quick-mark stay prompt-free. <!-- DECISION: 2026-07-18 — don't force a re-rate when a rating already exists. --> |
| E151 | Null airDate trailing mark? | **Amends 009 E144 and 002 E29 for trailing affordance.** For unaired / not-yet-markable episodes: (a) future `airDate` → stacked days-remaining countdown (unchanged); (b) `airDate === null` → trailing **TBD** mark (`episode.tbd`, mono, muted) instead of a disabled/hidden checkbox. Watch-page quick-mark still does not offer a clickable checkbox for null/future (E29 mark semantics unchanged) — the trailing slot shows TBD or countdown. Subtitle air-date text stays omitted when null. <!-- DECISION: 2026-07-18 — unknown schedule reads as TBD, not a dead control. --> |
| E152 | Next Up overhaul? | **Supersedes 009 E144's carousel.** When `nextUnwatched` is present and the existing uiPrefs toggle is on (storage key remains `showNextUpCarousel` for settings/zip compatibility), series detail shows a single bordered **Next Up card** between hero and season list — heading `series.nextUp`, one `EpisodeRow` (or equivalent) for the current next episode with the same watch / watch-again / edit-date / bulk-up-to-here / rating-prompt handlers as `SeasonSection`. No horizontal rail, no neighbor episodes, no auto-advance scroll. Settings copy refers to “Next up” / “Sıradaki”, not “carousel”. Unaired next episodes use E151 (countdown or TBD). <!-- DECISION: 2026-07-18 — product ask: one prominent card replaces the carousel. --> |
| E153 | Profile layout + Refresh all location? | **Amends 005 E58 / E66.** Profile top→bottom: banner (010) → identity row (gear → Settings on desktop) → **stat tiles** (link to detailed stats) → **favorites rail** → **all-series rail**. On mobile, the Settings gear occupies the right side of the app header instead of the identity row, and the profile hub (`/user/$handle`) shows the mobile back arrow (fallback `/watch` when there is no in-app history — amends E72’s “tab surfaces never get the arrow” for profile only). The identity row sits over the lower portion of the banner on a higher z-layer. Its banner-edit control sits immediately left of the Settings gear on desktop. Remove the bordered “Detaylı istatistikler” and “Ayarlar” link rows. Remove Refresh all from the profile. Settings → Data section gains the full-width Refresh all button (same `startManualSweep`, n/m progress, `library.refreshAll` / `library.refreshAllDone` toasts). Pull-to-refresh (009 E132) still triggers the same sweep on calendar / all-series / favorites / watch-history; `/` and `/watch` use pull-to-history instead (E160). Prose for the refresh button refers to “Refresh all (Settings → Data)” rather than “the profile’s button”. <!-- DECISION: 2026-07-18 — stats first; chrome links redundant with gear + tile link; refresh belongs with data tools. DECISION: 2026-07-18 — identity sits over the banner; banner edit joins the identity controls immediately before Settings. DECISION: 2026-07-18 — mobile Settings gear moves to the app header's right slot. DECISION: 2026-07-18 — mobile profile hub gets a back arrow. --> |
| E154 | Search result keyboard navigation? | **Amends 006 non-goal “Search UX changes — no keyboard shortcut”** for *in-list* navigation only (still no global `/` or hotkey to open `/search`). On `/search`, while results are shown: focus stays on the search input (combobox + `aria-activedescendant`); **↓ / ↑** move the highlight among rows (↓ from none → first; ↑ from first → none; no wrap past ends); **Enter** opens the highlighted result in the current tab, or the **first** result when nothing is highlighted (same destination as click / E131 — in-library → `/series/i{id}`, else `/series/new?…`); **Shift+Enter** opens that same target in a new tab (`noopener`); **Escape** clears the highlight (does not clear the query). Reset highlight when the result list identity changes (new query / refetch). Empty / loading / error / hint states: no list keys. Mouse click unchanged; View Transitions apply to same-tab opens only. <!-- DECISION: 2026-07-18 — keyboard users need arrow/Enter/Shift+Enter without Tab-walking rows; bare Enter = first hit. --> |
| E155 | Where do the browse controls live? | **Amends 010 E142 placement and icon semantics; amended by E160 for History; amended 2026-07-18 for mobile chrome.** On **desktop** (`sm+`), `/watch` and `/` keep the destination-view toggle right-aligned in the page heading (`/watch` → grid → `/`; `/` → list → `/watch`). On **mobile**, that same toggle occupies the app header's fixed right action slot (alongside calendar's schedule toggle and profile's Settings gear) — do not also show it in the page heading. On mobile `/`, the centered wordmark is replaced by the localized Library title and the entire in-page Library title row is omitted, reclaiming its vertical space. The control still persists `browseView`. History icon removed — see E160. <!-- DECISION: 2026-07-18 — mobile header right slot is shared contextual chrome; Library's title moves there so its redundant page row can disappear. --> |
| E156 | `needs_review` section on Watch / grids? | **Amends 009 E141.** When non-empty, `needs_review` is prepended first on `/watch` (and stays first in Library / AllSeries `CATEGORY_ORDER`). When empty, the section is **hidden** (no empty shell / hint). It is **never** stored in `watchSections` prefs and **never** offered in **Kategori ekle** (`AddSectionBar` hard-excludes it; prefs parse strips it). No remove control; no `SortMenu` — fixed category default (`added`). <!-- DECISION: 2026-07-18 — import-review noise must stay visible at the top without a sort control. --><!-- DECISION: 2026-07-18 — hide when empty; never manually addable. --> |
| E157 | Who owns horizontal screen spacing? | `MainShell` is full-bleed inside its `max-w-5xl` width and provides **no horizontal padding**. **Amended by 013 E183:** Library / Watch (`BrowsePage`), Calendar (`CalendarPage`), and Watch History (`WatchHistoryPage`) add a tablet outer gutter on their page root (`sm:px-3 lg:px-0` = 12px from `sm` until `lg`); other routes stay flush at the shell. Each visual component owns the inset its content needs: standard page content uses `content-inset` (`12px`, `24px` at `sm+`); list rows and their section headers use the shared tighter row inset (`list-inset`: `8px` / `16px` at `sm+`); cinematic media, list borders, calendar schedule rails, settings groups, and other intentionally edge-to-edge surfaces stay flush and pad only their inner text/actions. Negative-margin compensation for a padded shell is forbidden. <!-- DECISION: 2026-07-18 — wrapper padding compounds with row/card padding and makes reusable full-bleed components impossible to align reliably. Amended 2026-07-20 via E183 — tablet gutter on BrowsePage / CalendarPage / WatchHistoryPage, not MainShell. --> |
| E158 | How are standard page titles sized? | Top-level surface headings use one shared `PageTitle` component with `font-display text-2xl italic tracking-tight text-snow`. This covers Library, Watch, Watch History, Calendar, Profile, Favorites, All Series, Settings, and TV Time import states. Entity titles (series detail/preview), auth headings, and empty-state messages keep their context-specific scale. Layout, inset, and responsive visibility remain owned by each page. <!-- DECISION: 2026-07-18 — page headings must not drift between 2xl, 3xl, and 4xl through duplicated class lists. --> |
| E159 | Watch history reverse = oldest window? | **Amends 002 E27 / contracts `GET /api/watches/history`.** `/watch/history` keeps a 30-row window (default `limit`) but the sort toggle does **not** reverse the current page client-side. Default `order=newest` (or omitted) = latest 30 by `watched_at` desc. `order=oldest` = earliest 30 by `watched_at` asc. Additive query param; unknown values → 400 `VALIDATION_FAILED`. UI: icon toggle on the History page heading refetches with the matching `order`. <!-- DECISION: 2026-07-18 — reverse must surface the start of the log, not the oldest-of-the-latest-30. --> |
| E160 | Pull-to-history on Library / Watch? | **Amends 009 E132 and 010 WP2 history entry point; amends E155.** On `/` and `/watch` only, the same touch pull gesture opens `/watch/history` instead of running `startManualSweep`. Indicator is a `History` icon (yellow past threshold); release past threshold navigates immediately (no refreshing hold / sweep progress). Remove the History icon button from both page headings. Pull-to-refresh (`PullToRefresh` default variant) is **unchanged** on `/calendar`, `/calendar/*`, `/user/:handle/all-series`, `/user/:handle/favorites`, and `/watch/history`. Flush-top chrome still applies to `/` and `/watch` so the gesture has room. No new i18n keys. <!-- DECISION: 2026-07-18 — browse surfaces use pull for history; inner list surfaces keep refresh. --> |
| E161 | What is the mobile bottom-navigation treatment? | **Amends 010 WP1 presentation only; routes and active semantics stay unchanged. Amended 2026-07-20.** Below `sm`, Watch, Calendar, Profile, and Search are **icon-only** on a transparent tab bar (`Z.chrome`). Edge scrub lives in `Z.edgeBlur` **under** header/tab bar and **above** page as **two layers**: (1) black→transparent gradient (stop alphas ramp; never CSS `opacity`), (2) masked `backdrop-filter` with radius 1→8px on banner scroll. **VT:** tint and blur each have a `view-transition-name`; `backdrop-filter` is on the named blur node so the UA copies it onto `::view-transition-group` (child filters were dropped → blink). Stack: page → edgeBlur → chrome → overlays → grain. Top: all breakpoints (banner: linear ramp over first 100px); bottom: mobile only. <!-- DECISION: 2026-07-20 — two-layer edge scrub; named-node backdrop-filter for VT. --> |
| E165 | Collapse long runs of fully-watched seasons? | On series detail and preview, **fully-watched** numbered seasons (aired episodes all have `watchCount > 0`; same rule as `SeasonSection`) that sit **before the active season** (first incomplete numbered season; when every numbered season is complete, the last stays as the visible anchor) collapse into one pill (`CollapsedSeasonsGap`) when that prefix length is **≥ 2**. The pill is **not sticky** — it scrolls with the page. It shows a full green `CircularProgress` ring plus localized **Seasons watched** copy (e.g. “7 seasons watched”); click expands the hidden seasons. A single prior finished season stays listed (e.g. S1 done + S2 in progress → no pill). Specials (0) never join the prefix. Seasons from the active one onward stay fully listed (no middle-of-run collapse). <!-- DECISION: 2026-07-20 — product ask: long finished-season stacks (S1…S8 + current) should read as first / … / last-complete / current. --><!-- DECISION: 2026-07-20 — amended: hide the whole finished prefix before active (≥2), with labeled pill; not first/…/last-of-run. --><!-- DECISION: 2026-07-20 — pill leading glyph is complete CircularProgress + count, not ellipsis. --><!-- DECISION: 2026-07-20 — pill must not stick; only real season headers stay sticky. --> |
| E166 | Season actions trigger? | The season overflow "⋯" control beside the season pill is removed. Bulk season actions (mark watched / unwatch) open from a click on the season `CircularProgress` ring inside the pill; the label+count area remains the expand/collapse toggle. `SectionHeader` keeps custom `leading` outside the toggle button when both are present so the ring control is not nested inside the accordion button. Desktop popover uses `Modal` `popoverAlign="center"` so the menu hangs centered under the ring (default remains `"end"` for ⋮ menus). <!-- DECISION: 2026-07-20 — product ask: drop the trailing season ⋯; progress ring opens the menu; center the popover on the ring. --> |

## Non-goals

- No schema / zip changes. Additive query params on existing endpoints are
  allowed when an edge-case decision records them (E159).
- No changes to rating storage (still one rating per episode).
- No redesign of watch-page “Sıradaki bölümler” beyond shared EpisodeRow TBD/countdown.
- No removal of the Settings gear from the desktop profile identity row; mobile renders it in the app header.
- Theme / light mode still parked.
- No global keyboard shortcut to open `/search` (006 stands); E154 is in-page only.
- No on-screen keyboard cheatsheet on `/search` (behavior + a11y roles only).

## Acceptance checklist

- [x] Series-chrome posters stay sharp under spoiler protection (E149).
- [x] Rewatch / first-watch with existing `myRating` skips rating popup (E150).
      <!-- Helper + SeriesDetailPage gate unit-covered; popup skip is
      presentation gating — confirmed via shouldPromptEpisodeRating tests. -->
- [x] Null airDate shows TBD; future dates keep countdown (E151).
- [x] Series detail Next Up is a single card, not a carousel (E152).
- [x] Profile order: stats → favorites → all series; no bottom link rows; no profile Refresh all (E153).
- [x] Settings → Data has Refresh all with progress (E153).
- [x] Search results: ↓/↑ highlight, Enter same-tab, Shift+Enter new tab (E154).
- [x] Watch and Library: desktop page-heading destination toggle; mobile uses
  the shared header right slot (E155 / E160).
- [x] `/` and `/watch` pull opens history; all-series / favorites / calendar keep pull-to-refresh (E160).
- [x] `needs_review` auto-shows first when non-empty; hidden when empty; never in Kategori ekle; no sort (E156).
- [x] Watch history sort toggle fetches `order=oldest` (earliest window), not a client reverse (E159).
- [x] Mobile bottom navigation uses a bottom→top gradient scrub with icon tabs;
      VT-safe progressive edge scrubs on top + mobile bottom (E161).
- [x] `pnpm lint && pnpm typecheck && pnpm test` green.
- [x] New/changed UI strings in both `tr.json` and `en.json`.
