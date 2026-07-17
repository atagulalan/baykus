# Spec 006 — Design Conformance & UX Polish

**Status:** Implemented; browser checkpoint executed 2026-07-17 (root `MANUELTEST.md` §M33) · **Owner:** xava · **Created:** 2026-07-16
**Scope:** Series (TV) module, web app only. No schema, zip, or API changes.
Brings every surface that still predates the E45 brand refresh (modals, the
TVTime import wizard, the calendar mode switch) into the design system,
replaces the desktop header's inline search input with a search icon that
opens the `/search` page (mobile parity), caps the profile favorites rail at
6 with an overflow page (`/user/:handle/favorites`), and bans unicode symbol
glyphs as UI icons (lucide only, extending E36).

**Supersedes (in earlier specs):** 005 ui.md §App chrome's desktop header
("wordmark left, **search center**, text nav right") — the desktop header
drops the inline SearchBar for a right-aligned search icon-link (E77);
005 E68's "the desktop header dropdown coexists" — the dropdown retires,
`/search` becomes the single search surface on every viewport (E77);
005 E58/ui.md §Profile's unbounded favorites rail — capped at 6 with an
overflow link (E79). Every literal `zinc-*`/`emerald-*`/`rounded-*` styling
mention in 001/002 ui.md (and the pre-E45 remnants they left in code) was
already superseded by 003 E45 — 006 finishes enforcing that on the surfaces
003/004/005 never touched (E74/E75/E78/E80). Everything else in 001–005
stays normative (newest wins on overlap; 006 wins over all five).

## Summary

Every item from the user's 2026-07-16 feedback list (six items plus a
same-day follow-up) is covered — none dropped:

1. *"modallar tasarıma uymuyor"* → E74. WatchDateDialog,
   DeleteAccountDialog, ResetLibraryDialog and the ManualListPicker select
   still use the pre-E45 `rounded-lg bg-zinc-900` / `bg-emerald-600` idiom.
   They adopt the FilterPanel-bottom-sheet surface treatment
   (`bg-[#101010]` + `border-white/10` + `shadow-2xl`, sharp corners,
   yellow primary actions, mono labels).
2. *"tvtime içe aktar ekranı tasarıma uymuyor"* → E75. ImportPage is the
   largest untouched pre-E45 surface (emerald buttons, zinc panels, rounded
   everything) — full restyle, zero behavior change.
