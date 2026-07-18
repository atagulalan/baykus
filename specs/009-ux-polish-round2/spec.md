# Spec 009 — UX Polish Round 2

**Status:** Draft · **Owner:** xava · **Created:** 2026-07-17
**Scope:** Web-only UI/UX polish pass. No core/server schema changes, no new
API endpoints. Delta over 001–008; **009 wins on overlap**.

## Summary

A product-driven sweep over the web layer, sourced from `fikir.txt`
(2026-07-17). Every item from the file is covered here — nothing dropped.
The changes group into: interaction improvements (drag-scroll heatmap, scroll
anchoring, search poster animation), component upgrades (SeasonSection
redesign, Checkbox hint, SxEy formatter, custom stepper, WatchDateDialog),
layout fixes (sticky filter/section headers, navbar icon+text, settings
two-column), and housekeeping (selectbox reduction, calendar tag cleanup,
rating button repositioning, category status icons, genre translation prep).

No new database columns, no new API endpoints, no zip schema changes.
Everything is presentation-only.

## Decisions locked in (from product notes, 2026-07-17)

| Topic | Decision |
|---|---|
| Heatmap year-select replacement | **Drag-scroll** (touch/mouse pan) with the same pattern as `ScheduleGrid.tsx`; the `<select>` is replaced by a horizontally scrollable year strip with the current year highlighted. |
| Settings layout | **Two-column on desktop** (`sm+`): labels left, controls right. Single column on mobile (unchanged). Selectboxes for locale/region/theme replaced by **segmented button groups** (same pattern as `CalendarPage`'s `ModeTabs`). |
| Navbar on desktop | All nav items render **icon + text** (same `lucide-react` icons already used on mobile). On tablet (`md` to `lg` breakpoint), labels hide — icon-only. Mobile bottom bar unchanged. |
| Checkbox hint | New `showHint` prop on `Checkbox.tsx`: when `true` and `checked === false`, renders a small `✓` inside at reduced opacity — so users can see it's a checkbox even when unchecked. |
| SxEy formatter | New `EpisodeLabel` component + `formatEpisodeLabel` pure helper in `lib/episodeLabel.ts`. Reads a user setting `episodeLabelFormat` (`"SxEy"` / `"S01E06"` / `"compact"`) from `GET /api/settings` (new settings key, default `"SxEy"`, stored client-side via the existing settings patch). |
| Season section redesign | Animated expand/collapse (`max-height` + `overflow: hidden` transition or a `details[open]` CSS approach). Season header gets a bottom border matching episode rows. |
| Filter button | `sticky` on scroll, same `z-40` as the header. |
| Section headers on /watch | `sticky` below the app header, `z-30`, so the user always sees which section they're in. |

## User stories

### US-26: Swipeable heatmap year navigation
As a user, I can drag/swipe the stats heatmap left-right to navigate between
years instead of using a select dropdown — the same gesture I already use on
the schedule calendar.

### US-27: Fewer selectboxes
As a user, settings uses segmented button groups instead of `<select>` for
locale, region, and theme — matching the calendar's mode tabs style.
The stats `YearSelect` is replaced by a draggable year strip.

### US-28: Consistent scroll anchoring
As a user, `/watch` and `/calendar` pages open scrolled to the correct
section (Sıradaki bölümler / today) reliably, never at a random scroll
position.

### US-29: Cleaner calendar entries
As a user, calendar list entries show the episode name prominently instead of
the "yaklaşan" tag — the tag is removed from the calendar timeline/list views
since the calendar context already implies upcoming.

### US-30: Configurable episode label format
As a user, I can choose how season/episode identifiers display throughout the
app: `S1E6` (default), `S01E06` (zero-padded), or a compact mini style.

### US-31: Discoverable checkboxes
As a user, unchecked checkboxes in the timeline, series content, and episode
rows show a subtle `✓` hint so I understand the control is interactive.

### US-32: Custom stepper input for watching window
As a user, the watching window (days) setting uses a polished stepper control
with `+`/`−` buttons instead of a raw `<input type="number">`.

### US-33: Two-column settings on desktop
As a user, the settings page uses horizontal space on desktop with a
two-column layout.

### US-34: Desktop navbar with icons
As a user, the desktop navbar shows icons alongside text labels — consistent
with the mobile bottom bar's visual language.

### US-35: Search poster expand animation + explicit add
As a user, clicking a search result opens the series page (library detail or
`/series/new` preview) with a view-transition-powered poster animation. New
shows are not auto-added — I tap **"İzlemeye başla" on the preview page** to
add and open them.

### US-36: Better rating button placement
As a user, the inline rating buttons (iyi/normal/kötü) on the series detail
page are repositioned for a better visual flow.

### US-37: Category status icons
As a user, categories like İzleniyor, Sonra izlenecek, Bırakıldı show a small
lucide-react icon alongside their label for visual clarity.

### US-38: Translatable genre tags
As a user, genre tags (Drama, Comedy, Action…) display in my selected language
instead of always in English.

### US-39: Aligned SeasonSection checkboxes
As a user, the checkbox in the SeasonSection header aligns perfectly with the
episode row checkboxes — consistent horizontal spacing.

### US-40: Redesigned SeasonSection
As a user, the season section expands/collapses with a smooth animation and
has consistent border styling (no border gap between the header and the first
episode row).

### US-41: Better WatchDateDialog
As a user, the "edit date" dialog has a more polished design with clearer
visual hierarchy.

### US-42: Sticky filter button
As a user, the filter/sort button on the library page stays visible while
scrolling (sticky positioning).

### US-43: Sticky section headers on /watch
As a user, the section headers on the watch page (İzleniyor, Bir süredir
izlenmedi etc.) stick below the app header while scrolling, so I always know
which section I'm viewing.

### US-45: Sticky calendar mode switcher
As a user, the calendar mode tabs (timeline / month / schedule on desktop;
timeline / schedule on mobile — E135) stay pinned below the app header while
I scroll — I can switch modes without scrolling back to the top after the
timeline anchors to BUGÜN. Each mode lives at its own URL (E136) so I can
bookmark or share a specific view.

### US-44: Pull-to-refresh on list screens
As a phone user, when I pull the library, watch, calendar, all-series or
favorites screen down from the top and release, the app re-fetches my series
from the provider — the same action as the profile's "Tümünü yenile" button —
and the list I'm looking at updates.

### US-46: Stable, animated quick-mark on /watch
As a user, when I quick-mark an episode in "Sıradaki bölümler" or "Bir
süredir izlenmedi", the page does not jump: the marked row visibly flies up
into the watch history section, and for stacked series the row advances to
the next episode in place.

## Edge-case decisions (normative)

| # | Question | Decision |
|---|---|---|
| E112 | Heatmap year navigation interaction? | Replace `YearSelect` with a horizontally scrollable year strip (inline `flex gap-2 overflow-x-auto` container). Each year is a button; the active year is `text-yellow` + `border-b-2 border-yellow`; others are `text-muted`. On touch: native scroll (no custom drag needed — there are rarely more than ~10 years). On desktop: the existing `ScheduleGrid` mouse-drag pattern is NOT needed here — buttons fit in one row for any reasonable data. The heatmap itself gains the same drag-to-pan behavior the schedule grid uses — `touch-pan-x` + mouse drag handlers — for the day grid's horizontal overflow. |
| E113 | Which `<select>` elements are replaced? | **(a)** Settings locale → segmented button group (2 options: TR / EN). **(b)** Settings region → segmented button group (8 options: TR, US, GB, DE, FR, ES, IT, NL); overflow wraps. **(c)** Settings theme → segmented button group (1 disabled option: Dark); same disabled styling. **(d)** Stats `YearSelect` → year strip (E112). **(e)** Import page's `<select>` for import mode stays — it's a power-user flow with potentially many options. |
| E114 | Scroll anchor reliability on /watch and /calendar? | `/watch`: the one-shot `scrollIntoView` already uses a double-RAF pattern (timeline) or `isLoading` guard (watch). The bug report says it "sometimes" doesn't scroll. Fix: use the same double-RAF pattern (`requestAnimationFrame → requestAnimationFrame → scrollIntoView`) on `/watch`'s `nextHeadingRef`, matching the timeline's E73 implementation. `/calendar` timeline: double-RAF unchanged (E73); scroll-margin amended by E133 so BUGÜN clears the sticky mode chrome as well as the app header. `/calendar` month/schedule modes: no anchor needed (they start at the current month/week). |
| E115 | "Yaklaşan" tag in calendar? | Remove the `upcoming` tag from `CalendarEntryRow` renders in timeline and month views. The `computeEpisodeTagKinds` function stays unchanged — the calendar row simply passes `excludeTags={["upcoming"]}` or the row filters `upcoming` out of its rendered kinds before mapping to JSX. Other tags (yeni, prömiyer, final, special, ova) remain. The watch page and series detail page keep showing `upcoming` as before. |
| E116 | `EpisodeLabel` format and settings storage? | New settings key `episode_label_format`, values `"SxEy"` (default — `S1E6`), `"S01E06"` (zero-padded — `S01E06`), `"compact"` (mini — `1×6`). Stored in the existing settings table, same as `watching_window_days`. `formatEpisodeLabel(s, e, format)` is a pure function in `apps/web/src/lib/episodeLabel.ts` (web-only — server never formats these). `EpisodeLabel` is a thin React component that reads the format from settings context and renders the output of the formatter. All existing `S${s}E${e}` string templates and hardcoded `S{entry.s}E{entry.e}` JSX across the app get replaced with `<EpisodeLabel>` or the format function. This is a **new settings key**, requiring a `SettingsPatch` / `Settings` type extension in core + server validation (same pattern as `watchingWindowDays`). |
| E117 | Checkbox `showHint` behavior? | When `showHint={true}` and `checked={false}`: the `Check` icon renders at `opacity-20` and `scale-75` (instead of `opacity-0 scale-50`). When `checked={true}`: no change (full opacity/scale, same as today). Default `showHint` is `false` — opt-in per usage site. Usage sites: `EpisodeRow`, `SeasonSection`, `CalendarEntryRow`, `WatchNextRow` — all pass `showHint`. The watch-next checkbox on `WatchNextRow` does NOT get the hint (it has a different visual role — marking completion, not discovery). |
| E118 | Stepper input for watching window days? | New `StepperInput` component: a `−` button, a centered `<input type="text" inputmode="numeric">` showing the current value, and a `+` button. `−`/`+` increment by 1; long-press accelerates to 5. `min`/`max` props disable the buttons at boundaries. The raw `<input type="number">` in settings is replaced. Same blur-to-save behavior as today. |
| E119 | Settings two-column layout? | Desktop (`sm+`): the settings sections render in a `grid grid-cols-2 gap-6` layout instead of the current single-column `max-w-2xl`. Mobile: unchanged single column. The Danger Zone section always spans `col-span-2` (full width). |
| E120 | Desktop navbar icons? | **Amended 2026-07-18:** the authenticated app header is transparent while it is at the top of the page, then gains the standard sticky surface while stuck after scrolling (`border-white/5 bg-void/95 backdrop-blur`). Desktop (`sm+`) uses one balanced row: icon-only Watch + Calendar on the left, the centered baykuş wordmark, then icon-only Search + Profile on the right. Watch, Calendar, and Search are independently floating circular glass buttons. Profile is a bare `User` icon without a surrounding circle or button surface. Every icon link has an accessible label and tooltip; active state stays `text-yellow`. Mobile layout and bottom tab bar remain otherwise unchanged. <!-- DECISION: product ask — minimal balanced `x x baykuş x x` chrome around the centered wordmark. --><!-- DECISION: 2026-07-18 — keep content visible through the header at page top, then match the app's translucent blurred sticky surfaces once chrome overlaps scrolled content. --> |
| E121 | Search result poster animation? | Use the View Transitions API (`startViewTransition`). The search result's `<img>` gets `viewTransitionName: "search-poster-{resultKey}"` (or `poster-{itemId}` at navigation time). The series detail page's poster gets the matching name when navigated from search. The transition is "expand in place" — the poster grows from the search result's thumbnail size to the detail page's full poster. Fallback: if the browser doesn't support View Transitions, the navigation happens instantly (no animation, no break). |
| E131 | Search click vs add? | **Amends 007 E87.** Row click opens a series page: in-library hits (`libraryItemId` on `GET /api/search`) go to `/series/i{id}`; new shows go to `/series/new?…externalIds` which loads `GET /api/search/preview` (full season/episode inventory, synthetic episode ids). **"İzlemeye başla"** or **checking any aired episode** (single / up-to-here / season) adds the show and applies that watch, then replace-navigates to real detail. If preview finds `libraryItemId`, it redirects. <!-- DECISION: silent add-on-click felt like accidental library pollution; browsing inventory + first watch = start watching. --> |
| E122 | Rating button repositioning? | **Amended 2026-07-18:** the series-level favorite toggle and `RatingControl` live inside the series overflow menu; they are no longer persistent hero actions. Favorite is a standard menu row and rating is a labeled inline section. The post-watch rating prompt on `EpisodeRow` (E8) opens absolute to the **left** of the episode checkbox (`right-full`, vertically centered, `origin-right` slide-in; row layout does not shift), stays until rate / skip / outside pointer-down (no auto-timeout), and does **not** use a blocking backdrop — other rows stay interactive. <!-- DECISION: favorite and series rating are secondary actions, while episode rating remains contextual to marking an episode watched. --> |
| E123 | Category status icons? | Each `WatchCategory` gets a lucide-react icon: `watching` → `Play`, `not_watched_recently` → `Clock`, `up_to_date` → `CheckCircle`, `finished` → `Trophy`, `not_started` → `CircleDashed`, `watch_later` → `Bookmark`, `stopped` → `CircleX`, `needs_review` → `AlertCircle`. Icons render before category labels in the library filter panel and `/watch` page section headers. **Amended 2026-07-18:** the series detail hero renders only the category icon in a compact status badge; its translated category remains available through the accessible name and tooltip. Not in the card grid (too dense). A `CATEGORY_ICONS` map in `lib/categoryIcons.ts` exports the mapping. |
| E124 | Genre tag translation? | Genres are provider-supplied English strings (TMDB/TVmaze). Add an i18n namespace `genres` with mappings for the ~30 most common genres (Drama, Comedy, Action, Adventure, Sci-Fi & Fantasy, etc.) in both `tr.json` and `en.json`. The `t()` call uses `genres.${genreKey}` with a fallback to the raw genre string for unmapped genres. `genreKey` = `genre.toLowerCase().replace(/[^a-z0-9]/g, "_")`. This covers display in: series detail page tags, stats genre distribution chart labels, and any future genre-filtered views. |
| E125 | SeasonSection checkbox alignment? | The `SeasonSection` header's checkbox container (`pr-2` + `gap-2`) and the `EpisodeRow`'s checkbox are misaligned because the episode row has `px-2 sm:px-4` while the season header has `px-1`. Fix: unify both to `px-2 sm:px-4` and ensure the checkbox column has the same width/alignment in both. |
| E126 | SeasonSection expand/collapse animation? | Use a CSS `grid-template-rows: 0fr → 1fr` transition on the episode list container with `overflow: hidden`. The `expanded` state drives the grid row value. Duration: 200ms `ease-out`. This avoids `max-height` hacks and works with dynamic content. The season header's bottom border renders **always** (not conditionally on expanded state), matching the episode row borders for visual consistency. |
| E127 | WatchDateDialog improvements? | **(a)** Title hierarchy: larger display font, subtitle explaining the action. **(b)** Date/time inputs split into separate `<input type="date">` and `<input type="time">` fields for better mobile UX (native pickers). **(c)** Preset buttons: "Şimdi" (now), "Dün" (yesterday) — common quick picks. **(d)** Confirm button gets `disabled` state when the input is empty. |
| E128 | Sticky filter button? | **Amended 2026-07-17:** one floating FAB on `LibraryPage` / `AllSeriesPage` for **all** viewports (no separate desktop top-right text button). `fixed` bottom-right, `z-30`, portaled to `<body>`: mobile `bottom-[calc(5.5rem+env(safe-area-inset-bottom))]` (above the tab bar), desktop `sm:bottom-6`. Opens the existing filter form as a bottom sheet (`<sm`) or centered modal (`sm+`). Active-filter red dot unchanged (E70). <!-- DECISION: product feedback — desktop should use the same floating affordance as mobile. --> |
| E129 | Sticky section headers on /watch? | Each section header (`<h2>`) on the watch page gets `sticky top-[var(--app-header-height)]` and `z-30 bg-void/95 backdrop-blur` so it pins below the app header while the user scrolls through that section's content. Header type is `font-semibold text-base` with optional muted mono count `(n)`, horizontal padding matching list rows (`px-2 sm:px-6`), and category icons at `size={16}` (E123's `size={12}` still applies to denser surfaces). Standalone `<hr>` dividers between sections are omitted — the sticky `border-b` is the divider. <!-- DECISION: watch list EpisodeRow hierarchy is title-only on line 1; EpisodeLabel + episode title + tags share line 2 at text-xs so sticky headers and row subtitles stop competing. --> |
| E130 | Region flag icons in settings? | Each region option in the segmented button group shows a small flag emoji (🇹🇷, 🇺🇸, 🇬🇧, 🇩🇪, 🇫🇷, 🇪🇸, 🇮🇹, 🇳🇱) before the region code. The region label also gets a tooltip (via `title` attribute) explaining why the region matters: `settings.general.regionHint` → "Bölge, izleme platformu önerilerini belirler" / "Region determines watch provider suggestions". |
| E132 | Pull-to-refresh — which screens, what does it trigger? | Touch-only gesture on the five list surfaces: `/` (library home), `/watch`, `/calendar`, `/user/:handle/all-series`, `/user/:handle/favorites`. Pulling down from `scrollY === 0` past the threshold and releasing triggers **the same action as the profile's "Tümünü yenile" button** (xava's call, 2026-07-17): `startManualSweep` — full (non-staleOnly) refresh of every series, `["library"]` invalidated, existing done/error toasts reused (`library.refreshAllDone` / `errors.generic` — no new i18n keys). After the sweep settles, the gesture additionally awaits invalidation of `["library"]` plus the page's own non-library keys (`["watch-history"]` on /watch, `["calendar"]` on /calendar — an E81 "natural refetch", so session-pinned watched rows dropping is correct), so a pull always refetches the visible page even when the sweep guard (quiet sweep or manual refresh already in flight) skipped starting a new one. `startManualSweep` returns the in-flight sweep's settling promise (resolved immediately when guarded) — the profile button ignores it, behavior unchanged. Gesture mechanics (`PullToRefresh` component wrapping page content): native touch listeners (`passive: false`) on the wrapper; a gesture arms only when the touch starts at document top, then directional-locks (bails if horizontal movement wins — ScheduleGrid/rail panning unaffected, or if a real scroll already started pre-lock); **once locked, every touchmove is consumed until the finger lifts** — upward drift clamps the pull toward 0 and may re-grow, it never hands the gesture back to body scroll mid-flight (device finding 2026-07-17: releasing the preventDefault on upward drift let body scroll yank the page); pull distance dampened (÷2.5, capped ~96px); indicator is a `RefreshCw` icon that rotates with pull progress, turns yellow past the threshold, and spins during refresh with the sweep's mono `done/total` counter beside it; release below threshold animates back and fires nothing. While mounted the component sets `overscroll-behavior-y: contain` on `<html>`/`<body>` so the browser's native pull-to-reload never races the custom gesture; unwrapped pages (search, settings, detail, stats, profile) keep native behavior. No mouse/desktop variant — the profile button remains the pointer path. Amends E60: AllSeriesPage still has no refresh button and no auto-sweep; the pull gesture is the one deliberate exception. |
| E133 | Sticky calendar mode tabs? | **Amends 006 E78** (which kept the title+ModeTabs row in normal flow so it scrolled away above BUGÜN). Product feedback 2026-07-17: after the timeline anchors to today, switching modes requires scrolling all the way back to the top — painful. The title+ModeTabs row becomes `sticky` below the app header (`top: var(--app-header-height)`, `z-30`, `bg-void/95 backdrop-blur`, `border-b border-white/5`), matching watch section headers (E129). A ResizeObserver on the sticky row publishes `--calendar-mode-chrome-height`; the BUGÜN day's `scroll-margin-top` is `calc(var(--app-header-height) + var(--calendar-mode-chrome-height))` so the today header lands directly under the mode chrome, not under it. Segmented control visuals (E78) unchanged. **Mode change resets `window.scrollY` to 0** (`behavior: "instant"`) before the new view mounts — otherwise the timeline's deep BUGÜN scrollY is inherited by month/schedule and they open far down the page; re-entering timeline remounts `TimelineView` which re-runs the E73 today anchor from the top. <!-- DECISION: preserve-scroll across modes is wrong here — each mode is a different surface, not a tab within one scrollable document. --> |
| E134 | Image loading affordance? | Every remote `<img>` (posters, stills, network/provider logos) goes through a shared `MediaImage` component: centered `Loader2` spinner while the resource is pending, then a 300ms opacity fade-in on load. Cached (`img.complete`) images skip the spinner. On error the component renders nothing and calls `onError` so existing fallbacks (title glyph, emoji thumb, plain text) still apply. No new i18n keys — spinner is decorative (`aria-hidden`) with `aria-busy` on the shell. <!-- DECISION: abrupt paint without a loading state felt unfinished; spinner+fade is the house idiom for media. --> |
| E135 | Hide month calendar tab on mobile? | On `<sm` (below Tailwind `sm` / 640px), ModeTabs shows only **timeline** and **schedule** — the **month** segment is omitted. Rationale: `MonthGrid` already collapses to a vertical non-empty-day list on mobile (no calendar grid), which duplicates timeline. Desktop (`sm+`) keeps all three tabs. If the viewport narrows while on `/calendar/month`, replace-redirect to `/calendar` so a hidden tab is never the active selection. <!-- DECISION: 2026-07-17 product feedback — mobile month tab is redundant with timeline. --> |
| E136 | Calendar modes on separate URLs? | Each mode is its own route (amends in-page `useState` mode from 002/006/E133): **`/calendar`** = timeline (zaman çizelgesi; default — nav + `defaultStartPage: "calendar"` unchanged), **`/calendar/month`** = month (takvim), **`/calendar/schedule`** = schedule (yayın akışı). ModeTabs segments are `<Link>`s with `activeOptions.exact` so only the current mode lights up; nav calendar item uses `exact: false` so all three URLs keep the tab active. Mode change is a navigation (ScrollRestoration + scroll-to-top on mode prop), not local state. Pull-to-refresh flush-top applies to `/calendar` and `/calendar/*`. No new i18n keys. <!-- DECISION: 2026-07-17 product feedback — modes must be bookmarkable / shareable URLs, not client-only tabs. --> |
| E137 | Quick-mark scroll jump + move-to-history animation? | Today quick-mark invalidates `["library"]` + `["watch-history"]`; the two refetches land in separate frames and the history list grows directly above the "Sıradaki bölümler" heading, shoving the viewport down. Fix: on success, fetch `getWatchHistory()` + `listSeries()` outside the cache, then apply both with `setQueryData` in a single `flushSync` inside `document.startViewTransition`. The clicked row carries `view-transition-name: quickmark-fly` from click time (state-driven); in the new state the name moves to the just-created history row (matched via `AddWatchResult.id` = `watchId`), so the browser animates the row flying up into history while the advanced/removed watch-next row cross-fades. Inside the same update callback the heading's `getBoundingClientRect().top` delta is compensated with `window.scrollBy`, so nothing else moves between snapshots. While the mutation is pending the clicked checkbox renders checked (fill animation as immediate feedback) and ignores further clicks. **Collapsed-history variant:** when the history accordion is collapsed, the new history row sits inside the `0fr` clipped container and must NOT carry the fly name (a clipped target breaks the morph); instead the closed header renders a transient invisible landing strip (`absolute inset-x-0 bottom-0 h-px opacity-0`, `aria-hidden`, only while the transition runs) carrying `quickmark-fly`, so the marked row simply slides up into the header line, squashing and fading out — same 300ms group animation as the open variant. Old/new snapshots stretch (`width/height 100%`, `object-fit: fill`) so the row squashes into the strip (a no-op for the open row→row morph). No VT support → same atomic update + scroll compensation, no animation. Refetch failure → fall back to plain invalidation (previous behavior). `["calendar"]` stays invalidated in the background; a second quick-mark during a pending one transfers the fly name to the newest click (older mark degrades to cross-fade). <!-- DECISION: 2026-07-17 product feedback — quick-mark yanked the page down; anchoring the section heading + a paired-name fly beats relying on native scroll anchoring across two async refetches. Collapsed variant same evening: the accordion WIP landed after the fly; a clipped in-DOM target animated downward garbage. A ball-toss metaphor (12px target + two-phase WAAPI choreography) was built and rejected — "top mop gerek yok", a plain upward slide into the header was the ask; the invisible strip keeps the UA morph and zero custom animation code. --> |
| E138 | Library out of nav — entry under /watch? | Library (`/`) leaves desktop nav + mobile tab bar. Chrome becomes Watch / Calendar / Search / Profile. Wordmark, login success, and claim-continue land on `/watch`. `/` stays `LibraryPage` (route unchanged). `/watch` gains a page-level chevron row linking to `/` (reuses `app.nav.library`). Mobile back: `/` and `/series/*` fall back to `/watch` (E72). `defaultStartPage: "home"` setting value unchanged (still means library when wired). No new i18n keys. <!-- DECISION: 2026-07-17 — Watch is the action hub; Library is browse/filter reached from Watch. --> |
| E139 | Shared library filter on /watch (list) + `/` (grid)? | Sort + category filter state lives in `useLibraryFilter` (shared by Library home, AllSeries, Watch). `FilterPanel` FAB (E128) mounts on all three when the library is non-empty. Library home / AllSeries render `CategorySection` grids; `/watch` renders the same categories as `CategoryListSection` (`WatchNextRow` list — series without `nextUnwatched` are omitted). Default category order on `/` and `/watch` is `HOME_CATEGORY_ORDER`; AllSeries keeps full `CATEGORY_ORDER`. History on `/watch` stays unscoped (E22). Amends E22's "two next sections only" — the filter now decides which category list sections appear. No new i18n keys (category labels reused). <!-- DECISION: 2026-07-17 — watch = list view, library = grid view of the same filtered library. --> |
| E140 | Görünüm inside the filter panel? | **Superseded by E142** (header icon). Historical: view lived in FilterPanel. |
| E141 | Watch per-section sort + add section? | `/watch` only (AllSeries keeps FilterPanel). Default sections: `watching` + `not_watched_recently` (E22). Each sticky section header has a sort control (client-side `sortSeriesSummaries`) and a remove control — **except `watching`, which is pinned and cannot be removed** (remove button hidden; prefs parse always re-inserts it). Bottom of the page: **Kategori ekle** opens a picker of categories not yet on the page. Section list + per-section sorts persist (E143: settings `ui_prefs` + localStorage cache). Empty sections still render with a hint. No FilterPanel FAB on `/watch`. UI copy uses “kategori” not “bölüm” (episode ambiguity in TR). <!-- DECISION: 2026-07-17 — user-composed watch sections beat a global progress filter. --><!-- DECISION: 2026-07-18 — watching stays pinned; other sections remain optional. --> |
| E142 | View toggle in header; no back on grid? | List↔grid is a mobile-header icon at top-right beside the centered wordmark. Icon shows the **current** view (`List` on `/watch`, `LayoutGrid` on `/`); tap switches and persists `browseView` in uiPrefs (E143). On desktop, the dedicated view-toggle button is omitted to preserve E120's balanced four-button row; the Watch button opens `/watch`, while the wordmark reopens the last view (`/` or `/watch`). Mobile Watch tab also reopens the last view; login/claim still land on `/watch` (E138). `/` is a peer browse surface — **no** mobile back arrow (amends E138). Watch stays highlighted on both `/` and `/watch`. Görünüm remains removed from FilterPanel. <!-- DECISION: 2026-07-17 — view is chrome, not a filter field; grid is not a child of watch. --><!-- DECISION: 2026-07-18 — last list/grid choice survives leave/return via uiPrefs.browseView. --><!-- DECISION: 2026-07-18 — desktop uses the explicit Watch destination instead of a fifth chrome button. --> |
| E143 | History accordion, section-remove confirm, durable UI prefs? | `/watch` history is an accordion (chevron; `grid-template-rows` collapse); collapsed state persists. Removing a section asks once (`RemoveSectionDialog`: copy + “bir daha gösterme” + Eminim / Vazgeç); skip flag persists. All browse UI prefs are stored in library settings key `ui_prefs` (JSON) and therefore ride in zip `library/settings.json`; the browser keeps a `localStorage` cache (`baykus.uiPrefs`) hydrated from GET `/api/settings` on boot (local non-default prefs migrate up once if the server row is absent). Shape: sections, sorts, library filters, historyCollapsed, skipSectionRemoveConfirm, browseView (`list`\|`grid`). Settings Danger Zone gains two **yellow** actions above the red wipe: **Seçimleri sıfırla** / **Uyarıları sıfırla** (write-through to settings; do not touch library items/watches). <!-- DECISION: 2026-07-17 — chrome prefs belong in localStorage; danger-zone yellow resets them without touching library data. --><!-- DECISION: 2026-07-18 — reversed client-only: prefs live in settings so export/import preserves browse chrome; localStorage is cache only. --> |
| E144 | Next-up carousel on series detail? | When `nextUnwatched` is present, series detail (`/series/$id`) shows a bordered **"Sıradaki:"** / **"Next up:"** carousel (`series.nextUp`) between the header and season list. The current next episode starts centered; earlier non-special episodes are to its left and later non-special episodes to its right, all as full `EpisodeRow`s with the same actions as `SeasonSection`. The rail uses native touch scrolling, mouse grab-to-scroll, hidden scrollbar, and center snap; a drag must suppress the row-details click. Successfully marking an unwatched row schedules a smooth advance to its immediate chronological successor after 1 second. The old progress-line `Sıradaki: SxEy` text is removed; `series.nextUp` is heading-only (no S/E interpolation — `EpisodeLabel` on each row covers that). Unaired episodes (`airDate` in the future) render muted and replace the checkbox with a stacked days-remaining mark (large day count + small localized unit via `Intl`, e.g. `9` / `gün`) — same `EpisodeRow` behavior everywhere, not carousel-only. Null `airDate` keeps a disabled checkbox when a toggle is wired. <!-- DECISION: 2026-07-18 — product ask: browse temporal context around next-up and advance after marking without opening a season. --><!-- DECISION: 2026-07-18 — product ask: unaired rows show countdown instead of a dead checkbox. --> |
| E145 | Relative timeline sections on `/calendar`? | Timeline mode groups days into soft relative buckets instead of one harsh weekday header per day: **Daha önce** / **Geçen hafta** / **Dün** / **Bugün** / **Yarın** / **Bu hafta** / **Daha sonra**. Assignment: yesterday/today/tomorrow win; remaining same ISO week → thisWeek; previous ISO week → lastWeek; else earlier/later. Days stay chronological — "Bu hafta" may appear twice (before dün and after yarın). Multi-day buckets keep quiet weekday subheaders; single-day buckets (dün/bugün/yarın) do not. Bugün stays the E73 scroll anchor (yellow sticky title). Month + schedule modes unchanged. Keys: `calendar.section.*`. <!-- DECISION: 2026-07-18 — product ask: timeline should read as a to-watch feed, not a clinical day list. --> |
| E146 | Series-detail hero layout and image loading? | The detail header becomes a full-width hero within the app's `max-w-5xl` shell (edge-to-edge below `sm`, container-width on desktop). Use only the horizontal `backdropRef` as the background; the portrait `posterRef` is never a background fallback. Cover the hero and add black side gradients on desktop plus a bottom readability gradient. The foreground poster remains on the left at every breakpoint, while title, category, rating, metadata, progress, favorite, and menu stay in the right column. A background image that is not already available fades in over 1200ms after loading; the foreground poster keeps the shared 300ms `MediaImage` behavior and its existing view-transition name. The backdrop is one `absolute inset-0` layer using `object-cover object-top`; `MainShell` suppresses its usual `pt-8` and offsets upward by `--app-header-height` on `/series/$id` (mobile + desktop), placing the hero at viewport top beneath the initially transparent sticky header. Once the page scrolls, E120's translucent blurred stuck state covers scrolled content. No duplicate backdrop image is rendered. Other routes keep normal shell spacing. <!-- DECISION: 2026-07-18 — product ask: detail should read as one cinematic header without losing the poster-to-detail morph. --><!-- DECISION: clarification — the hero background means the series' horizontal backdrop, never its portrait poster. --><!-- DECISION: 2026-07-18 — flush main top padding on series detail so the absolute backdrop isn't offset by shell `pt-8`. --><!-- DECISION: 2026-07-18 — transparent app header overlays one top-aligned hero backdrop at viewport top; no duplicate image. --> |
| E147 | Shared z-index scale + popover stacking? | Stacking lives in `apps/web/src/lib/zIndex.ts` (`Z.content` 10 → `Z.sticky` 30 → `Z.chrome` 40 → `Z.overlay` 100 → `Z.overlayPanel` 110 → `Z.toast` 120). Modal/sheet/popover backdrops and panels, app chrome, filter FAB, and toasts read from that table. Desktop `desktop="popover"` always portals to `<body>` and anchors with `position: fixed` from the nearest positioned ancestor's rect — local stacking contexts (hero `z-10`, sticky headers) must not trap or clip the panel. <!-- DECISION: 2026-07-18 — product ask: series-detail ⋮ menu painted under season rows; centralize z-index and portal popovers. --> |
| E148 | Episode-row still thumbnail? | An `EpisodeRow` without series chrome renders the episode's landscape still as a small `80×48px` thumbnail to the left of its text whenever that row's spoiler content is visible. The thumbnail is omitted when spoiler protection currently hides the unwatched episode, when no still exists, or when loading fails. Series-chrome rows keep their existing portrait poster instead. <!-- DECISION: 2026-07-18 — product ask: visible episode metadata should include the available still directly in season and next-up rows. --> |

