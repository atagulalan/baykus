# Spec 011 — UX Polish Round 4

**Status:** Active · **Owner:** xava · **Created:** 2026-07-18
**Scope:** Web-only UI/UX polish. No core/server schema changes, no new
API endpoints, no zip schema changes. Delta over 001–010; **011 wins on
overlap**.

## Summary

Six product asks from 2026-07-18:

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

## Edge-case decisions (normative)

| # | Question | Decision |
|---|---|---|
| E149 | Spoiler protection vs series poster? | Spoiler protection (`spoilerProtection && !watched`) blurs/hides **episode** content only: episode still thumbnails (E148 omit), episode titles, overviews in the details modal. The series portrait poster on series-chrome `EpisodeRow`s **never** blurs. Series title stays sharp (unchanged). Amends the unspoken implementation that applied `blur-md` to `posterRef`. <!-- DECISION: 2026-07-18 — series poster is identity, not a spoiler. --> |
| E150 | When does the post-watch rating popup open? | **Amends 001 E8 / 009 E122.** After a successful single-episode watch or rewatch on series detail, open the left-of-checkbox rating prompt **only when `myRating === null`**. If the episode already has a rating, skip the prompt. Re-rating remains available via the episode details modal. Dismissal still is not persisted. Bulk / season / watch-page quick-mark stay prompt-free. <!-- DECISION: 2026-07-18 — don't force a re-rate when a rating already exists. --> |
| E151 | Null airDate trailing mark? | **Amends 009 E144 and 002 E29 for trailing affordance.** For unaired / not-yet-markable episodes: (a) future `airDate` → stacked days-remaining countdown (unchanged); (b) `airDate === null` → trailing **TBD** mark (`episode.tbd`, mono, muted) instead of a disabled/hidden checkbox. Watch-page quick-mark still does not offer a clickable checkbox for null/future (E29 mark semantics unchanged) — the trailing slot shows TBD or countdown. Subtitle air-date text stays omitted when null. <!-- DECISION: 2026-07-18 — unknown schedule reads as TBD, not a dead control. --> |
| E152 | Next Up overhaul? | **Supersedes 009 E144's carousel.** When `nextUnwatched` is present and the existing uiPrefs toggle is on (storage key remains `showNextUpCarousel` for settings/zip compatibility), series detail shows a single bordered **Next Up card** between hero and season list — heading `series.nextUp`, one `EpisodeRow` (or equivalent) for the current next episode with the same watch / watch-again / edit-date / bulk-up-to-here / rating-prompt handlers as `SeasonSection`. No horizontal rail, no neighbor episodes, no auto-advance scroll. Settings copy refers to “Next up” / “Sıradaki”, not “carousel”. Unaired next episodes use E151 (countdown or TBD). <!-- DECISION: 2026-07-18 — product ask: one prominent card replaces the carousel. --> |
| E153 | Profile layout + Refresh all location? | **Amends 005 E58 / E66.** Profile top→bottom: banner (010) → identity row (gear → Settings) → **stat tiles** (link to detailed stats) → **favorites rail** → **all-series rail**. Remove the bordered “Detaylı istatistikler” and “Ayarlar” link rows. Remove Refresh all from the profile. Settings → Data section gains the full-width Refresh all button (same `startManualSweep`, n/m progress, `library.refreshAll` / `library.refreshAllDone` toasts). Pull-to-refresh (009 E132) still triggers the same sweep; prose now refers to “Refresh all (Settings → Data)” rather than “the profile’s button”. <!-- DECISION: 2026-07-18 — stats first; chrome links redundant with gear + tile link; refresh belongs with data tools. --> |
| E154 | Search result keyboard navigation? | **Amends 006 non-goal “Search UX changes — no keyboard shortcut”** for *in-list* navigation only (still no global `/` or hotkey to open `/search`). On `/search`, while results are shown: focus stays on the search input (combobox + `aria-activedescendant`); **↓ / ↑** move the highlight among rows (↓ from none → first; ↑ from first → none; no wrap past ends); **Enter** opens the highlighted result in the current tab (same destination as click / E131 — in-library → `/series/i{id}`, else `/series/new?…`); **Shift+Enter** opens that same URL in a new tab (`noopener`); **Escape** clears the highlight (does not clear the query). Reset highlight when the result list identity changes (new query / refetch). Empty / loading / error / hint states: no list keys. Mouse click unchanged; View Transitions apply to same-tab opens only. <!-- DECISION: 2026-07-18 — keyboard users need arrow/Enter/Shift+Enter without Tab-walking rows. --> |

## Non-goals

- No API / schema / zip changes.
- No changes to rating storage (still one rating per episode).
- No redesign of watch-page “Sıradaki bölümler” beyond shared EpisodeRow TBD/countdown.
- No removal of the Settings gear from the profile identity row.
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
- [ ] Search results: ↓/↑ highlight, Enter same-tab, Shift+Enter new tab (E154).
- [x] `pnpm lint && pnpm typecheck && pnpm test` green.
- [x] New/changed UI strings in both `tr.json` and `en.json`.
