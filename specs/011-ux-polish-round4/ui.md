# UI Spec 011 — UX Polish Round 4

Conventions inherited from ui.md 001–010. This doc covers only changed
surfaces.

## Shared page title (E158)

Standard top-level page headings render through `PageTitle`:
`font-display text-2xl italic tracking-tight text-snow`. Pages continue to
own title-row layout, `content-inset`, controls, and mobile visibility.
Series entity titles, authentication headings, and empty-state messages are
not page-chrome titles and retain their context-specific typography.

## EpisodeRow — spoiler + trailing marks (E149 / E151)

Series-chrome rows (`itemId` + `seriesTitle` + `posterRef`):

- Poster: always sharp (`opacity-90`); never `blur-md` under spoiler
  protection.
- Episode title under the series title: still blurs when spoilers hide.
- Episode still thumbnail (season / next-up, no series chrome): still
  omitted when spoilers hide (E148).

Trailing mark priority (right of the row, before/instead of checkbox):

```
future airDate     →  stacked countdown (N / gün|day)
null airDate       →  TBD  (episode.tbd)  — muted mono, not clickable
aired / watchable  →  checkbox / ×N rewatch control (unchanged)
```

## Post-watch rating popover (E150)

Same E122 placement (left of checkbox). Opens only when
`myRating === null` after a successful single watch or rewatch on series
detail. Already-rated episodes: no popup; details modal still exposes
`RatingControl`.

## Next Up card (E152 — replaces E144 carousel)

```
┌────────────────────────────────────────────┐
│                 Sıradaki:                  │
│  [still]  Title                            │
│           S1E6 – air / TBD / countdown  ☐  │
└────────────────────────────────────────────┘
```

- Bordered section (`border border-white/5 bg-[#101010]`), heading
  centered `series.nextUp`.
- One episode only = `nextUnwatched` resolved against season inventory.
- Same handlers as `SeasonSection` rows (toggle / watch-again / edit-date /
  bulk / rating prompt).
- Settings toggle (uiPrefs key `showNextUpCarousel`) still gates visibility;
  labels say “Next up” not “carousel”.

## Profile `/user/$handle` (E153 — amends 005)

Top → bottom:

1. Banner (010)
2. Identity row (avatar, title, Settings gear)
3. **Stat tiles** (link to `/user/$handle/stats`) — time / episodes / active
4. **Favorites** rail
5. **All series** rail

Removed: bordered Detailed stats + Settings link rows; profile Refresh all.

## Settings → Data (E153)

Inside the Data section card, after export / import / TV Time import, a
full-width Refresh all button:

- Same `startManualSweep` + n/m progress + done/error toasts as before.
- Uses existing `library.refreshAll` / `library.refreshAllDone` keys.

## Search `/search` keyboard (E154)

Combobox pattern — focus stays on the search input while results exist:

| Key | Action |
|-----|--------|
| ↓ | Highlight next row (from none → first; stop at last) |
| ↑ | Highlight previous row (from first → none; stop at none) |
| Enter | Open highlighted row, or first row if none highlighted (E131) |
| Shift+Enter | Same target as Enter, in a new tab |
| Escape | Clear highlight (query unchanged) |

Visual: highlighted row uses the same lighten as hover (`bg-white/5` or
stronger active tint). a11y: input `role="combobox"` +
`aria-activedescendant`; list `role="listbox"`; rows `role="option"` +
`aria-selected`. No on-screen shortcut legend.

## Browse / contextual header actions (E155 / E160 / E133)

```
Desktop page heading:
Watch                              [grid]
Library                            [list]

Mobile app-header right slot (fixed h-11 w-11):
/watch, /     → destination browse toggle (grid / list)
/calendar*    → destination schedule toggle
/user/$handle → Settings
other         → empty spacer (wordmark stays centered)
```

- Desktop: destination-view toggle stays right-aligned in the page heading.
- Mobile: the same browse toggle lives in the header right slot; page heading
  omits it (`hidden sm:flex`) so it is not duplicated.
- Mobile Library (`/`): centered navbar text is the localized Library title
  instead of the baykuş wordmark; the entire in-page title row is hidden.
- Watch shows the grid icon; Library shows the list icon.
- History icon removed — touch pull-to-history on both surfaces opens
  `/watch/history` (E160). Pull-to-refresh stays on all-series / favorites /
  calendar / watch-history.