## Non-goals

- No new API *resources* beyond the additive `GET /api/search/preview`
  (E131) used by `/series/new`. Settings PATCH gains an additive `uiPrefs`
  field (E143); other data payloads otherwise unchanged.
- No database migrations (except the trivial `episode_label_format` settings
  key, which uses the existing key-value settings table with no schema change).
- No zip schema changes (Article III unaffected).
- No changes to the core category engine, watch logic, or import flows.
- Theme/light-mode work (still parked, unchanged from 001).
- Internationalization of the full genre catalog beyond the top ~30 (diminishing
  returns; fallback to raw English is acceptable).

## Acceptance checklist (definition of done for 009)

<!-- M59.1 browser walkthrough 2026-07-18 (E112–E137 only — E138–E148 belong
to a later phase and are untouched below; see MANUELTEST.md §M59 for the full
per-item evidence). -->

- [ ] All `<select>` elements listed in E113 replaced with segmented button
      groups or year strips. <!-- M59.1: (a)-(c) DEPRECATED 2026-07-18 (xava,
      tasks.md M57.2) — locale/region/theme kept the SettingsSelect popover/
      bottom-sheet idiom instead of segmented pills; live-verified as such.
      (d) Stats YearSelect→YearStrip (E112) IS done, see the next line. -->
