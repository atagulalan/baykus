# Plan 011 — Technical Plan for UX Polish Round 4

**Spec:** [spec.md](spec.md) · **Base:** 001–010 (stack unchanged).

## Core idea: web-only, two parallel tracks

011 touches only `apps/web` presentation + settings page wiring. No
migrations, no new endpoints, no zip changes. Storage key
`showNextUpCarousel` is kept for ui_prefs / zip compatibility; only
user copy changes.

## What changes where

| Package / app | Change |
|---|---|
| `apps/web` — `EpisodeRow.tsx` | No blur on series poster; TBD trailing mark for null airDate |
| `apps/web` — `airDateLabel.ts` | `unairedTrailingState()` helper (`countdown` \| `tbd` \| `none`) |
| `apps/web` — `SeriesDetailPage.tsx` | Gate rating prompt on `myRating`; mount `NextUpCard` |
| `apps/web` — `NextUpCard.tsx` (NEW) | Single next-episode card; delete `NextEpisodeCarousel.tsx` |
| `apps/web` — `ProfilePage.tsx` | Reorder sections; remove link rows + refresh button |
| `apps/web` — `SettingsPage.tsx` | Refresh all in Data section |
| `apps/web` — i18n | `episode.tbd`; rename Next Up settings labels |
| `apps/web` — SearchPage + helpers | E154 keyboard combobox (↓/↑/Enter/Shift+Enter) |

## Parallel owns

| Track | Owns | Must not touch |
|---|---|---|
| A (M62) | EpisodeRow, airDateLabel, SeriesDetailPage, NextUpCard, carousel delete | ProfilePage, SettingsPage |
| B (M63) | ProfilePage, SettingsPage | EpisodeRow, SeriesDetailPage, Next Up |

i18n catalogs: additive / label renames only; both tracks may add
namespaced keys.

## Risks

1. **E29 vs TBD** — keep quick-mark non-clickable for null/future; only the
   visual trailing slot changes.
2. **uiPrefs key** — do not rename `showNextUpCarousel` in storage/DTO.
3. **Settings columns layout** — Refresh all lives inside the Data card
   (`break-inside-avoid`), not as a separate column-spanning block.