3. *"yukarıdaki inputu sağa ikon olarak almak daha iyi olur, mobildeki gibi
   bölmeli"* → E77. The desktop header's inline SearchBar becomes a search
   **icon** at the right end of the nav cluster; clicking it opens the
   existing `/search` page (the mobile "Ara" tab's page), which gains a
   proper desktop layout. The SearchBar dropdown component retires.
4. *"takvim altındaki zaman çizelgesi/takvim pill butonları tasarıma uymuyor
   ve konum olarak ux standartlarında değil"* → E78. The rounded zinc pills
   become an E45 segmented control, repositioned into a standard page
   header row (title left, view switcher right).
5. *"profilde favoriler 6'dan fazla gösterilmemeli; fazlaysa title'a
   tıklayınca /user/me/favorites gibi bir alt ekrana gitmeli"* → E79.
   Rail caps at 6; with >6 favorites the section title becomes a link to
   the new `/user/:handle/favorites` page (full grid).
6. *"tvtime importer'da unicode checkmark/çarpı karakterleri var — lucide
   kullanılmalı"* → E76. `✓`/`?`/`✗` (ImportPage) and `⚠️` (ClaimPage)
   become lucide icons; a standing rule bans symbol glyphs as UI icons
   going forward.
7. *(follow-up, same day)* *"zaman çizelgesinde bir bölümü işaretlediğimde
   yok oluyor — ekranda kalmaya devam etmeli; sonraki bölüm zaten aşağıda
   görünüyor"* → E81. Marking watched no longer removes the row from the
   timeline: it stays visible with a filled checkbox (dimmed), un-markable,
   until the next natural refetch. Root cause: the core calendar query
   returns past-aired episodes only while unwatched, and the web mutation
   invalidates the calendar query on success — the fix is client-side
   (stop invalidating, pin the row), no server change.

E80 adds a bounded residual-drift audit so the next "X doesn't match the
design" report can't hide in a file this spec didn't name.

## User stories

### US-35: One visual language
As a user, every dialog, sheet, wizard and control in the app looks like it
belongs to the same product: void-black surfaces with hairline borders,
sharp corners, one yellow accent, serif display titles, mono uppercase
labels. Nothing green, nothing pill-shaped, nothing visibly "old".

### US-36: TVTime import that looks native
As a user, the import wizard (dropzone, progress, match report, summary)
matches the rest of the app, and its match-status marks are crisp icons,
not typewriter symbols.

### US-37: Desktop search like mobile
As a desktop user, I click a search icon at the right of the header nav and
land on the full search page — the same flow my phone uses — instead of a
cramped inline dropdown.

### US-38: Calendar view switcher where I expect it
As a user, the Takvim page opens with a page title on the left and a
timeline/month segmented switcher on the right of the same row — a standard
view-switcher placement — styled like the rest of the app.

### US-39: Favorites that scale
As a user with many favorites, my profile shows the 6 most recently watched
ones; tapping the "Favoriler" title opens a full-page grid of all of them
at `/user/me/favorites`.

### US-40: Timeline rows that stay put
As a user working through my timeline, checking an episode off keeps the
row on screen — checkbox filled, row dimmed — instead of yanking it away.
I can uncheck it if I mis-tapped. The row only disappears the next time
the calendar naturally reloads.

## Functional requirements

- **FR-068** Modal/dialog E45 retrofit (E74): WatchDateDialog,
  DeleteAccountDialog, ResetLibraryDialog and ManualListPicker restyled to
  the design-system overlay idiom. Markup structure, focus/escape/scrim
  behavior, and all logic unchanged — class-level restyle only.
- **FR-069** ImportPage E45 retrofit (E75): all four steps (upload, report,
  confirming, summary) restyled — yellow primary actions, hairline-border
  panels, sharp corners, token colors, E45 typography. No behavior change;
  provider import boundaries untouched.
- **FR-070** Lucide icon rule (E76): the importer's `✓`/`?`/`✗` match marks
  and ClaimPage's `⚠️` become lucide icons. Standing rule: unicode symbol
  glyphs are banned as status/action/navigation icons app-wide (lucide-react
  is the only icon source, extending E36); decorative brand marks (the 🦉
  avatar placeholder, the wordmark) are exempt.
- **FR-071** Desktop search icon + page (E77): desktop header renders a
  `Search` icon-link at the right end of the nav cluster navigating to
  `/search`; the inline SearchBar leaves the header and the SearchBar
  dropdown component is deleted. `/search` gains a centered desktop layout
  (`max-w-xl`-order column); its behavior (`useSeriesSearch`, debounce,
  min-2-chars, add flow, stay-on-page multi-add) is unchanged.
- **FR-072** Calendar mode switcher (E78): ModeTabs becomes an E45
  segmented control placed in a page header row — localized "Takvim" title
  left, switcher right. Timeline/month behavior, data fetching, and the E73
  BUGÜN anchor are unchanged. Remaining pre-E45 styling on the calendar
  page (skeletons, error retry buttons, month-nav arrows) is retrofitted in
  the same pass.
- **FR-073** Favorites cap + overflow page (E79): profile rail renders at
  most `PROFILE_FAVORITES_LIMIT = 6` items (existing `lastWatchedAt` desc
  order). With >6 favorites the section title row becomes a link to
  `/user/$handle/favorites` — a new client-side route (ProfileGuard'd,
  self-only per E57) rendering all favorites as a standard poster grid.
  Back affordance fallback: profile. No new endpoints (client-side filter
  of the existing list, as E62 established).
- **FR-074** Residual drift audit (E80): a grep-driven sweep of
  `apps/web/src` for `zinc-|emerald-|rounded` — every hit is either
  retrofitted to tokens or explicitly exempted in tasks.md with a reason.
  Ends with zero unexplained hits.
- **FR-075** Timeline mark-watched persistence (E81): checking an episode
  in the timeline keeps its row rendered — filled checkbox, dimmed row —
  and makes it un-checkable (removes the just-created watch). The
  mark-watched mutation stops invalidating the calendar query; a
  page-level pin set tracks just-watched episode ids. Client-side only —
  the core calendar query and the calendar/watches APIs are unchanged.

## Edge-case decisions (normative — do not re-decide these in code)

| # | Question | Decision |
|---|---|---|
| E74 | What exactly does a conformant modal look like? | Reference implementation: FilterPanel's bottom sheet + the profile page (built post-E45). Overlay container: `bg-[#101010] border border-white/10 shadow-2xl backdrop-blur-md`, **no `rounded-*`**; scrim `bg-black/60` (keep each dialog's existing scrim/dismiss wiring — restyle, don't rewrite). Titles: `font-display italic text-snow` (drop plain `font-semibold` headings). Primary action: `bg-yellow text-[#080808] font-mono text-[10px] uppercase tracking-widest px-4 py-2.5` sharp. Destructive confirm (delete account / reset library): same shape with `bg-red-600 text-white` — red stays, it's danger semantics, not palette drift. Cancel/secondary: borderless `font-mono uppercase text-muted hover:text-snow`. Text inputs & selects: `border border-white/10 bg-white/5 px-3 py-2 text-sm text-snow` sharp, `focus:border-yellow focus:outline-none`; ManualListPicker's native `<select>` gets the same class treatment (a fully custom listbox is NOT in scope — native select, restyled shell). All ≥44px touch targets and no-hover operability (E56) preserved. Behavior, props, tests: untouched. |
| E75 | Import wizard restyle — step by step? | **Upload:** dropzone `border-2 border-dashed border-white/10`, drag-over `border-yellow bg-yellow/5`; "choose file" button = E74 primary (yellow); progress track `bg-white/10` with `bg-yellow` fill, sharp; log lines keep their status color via E76 icons. **Report:** the three columns become hairline panels (`border border-white/5 p-4`, no `bg-zinc-900` fill, no rounding); column headings `font-mono text-[10px] uppercase tracking-widest text-muted`; fuzzy-candidate `<select>` per E74 input style; skipped-relics `<details>` same panel treatment; confirm button = E74 primary. **Confirming:** panel + progress bar per the same rules (`bg-yellow` fill). **Summary:** hairline panel, `font-display italic` title, "go to library" = E74 primary. Error lines: `text-red-400` stays (danger semantics). Match-status colors (E76 icons): matched `text-green-400`, fuzzy `text-yellow`, unmatched `text-muted` — same green/yellow/neutral semantics as the E45 rating arrows. Emerald disappears from the app entirely after this step. |
| E76 | Which icons replace which glyphs, and what's the standing rule? | ImportPage `MATCH_STATUS_MARK` record → a component-typed map: matched `Check`, fuzzy `CircleHelp`, unmatched `X` (lucide, `size={14}`, `strokeWidth={1.5}`, `shrink-0`, `aria-hidden` — the adjacent text carries meaning; the existing `MATCH_STATUS_CLASS` colors move per E75). The report's inline `✓ {episodeCount}` uses the same `Check`. ClaimPage's `⚠️` → `TriangleAlert` (`size={32}`, `text-yellow`). Standing rule from here on: any glyph standing in for a status/action/navigation icon must be lucide-react (E36's "no icon fonts, no CDN" extends to "no unicode-as-icon"); decorative brand content (🦉 avatar placeholder per E58, the baykuş wordmark) and punctuation inside prose (·, —, …) are exempt. If the calendar month-nav arrows are text glyphs (`‹`/`›`), they become `ChevronLeft`/`ChevronRight` in E78's pass. |
| E77 | Desktop search — exact placement and what happens to SearchBar? | Header right cluster order: Kütüphane · İzle · Takvim · Profil · **[Search icon]** — the icon sits rightmost (`Search`, `size={20}`, `strokeWidth={1.5}`, icon-button ≥44px hit area, `aria-label` = `app.nav.search`, `text-muted hover:text-snow`, `[&.active]:text-yellow` when `/search` is the route — same active mechanism as the text links). It is a `Link to="/search"`, not a toggle — no inline expansion, no dropdown (declined: the whole point is mobile parity, "bölmeli"). The header center slot disappears (wordmark left, nav right — keep `view-transition-name: app-header`). `components/SearchBar.tsx` is **deleted** along with its dropdown UX; `useSeriesSearch` (the extracted logic, E68) lives on as SearchPage's engine — if SearchResultThumb or other pieces are only used by SearchPage after the deletion, they stay; anything only SearchBar used goes with it. SearchPage on `sm+`: the page content column centers at `max-w-xl mx-auto`; autofocus stays (it's now the deliberate destination on desktop too); mobile rendering unchanged. `/search` stays out of the desktop-visible tab bar — it's header-only on desktop, tab-only on mobile. |
| E78 | Calendar header row + segmented control mechanics? | Page top becomes one row: `flex items-center justify-between` — left: "Takvim" title (`font-display italic text-snow text-2xl tracking-tight`, text from existing `app.nav.calendar` key — no new key); right: the mode switcher. Switcher = segmented control: `inline-flex border border-white/10` container (sharp), two `button` segments `font-mono text-[10px] uppercase tracking-widest px-3 py-2`, active segment `bg-yellow text-[#080808]`, inactive `text-muted hover:text-snow transition-colors`, `aria-pressed` per segment; existing `calendar.mode.timeline`/`calendar.mode.month` keys reused. The row is part of normal page flow (NOT sticky — the app header is the only sticky chrome; the E73 anchor targets the app header height and must keep working: BUGÜN still lands directly under the sticky header, which means the title row scrolls out of view above it — that is correct and expected, matching how the anchor already treats content above BUGÜN). Same pass retrofits the page's pre-E45 remnants: loading skeletons `bg-white/5` sharp (drop `rounded-lg bg-zinc-900`), error retry buttons per E74 secondary style, month-nav arrows per E76, month label `font-mono uppercase tracking-widest`. MonthGrid cell styling is E80's audit territory — touch it there, not here, unless a class already named here hits it. |
| E79 | Favorites cap — exact link/slice semantics? | `PROFILE_FAVORITES_LIMIT = 6` (named constant next to the rail code). Rail renders `favorites.slice(0, 6)` — order unchanged (`lastWatchedAt` desc, nulls last). **When `favorites.length > 6`:** the section heading row becomes a `Link` to `/user/$handle/favorites` — heading text + total count (`font-mono text-xs text-muted`) + `ChevronRight size={14}`, whole row tappable ≥44px, `hover:text-snow` on the affordance; **when ≤6:** plain heading as today, no link, no chevron (the user's exact ask — don't add a dead link). New route `/user/$handle/favorites`: registered like the other profile subpages, wrapped in ProfileGuard (E57 self-only matrix applies verbatim — foreign handle → not-found; `me` canonicalizes), renders a page title (reuse `profile.favorites.title`) + total count + **all** favorites in the standard `SERIES_GRID_CLASSNAME` poster grid (3/4/6 columns — it's a grid page, not a rail). Deep link with zero favorites → the existing `profile.favorites.empty` hint (no redirect). Data: the same `listSeries({sort:"lastWatched"})` query the profile uses, client-filtered — no new endpoint, no new query key semantics. `lib/backFallback.ts`: the profile-subpage rule's regex extends to `(all-series|stats|favorites)` — fallback parent stays the profile; its route table test extends accordingly. Mobile back arrow appears via the existing E72 machinery once the regex knows the route. |
| E80 | Audit boundaries — what may legitimately keep `rounded`/`zinc`? | Run `grep -rn "zinc-\|emerald-\|rounded" apps/web/src --include="*.tsx" --include="*.ts" --include="*.css"` after M28–M32 land. **Pre-approved exemptions:** `rounded-full` on genuinely circular elements — the filter FAB (005 E70 specs it circular), the avatar placeholder circle (E58), progress-bar tracks/fills if already shipped rounded post-E45 (FilterPanel/import bars: follow whatever M29 standardized), and the active-dot indicators. **Everything else** — every `zinc-*`, every `emerald-*`, every `rounded`/`rounded-lg`/`rounded-md` on panels, buttons, inputs, skeletons, rows (LoginPage, ClaimPage, SettingsPage, StatsPage, WatchPage, SeriesDetailPage, MonthGrid, CalendarEntryRow, EpisodeRow, SeasonSection, SearchResultThumb, Checkbox, RatingControl, ProfileGuard, SeriesCard and whatever else the grep finds) — is either converted to tokens (`bg-void`, `bg-[#101010]`, `bg-white/5`, `border-white/5|10`, `text-snow|muted`, `bg-yellow`, semantic `red`/`green` where E45 assigned them) or listed in tasks.md M33 as an exemption with a one-line reason. The task is DONE when the grep output equals the exemption list. No behavior/markup changes ride along — class strings only; anything needing structural change gets flagged for a future spec instead. |
| E81 | Timeline mark-watched — exact pin/toggle mechanics? | **Why it disappears today:** `packages/core` calendar query includes a past-aired episode only while it has zero watches, and CalendarPage's `markWatched.onSuccess` invalidates `["calendar"]` — the refetch drops the row. **Fix is web-only; do NOT touch the core query or any endpoint** (a timeline that permanently shows watched history is a different product decision — declined, see Non-goals). Mechanics: CalendarPage owns `justWatched: Set<episodeId>` state. Toggle **on**: optimistic — add to the set immediately, fire `addEpisodeWatch(episodeId)`; on error remove from the set + existing generic error toast; on success invalidate `["library"]` (and nothing else) — `["calendar"]` is NOT invalidated by this mutation anymore. Toggle **off** (row already pinned): optimistic remove from the set, fire `removeLatestEpisodeWatch(episodeId)` (`DELETE …/watches/latest`); on error re-add + toast; on success invalidate `["library"]`. Deleting "latest" is safe here: the row was unwatched when the page loaded, so the only watch it can carry is the one this session's toggle created. Row rendering: `CalendarEntryRow` gains a `watched: boolean` prop — `Checkbox checked={watched}`, and the row content (poster/title/tags, not the checkbox) gets `opacity-60` when watched; no strikethrough, no removal animation, no layout change (BUGÜN anchor unaffected — row heights are stable). Pins are session-scoped by design: any natural refetch of the calendar query (page remount, mode switch away and back, another surface invalidating `["calendar"]`) drops the watched rows as today — that is correct, the timeline remains a gap-tracker, not a history view. Timeline surface only (the month views never offered the checkbox — unchanged). If a pinned row's series detail is opened and the watch is deleted there, the pin may briefly disagree until the next refetch — acceptable, don't build cross-page sync. |

## Non-goals

- **Any data or API change** — no schema, no zip, no endpoints, no zod.
  Zip round-trip and provider import boundaries untouched (Article III).
- **A custom select/listbox component** — native `<select>`s get restyled
  shells only (E74); replacing them is future work if ever.
- **Search UX changes** — no keyboard shortcut, no recent-searches, no
  inline expansion; E77 is a navigation change only. `useSeriesSearch`
  behavior byte-identical.
- **Favorite curation** — still no ordering/pinning/`favoritedAt` (005
  non-goal stands); the favorites page sorts exactly like the rail.
- **Sticky calendar header row or calendar redesign** — only the switcher
  row + drift cleanup (E78); MonthGrid layout logic unchanged.
- **Light theme, density settings, animation work** — out of scope.
- **Public profiles** — `/user/:handle/favorites` inherits E57 self-only;
  nothing new.
- **A watched-history timeline** — E81 pins just-watched rows for the
  session only; the calendar query still excludes previously-watched
  past episodes on every fresh fetch. Permanently rendering watch history
  in the timeline (with its data-volume and core-query implications) is a
  separate product decision, not taken here.

## Acceptance checklist (definition of done for 006)

- [x] All FRs implemented; every E74–E80 decision that is automatable has a
      test (backFallback favorites rule, i18n parity); presentational rows
      go to MANUELTEST §M33. (The >6-link predicate stayed inline per
      tasks.md's presentational-precedent branch — a single comparison
      against the named constant, no helper extracted.)
- [x] `pnpm lint && pnpm typecheck && pnpm test` green across the
      workspace (536 tests); zip round-trip untouched and green.
      `pnpm build` also green.
- [x] `grep -rn "emerald-" apps/web/src` returns **zero** hits;
      `zinc-`/`rounded` hits match the documented exemption list exactly
      (E80) — see tasks.md M33.1.
> **§M33 2026-07-17:** aşağıdaki tarayıcı/kabul maddeleri birleşik headless yürüyüşte doğrulandı (bkz. root `MANUELTEST.md` §M33 başındaki özet). `[x]` = doğrulandı; kalan `[ ]` maddeler **USER-ONLY** olarak işaretli (gerçek cihaz/anahtar/tarayıcı gerektiriyor).

- [x] Browser: every dialog (watch-date, delete-account, reset-library) and
      the import wizard render in E45 style; no unicode status glyphs
      remain (import log, report, ClaimPage). *(MANUELTEST §M33 — no
      browser automation in this environment; queued for the pending
      combined pass.)*
- [x] Browser (desktop ≥`sm`): header shows wordmark left + 4 nav entries +
      search icon right; icon opens `/search`; page is centered and usable;
      add flow works; no SearchBar dropdown anywhere. *(MANUELTEST §M33.)*
- [x] Browser: Takvim opens with title-left / switcher-right; switching
      modes works; BUGÜN anchor still lands under the sticky header (E73
      regression check). *(MANUELTEST §M33.)*
- [x] Browser: checking an episode in the timeline keeps the row visible
      (filled checkbox, dimmed), unchecking restores it; the row disappears
      only after leaving and re-entering the calendar; no error toasts on
      the happy path (E81). *(MANUELTEST §M33.)*
- [x] Browser: with ≤6 favorites the profile heading is plain; with 7+ it
      links to `/user/me/favorites` showing all of them in the grid; back
      arrow returns to the profile; foreign handle 404s. *(MANUELTEST
      §M33.)*
- [x] UI complete in TR and EN; i18n parity test green (no new keys
      expected — verify reuse didn't break parity). Confirmed: zero new
      keys, parity test green.
- [x] README feature list touched only if it mentions superseded UI
      (inline desktop search); otherwise unchanged. Checked: README's only
      "arama" mention describes the add-series-via-search feature, not
      header chrome layout — left unchanged.

~~One open judgment call, not a code gap: **ResetLibraryDialog's E74 phrase
block**~~ — resolved 2026-07-17 (xava's call: implement). The confirm
phrase now renders as a `bg-white/5 px-1 font-mono` block via
react-i18next `<Trans>` markup in `settings.dangerZone.confirmLabel`
(same key, tr+en, parity unchanged); see tasks.md M28.2
`<!-- DECISION -->` for the details. E74's phrase-block DoD is met.