- [x] Heatmap year strip and drag-to-pan working on touch + mouse (E112).
- [x] `/watch` scroll anchor reliable (E114, double-RAF).
- [x] "Yaklaşan" tag absent from calendar views (E115); present elsewhere.
- [x] `EpisodeLabel` renders across all SxEy sites; settings toggle works
      (E116).
- [x] `Checkbox` hint visible on episode/season/calendar rows (E117).
- [ ] `StepperInput` replaces the window days number input (E118).
      <!-- M59.1: DEPRECATED 2026-07-18 (xava, tasks.md M57.3) — "Watching
      window (days)" stayed a SettingsSelect row; StepperInput component
      exists and is unit-tested (M53.3) but isn't wired into Settings. -->
- [x] Settings page renders two-column on desktop (E119). <!-- M59.1: real
      bug found+fixed — Danger Zone wasn't spanning both CSS columns
      (`[column-span:all]` added to SettingsPage.tsx), re-verified live. -->
- [x] Desktop navbar shows icon+text; tablet shows icon-only (E120).
      <!-- M59.1: this line's wording predates the 2026-07-18 amendment to
      E120 above (transparent→sticky, pure icon-only balanced row, no text
      at any breakpoint). Verified against the amended decision, which is
      what's live: icon-only nav links with aria-label/title, not icon+text. -->
