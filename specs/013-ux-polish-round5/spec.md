# Spec 013 — UX Polish Round 5

**Status:** Active · **Owner:** xava · **Created:** 2026-07-20
**Scope:** Mostly web UI/UX polish. No core/server schema changes, no new API
endpoints, no zip schema changes. E184 adds a small `provider-tvmaze` mapping
delta (embed confirmed seasons with zero episodes). Delta over 001–012;
**013 wins on overlap**.

## Summary

Product asks from 2026-07-20: soften auth surfaces, modernize empty states and
CTAs, progress chrome, season watch shortcuts, library manage visibility, sort
UI, start-watching copy, exclusive season accordion with auto-advance, modal
size + close icon, series menu icons, and confirmed empty-season TBD panels.

## Edge-case decisions (normative)

| # | Question | Decision |
|---|---|---|
| E167 | Auth panel corners? | **Amends 012 E160 non-goal for page panels.** Login and Claim use soft overlay panel language (`rounded-2xl`, soft shadow, rounded inputs, pill yellow CTA). Auth flow unchanged. |
| E168 | Profile hub empty rails? | Favorites and all-series preview empties on the profile hub use centered display-italic primary + mono hint (same recipe as `library.empty`), not left-aligned mono-only lines. |
| E169 | Calendar empty CTA? | `calendar.empty.suggestAdd` link uses yellow pill CTA (matches browse sort / start-watching pill language), not bordered ghost. |
| E170 | Release status badge? | `ReleaseStatusBadge` uses soft `rounded-full` pill with quieter border/fill; yellow semantics unchanged for returning/in_production. |
| E171 | Progress chrome? | `SegmentedProgress` tracks/fills use `rounded-full`. `CircularProgress` uses softer track stroke; complete check / children API unchanged. |
| E172 | Zero-watch season mark? | When a season has aired episodes, none watched, and mark is available (`canMarkWatched && !canUnwatch`), clicking the season **progress ring** (`SeasonActionsMenu` wrapping `CircularProgress` as SectionHeader `leading`) calls mark-season-watched immediately — no popover/sheet. Partial or complete seasons open the centered season menu from the same ring. Label+count remains the accordion toggle; ring stays outside that button. <!-- DECISION: 2026-07-20 — ring is the season-actions trigger; E166 restored over ⋯. --> |
| E173 | Library all-done empty? | When library has items but no visible grid/list rows (`library.empty.allDone*`), **Manage categories** (`AddSectionBar`) still renders so users can restore sections. Truly empty library (`items.length === 0`) omits it. |
| E174 | All-series sort UI? | `AddSectionBar` `sortOnly` on desktop opens `Modal` `desktop="popover"` anchored to the trigger. Sort choices use SettingsSelect-style listbox rows (check + yellow selected), not native `<select>`. Manage mode keeps centered modal + drag reorder. |
| E175 | Start watching CTA? | Preview hero CTA uses pill chrome matching sort trigger. Pending copy uses `series.adding` (EN “Adding…”, TR “Ekleniyor…”), not `search.loading`. |
| E176 | Season accordion exclusivity? | **Amends 003 ui.md / E47.** Only one numbered season accordion may be open at a time; expand state is owned by the series detail/preview page. Default open = season holding `nextUnwatched` (numbered only). Switching seasons (manual tap or auto-advance after a season **becomes** green-check finished — every announced episode aired and watched; not green-ring-only aired catch-up) runs **close + open + scroll together**. A rAF pin loop keeps the target season header fixed under the sticky chrome while heights change (`pinSeasonHeader`, exp-decay correction); the loop ends when the leaving panel’s close-complete and the target’s open-complete have both fired (event-driven — not `setTimeout`). Collapsing does not pin/scroll. Manually opening an already-finished season stays open (auto-advance only on not-finished→finished). If auto-advance has no next incomplete season, collapse only. Specials (0) follow the same exclusive rule. <!-- DECISION: 2026-07-20 — align advance with green check; see E180. --> |
| E177 | Modal size + close? | **Amends 012 ui.md.** Centered desktop modal accepts `size`: `default` (`max-w-sm`) or `large` (`max-w-lg`). `SeriesDetailsSheet` uses `large`. Sheet and desktop modal headers use top-right `X` icon with `aria-label` from `modal.close`; text “Kapat” close label removed from sheet header. Desktop modal with `title` shows a visible header bar + X. Popovers stay headerless. |
| E178 | Series ⋮ menu icons? | Every `SeriesActionsMenu` row has a leading lucide icon (Heart for favorite; Play for watching/clear manual; Bookmark / CircleX for manual lists; Bell / BellOff for mute; Trash2 for remove). |
| E179 | Series detail bottom gap when seasons collapsed? | **Amended 2026-07-20.** Tab-bar / MainShell bottom padding unchanged (`5.5rem` + safe-area mobile). Collapsed season accordions must not reserve episode-list height: `SeasonSection` unmounts episode rows when `expanded === false` instead of relying on `.section-collapse` `0fr` alone (grid min-size could leave a large void below the last season header). Expanded season keeps the collapse wrapper for open-state styling. |
| E180 | Caught-up season ring when unaired remain? | When every **aired** episode in a season is watched but announced **unaired** episodes remain (`airedCount < announced total`), the season header ring is **full** with a **green** stroke and **no** check — not the green complete check. The trailing count stays the `watched/total` ratio (e.g. `4/14`), not the collapsed plain total. Green check + plain total only when the season has no unaired left and every aired episode is watched. Aired-only fill % (E50) and E165 collapse (`isSeasonComplete` = aired catch-up) are unchanged. **E176 auto-advance uses green-check finished only** (`isSeasonFinished`) — catching up to the check-less green ring must not close the season or open the next. <!-- DECISION: 2026-07-20 — mid-season catch-up must not look finished. --><!-- DECISION: 2026-07-20 — auto-advance must not treat caught-up as finished. --><!-- DECISION: 2026-07-20 — caught-up ring is green without check (was briefly blue). --> |
| E185 | Caught-up SegmentedProgress bead? | **Amends E55 only for the segmented bar.** A season bead is a **green donut** (transparent fill + green border) when that season is aired-caught-up with announced unaired remaining (`watched ≥ total` and `announced > total`) — same predicate as the E180 check-less green `CircularProgress` ring. Finished seasons (`announced === total`) stay solid category accent (green for `up_to_date`). A fully-finished single season with no unaired left (e.g. Pluribus S1 done, S2 not announced) stays **solid green**. `SeasonProgressEntry` gains `announced` for this. Counters, plain-percentage fallback, and stats chart stay E55 green for `up_to_date`. <!-- DECISION: 2026-07-20 — bead tracks the season ring. --><!-- DECISION: 2026-07-20 — donut bead instead of solid blue/green fill. --> |
| E181 | In-progress ring visual cap? | While neither `complete` nor `caughtUp`, `CircularProgress` visually clamps fill to **90%** even when the true value is higher (e.g. 23/24 → ~96%). Keeps a readable gap at the stroke seam so a near-finished season is not mistaken for closed. `complete` / `caughtUp` still draw a full ring. Count text is unchanged. <!-- DECISION: 2026-07-20 — exaggerate openness above 90% for readability. --> |
| E182 | Collapsed seasons gap sticky? | **Amends 011 E165.** `CollapsedSeasonsGap` (“N seasons watched”) is **not sticky** — it scrolls away with the page. Only real season `SectionHeader` pills remain sticky. |
| E183 | Who owns vertical page spacing / hero bleed? | **Amends 009 E146 + 011 E157.** `MainShell` keeps stable vertical geometry: no route-conditional `-mt-[var(--app-header-height)]`, no top padding, and **no** horizontal padding (full-bleed for VT main-box stability). Series detail/preview heroes and the profile banner apply `-mt-[var(--app-header-height)]` on their own root so they bleed under the transparent sticky header. Every other authenticated page opts into top inset via `.page-top` (`2rem`) or `.page-top-flush` (`0` / `2rem` at `sm+` for pull-to-refresh list surfaces). Horizontal exception to E157: **Library / Watch** (`BrowsePage`), **Calendar** (`CalendarPage`), and **Watch History** (`WatchHistoryPage`) opt into a tablet outer gutter on their own root (`sm:px-3 lg:px-0` = 12px until `lg`); other routes stay flush at the shell and use `content-inset` / `list-inset` as before. <!-- DECISION: 2026-07-20 — Layout -mt/pt toggling caused VT main-box jumps; pages own vertical inset. Amended same day — restore non-hero tablet gutter. Amended again — gutter lives on BrowsePage / CalendarPage / WatchHistoryPage, not MainShell, so other screens stay edge-to-edge. --> |
| E184 | Confirmed season with zero episodes? | When a provider confirms a season in its season inventory but that season has **no episodes yet**, keep the season in series detail/preview (`episodes: []`). Header trailing count is **TBD** (`episode.tbd`); expanding the accordion shows a compact empty panel (TBD chip + display-italic title + mono hint via `series.seasonEmpty.*`). Do **not** invent synthetic seasons when the provider has no season row. E50 unchanged: zero-aired / empty seasons stay out of `seasonProgress` squares. Auto-advance / complete rules unchanged (empty seasons are never complete and are skipped as advance targets). TVmaze: `embed[]=seasons` merged with episode grouping so empty confirmed seasons survive refresh. <!-- DECISION: 2026-07-20 — announced empty shells get a TBD panel, not a blank accordion. --> |
| E186 | Watch list section membership? | **Amends 009 E139 + E141.** `/watch` list sections show **every** series in an enabled category (same membership as Library grid `CategorySection`), including rows with `nextUnwatched: null` (caught-up, finished, stopped). Those rows use the no-next chrome (poster + title + next air date or `series.refreshUpToDate`). Default `watchSections` = `HOME_CATEGORY_ORDER` minus `needs_review` (watching, not_watched_recently, not_started, watch_later, up_to_date). Prior factory defaults (`watching`+`not_watched_recently`, or that pair + `up_to_date`) always expand to the new default on read/hydrate. Empty sections still hide; `needs_review` still auto-prepends when non-empty (E156). <!-- DECISION: 2026-07-20 — list must not drop whole categories just because nothing is queued. --> |
| E187 | Library empty panel? | **Amends E168 recipe for full-page library empties.** Truly empty library (`items.length === 0`) and all-done (`library.empty.allDone*`) drop the hard `#101010` bordered box. Soft Search-style empty: icon ring + display-italic title + mono hint + yellow pill CTA (`calendar.empty.suggestAdd` → `/search` when empty; `profile.allSeries` when all-done). Same panel on All-series when empty. E173 manage-categories visibility unchanged. <!-- DECISION: 2026-07-20 — library empty matches Search/Calendar soft empty + pill CTA. --> |

## Acceptance checklist

- [x] Login + Claim soft panels (E167)
- [x] Profile hub empties centered (E168)
- [x] Calendar Dizi ara pill (E169)
- [x] Still Ongoing soft badge (E170)
- [x] Progress rounded (E171)
- [x] Zero-watch ring direct mark (E172)
- [x] Manage categories on all-done empty (E173)
- [x] Sort popover + listbox rows (E174)
- [x] Start watching pill + adding copy (E175)
- [x] Exclusive accordion + auto-advance (E176)
- [x] Modal large + X close (E177)
- [x] Collapsed seasons drop episode DOM (E179)
- [x] Caught-up season ring is green without check + ratio when unaired remain (E180)
- [x] SegmentedProgress caught-up bead is green donut when unaired remain (E185)
- [x] In-progress CircularProgress caps visual fill at 90% (E181)
- [x] CollapsedSeasonsGap not sticky (E182)
- [x] Page-owned top spacing / hero bleed (E183)
- [x] Confirmed empty season TBD panel + TVmaze season embed (E184)
- [x] Watch list shows full section membership + home defaults (E186)
- [x] Library empty soft panel + search CTA (E187)