- [x] Search → detail/preview poster transition animates (E121); new shows
      open `/series/new` with **"İzlemeye başla"** on that page (E131).
      <!-- M59.1: viewTransitionName wiring + click-through + preview page +
      add flow all live-verified; animation smoothness itself is a human-eye
      call per HANDOVER.md precedent, not headless-measurable. -->
- [x] RatingControl repositioned on detail page (E122).
- [x] Category icons render in filter panel, detail badge, watch page headers
      (E123). <!-- M59.1: filter panel + watch headers live-verified; the
      detail-page compact badge sub-part was DEPRECATED 2026-07-18 (xava,
      tasks.md M57.5, "not pursued") — not a failure, a deliberate cut. -->
- [x] Genre tags display in the user's locale for top 30 genres (E124).
- [x] SeasonSection checkboxes aligned, header border consistent (E125).
- [x] SeasonSection expand/collapse animates smoothly (E126).
- [x] WatchDateDialog has split date/time inputs + presets (E127).
- [x] Filter FAB floating bottom-right on mobile + desktop (E128).
- [ ] Library demoted from nav; entry under /watch; landing on /watch (E138).
- [ ] Shared list/grid browse filter; Görünüm switches /watch ↔ / (E139/E140).
- [x] Watch page section headers sticky below the app header (E129).
- [ ] Region flags + tooltip in settings (E130). <!-- M59.1: DEPRECATED
      2026-07-18 (xava, tasks.md M57.2, bundled with E113) — region popover
      lists plain country names, no flag emoji, empty title attribute. -->
- [x] Pull-to-refresh on library/watch/calendar/all-series/favorites triggers
      the manual refresh-all and refetches the visible page (E132).
- [x] Calendar mode tabs sticky below the app header; BUGÜN clears them (E133).
- [x] Month mode tab hidden below `sm`; desktop keeps all three (E135).
- [x] Calendar modes are separate URLs: `/calendar`, `/calendar/month`,
      `/calendar/schedule` (E136).
- [ ] Timeline uses relative sections (Daha önce… Daha sonra) (E145).
- [ ] Series detail uses the full-width backdrop hero with a left poster and
      right-side metadata/actions; a late backdrop fades in slowly (E146).
- [ ] Popovers portal above chrome/sticky via shared `Z` scale (E147).
- [x] Remote images show a spinner until loaded, then fade in (E134).
- [x] Quick-mark on /watch keeps the viewport anchored and animates the row
      into history (E137).
- [x] `pnpm lint && pnpm typecheck && pnpm test` green.
- [x] UI strings in both `tr.json` and `en.json`.
