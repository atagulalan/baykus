# Component accessibility (apps/web)

Contributor-facing audit of the baykuş web UI (`apps/web/src/`). Use this
when building or reviewing components so new work moves the codebase toward
**WCAG 2.1 Level AA** rather than introducing new gaps.

## Overview

**Estimated maturity: ~55–65% toward WCAG 2.1 AA.**

The UI already has solid foundations — semantic landmarks, i18n-backed labels,
and several reference implementations for keyboard-driven patterns. The main
gaps cluster around **focus management in overlays**, **click-only interactive
surfaces**, **live announcements**, and **data visualizations that hide content
from assistive technology**.

### What works well

- **i18n labels** — user-visible strings and `aria-label` values come from
  `react-i18next` keys, not hard-coded English/Turkish in components.
- **Landmarks** — `Layout` renders `<main>`; `AppTabBar` is a `<nav>` with
  labelled icon links; page headings use `PageTitle` (`<h1>`).
- **Reference patterns** — `SearchPage` (combobox + listbox), `Checkbox`
  (custom checkbox), and `RatingControl` (toggle group) are good templates to
  copy.
- **Storybook a11y addon** — `@storybook/addon-a11y` is installed; violations
  surface during component development (see [Testing](#testing)).

### Top gaps (fix first)

| Gap | Affected areas | Priority |
|---|---|---|
| Modal focus trap, initial focus, `aria-labelledby`, focus restore | All dialogs/sheets using `Modal` | **High** |
| Click-only row opens modal (`EpisodeRow`) | Season list, calendar, watch rails | **High** |
| Toasts not announced (`aria-live`) | Global feedback (`lib/toast.tsx`) | **High** |
| Stats charts hide data from AT | `Heatmap`, `HBarList` | **High** |
| No skip link | `Layout` | **High** |
| Custom select missing listbox semantics | `SettingsSelect` | **High** |
| Progress bars lack proper semantics | `SegmentedProgress`, `SeasonSection` | **Medium** |
| No automated axe tests in CI | Vitest suite | **Medium** |

---

## Standards target

**WCAG 2.1 Level AA** for all user-facing UI in `apps/web`.

Practical interpretation for this codebase:

- **Perceivable** — text alternatives for non-text content; information not
  conveyed by colour alone; visible focus indicators.
- **Operable** — full keyboard access; no keyboard traps (except intentional
  modal traps); skip navigation; sufficient touch targets (existing 44px-ish
  header/tab targets are a good baseline).
- **Understandable** — consistent navigation; labels and instructions via i18n.
- **Robust** — valid roles/states; works with screen readers and keyboard-only
  use.

---

## Component patterns

Paths are relative to `apps/web/src/`. Status meanings:

- **Good** — meets target patterns; minor polish only.
- **Partial** — usable but missing one or more AA expectations.
- **Gap** — significant blocker for keyboard or screen-reader users.

### Atoms

| Path | Status | Key a11y notes | Known gaps | Priority |
|---|---|---|---|---|
| `components/atoms/Checkbox/Checkbox.tsx` | **Good** | `button` + `role="checkbox"`, `aria-checked`, optional `aria-label` | No `Space`/`Enter` key handler (click only) | Low |
| `components/atoms/RatingControl/RatingControl.tsx` | **Good** | `fieldset` + `aria-label`; toggle buttons with `aria-pressed` | — | Low |
| `components/atoms/SettingsSelect/SettingsSelect.tsx` | **Gap** | Trigger is a native `<button>`; options are buttons inside `Modal` | No `aria-expanded`, `aria-haspopup="listbox"`, or `role="listbox"` / `role="option"`; selected state not exposed to AT | **High** |
| `components/atoms/SegmentedProgress/SegmentedProgress.tsx` | **Partial** | Visual-only progress; colour not sole indicator when paired with counts elsewhere | No `role="progressbar"`, `aria-valuenow/min/max`, or text alternative | **Medium** |
| `components/atoms/PageTitle/PageTitle.tsx` | **Good** | Renders `<h1>` | Page must ensure one per route | Low |
| `components/atoms/MediaImage/MediaImage.tsx` | **Partial** | Passes through `alt` to `<img>`; loading spinner is decorative | Callers must supply meaningful `alt`; some omit or use empty alt | Medium |
| `components/atoms/ReleaseTime/ReleaseTime.tsx` | **Good** | Text content with i18n | — | Low |
| `components/atoms/EpisodeLabel/EpisodeLabel.tsx` | **Good** | Plain text / semantic spans | — | Low |

### Molecules

| Path | Status | Key a11y notes | Known gaps | Priority |
|---|---|---|---|---|
| `components/molecules/Modal/Modal.tsx` | **Partial** | `role="dialog"`, `aria-modal="true"`, Escape closes, scroll lock, backdrop button with `aria-label` | No focus trap; no initial focus move; no `aria-labelledby`/`aria-describedby`; no focus restore on close; centered modal has no labelled title when `title` omitted | **High** |
| `components/molecules/ConfirmDialog/ConfirmDialog.tsx` | **Partial** | Native buttons; `<h2>` title inside dialog | Inherits all `Modal` focus/label gaps; title not wired to `aria-labelledby` | **High** |
| `components/molecules/SortMenu/SortMenu.tsx` | **Partial** | Icon trigger has `aria-label`; radio group inside modal | Inherits `Modal` gaps; desktop popover lacks listbox/menu semantics | Medium |
| `components/molecules/SeriesCard/SeriesCard.tsx` | **Partial** | `Link` with `contents` layout; prefetch on focus/hover | Progress bar inside card has no AT semantics; rating icon may lack text alternative | Medium |
| `components/molecules/SearchResultThumb/SearchResultThumb.tsx` | **Partial** | Poster image with alt from series title | Decorative treatment depends on caller | Low |
| `components/molecules/SectionHeader/SectionHeader.tsx` | **Good** | Heading hierarchy in section chrome | — | Low |
| `components/molecules/PullToRefresh/PullToRefresh.tsx` | **Partial** | Touch gesture for refresh | No AT announcement of refresh state; gesture-only on some paths | Medium |
| `components/molecules/CalendarEntryRow/CalendarEntryRow.tsx` | **Partial** | Composes `EpisodeRow` | Inherits `EpisodeRow` keyboard gap | **High** |
| `components/molecules/AddSectionBar/AddSectionBar.tsx` | **Good** | Button with visible/i18n label | — | Low |
| `components/molecules/CastRail/CastRail.tsx` | **Partial** | Horizontal scroll region | No roving tabindex / arrow-key pattern for rail items | Low |

### Organisms

| Path | Status | Key a11y notes | Known gaps | Priority |
|---|---|---|---|---|
| `components/organisms/EpisodeRow/EpisodeRow.tsx` | **Gap** | Checkbox and links are keyboard-accessible; opens details modal on row click | Main row is a `<div onClick>` with no `role`, `tabIndex`, or keyboard handler — details unreachable by keyboard alone | **High** |
| `components/organisms/SeasonSection/SeasonSection.tsx` | **Partial** | Expand/collapse is a `<button>`; season checkbox has `aria-label` | Progress divider uses `role="progressbar"` on a 1px decorative rule — misleading semantics; no `aria-expanded` on season toggle | **Medium** |
| `components/organisms/ScheduleGrid/ScheduleGrid.tsx` | **Partial** | Drag-to-pan scroll surface (documented biome ignore) | Grid cells lack structured table/list semantics; keyboard pan not implemented | Medium |
| `components/organisms/SeriesActionsMenu/SeriesActionsMenu.tsx` | **Partial** | Menu actions via `Modal` popover | Inherits `Modal` focus gaps; menu button pattern incomplete | Medium |
| `components/organisms/SeriesDetailsSheet/SeriesDetailsSheet.tsx` | **Partial** | Sheet via `Modal` with title on mobile | Inherits `Modal` gaps | **High** |
| `components/organisms/CategorySection/CategorySection.tsx` | **Partial** | Section headings + sort menu | Depends on child component gaps | Medium |
| `components/organisms/ProfilePhotoUpload/ProfilePhotoUpload.tsx` | **Partial** | File input + button pattern | Verify label association and error announcements | Medium |
| `components/organisms/MonthGrid/MonthGrid.tsx` | **Partial** | Calendar grid layout | Date cells need clearer button/link roles and labels | Medium |

### Dialogs

All dialogs compose `Modal` unless noted. They inherit its focus-management gaps.

| Path | Status | Key a11y notes | Known gaps | Priority |
|---|---|---|---|---|
| `components/dialogs/EpisodeDetailsModal/EpisodeDetailsModal.tsx` | **Partial** | Sheet title on mobile; action buttons; `RatingControl` | Inherits `Modal` gaps; spoiler blur may confuse AT unless `aria-hidden` on blurred block | **High** |
| `components/dialogs/WatchDateDialog/WatchDateDialog.tsx` | **Partial** | Date presets as buttons | Inherits `Modal` gaps | **High** |
| `components/dialogs/UnwatchSeasonDialog/UnwatchSeasonDialog.tsx` | **Partial** | Uses `ConfirmDialog` | Inherits confirm + modal gaps | **High** |
| `components/dialogs/RestoreBackupDialog/RestoreBackupDialog.tsx` | **Partial** | File picker + confirm flow | Inherits modal gaps; upload status not live-announced | Medium |
| `components/dialogs/ResetLibraryDialog/ResetLibraryDialog.tsx` | **Partial** | Destructive confirm | Inherits confirm + modal gaps | **High** |
| `components/dialogs/TmdbKeyDialog/TmdbKeyDialog.tsx` | **Partial** | Labelled text input | Inherits modal gaps | Medium |

### Layout

| Path | Status | Key a11y notes | Known gaps | Priority |
|---|---|---|---|---|
| `components/layout/Layout/Layout.tsx` | **Partial** | `<main>` landmark; auth gate | **No skip link** to main content | **High** |
| `components/layout/Layout/AppHeader.tsx` | **Good** | Back button `aria-label`; desktop nav links | Icon-only controls rely on `aria-label`/`title` | Low |
| `components/layout/Layout/AppTabBar.tsx` | **Good** | `<nav>` with `aria-label` per tab via i18n | Icon-only — labels must stay in sync with i18n keys | Low |

### Pages & page-local components

| Path | Status | Key a11y notes | Known gaps | Priority |
|---|---|---|---|---|
| `pages/search/SearchPage.tsx` | **Good** | `role="combobox"` input; `role="listbox"` / `role="option"`; arrow keys, Enter, Escape; `aria-activedescendant` | Loading/error states are plain text (consider `aria-live="polite"`) | Low |
| `lib/toast.tsx` | **Gap** | Visual toast stack | No `aria-live` region; success/error not announced | **High** |
| `pages/profile/stats/components/ActivityHeatmap/Heatmap.tsx` | **Gap** | Tooltips via `title` only | All cells `aria-hidden`; data invisible to screen readers | **High** |
| `pages/profile/stats/components/HBarList/HBarList.tsx` | **Gap** | Label + value text in DOM | Bar track `aria-hidden`; no summary for AT | **High** |
| `pages/profile/stats/components/StatTile/StatTile.tsx` | **Good** | Label and value as text | — | Low |
| `pages/settings/SettingsPage.tsx` | **Partial** | Checkbox rows with biome-documented label pattern | `SettingsSelect` gaps affect multiple rows | **High** |
| `pages/series/SeriesDetailPage.tsx` | **Partial** | Composes season sections and hero | Inherits `EpisodeRow` / `SeasonSection` gaps | **High** |
| `pages/calendar/CalendarPage.tsx` | **Partial** | Calendar entries via `EpisodeRow` | Inherits row keyboard gap | **High** |
| `pages/browse/BrowsePage.tsx` | **Partial** | Grid of `SeriesCard` | Inherits card progress gaps | Medium |
| `pages/profile/stats/StatsPage.tsx` | **Partial** | Text stats sections OK | Heatmap / bar chart sections are gaps | **High** |

---

## Cross-cutting requirements

Apply these whenever you touch interactive UI.

### Modal focus trap

When `Modal` opens (sheet or centered dialog):

1. Move focus to the first focusable element (or the dialog container with
   `tabIndex={-1}`).
2. Trap `Tab` / `Shift+Tab` inside the dialog.
3. On close, restore focus to the element that opened the dialog.
4. Wire `aria-labelledby` to the visible title (`<h2>`) when present.

Popovers may optionally allow focus to leave; sheets and centered modals must
trap.

### Keyboard access

- Every click-only `<div>` that performs an action needs `role="button"` or
  should be a `<button>`, plus `onKeyDown` for `Enter`/`Space`, or be replaced
  by a link/button.
- Composite widgets (combobox, listbox, menu) must implement the expected key
  map — copy `SearchPage` + `lib/searchListKeyboard.ts`.
- Do not rely on hover-only affordances for essential actions.

### Live regions

- **Toasts** — wrap the toast container in `aria-live="polite"` (errors may
  use `assertive`).
- **Async feedback** — import/export, save, and refresh states should announce
  completion or failure.
- **Loading** — prefer visible text; add `aria-busy` on the updating region
  when content swaps significantly.

### Progressbar semantics

Use `role="progressbar"` only on elements that represent progress:

```tsx
<div
  role="progressbar"
  aria-valuenow={watched}
  aria-valuemin={0}
  aria-valuemax={total}
  aria-label={t("…")}
>
```

Provide a text alternative (e.g. `"3 of 10 episodes watched"`) either visible
or via `aria-label`. Do not put `role="progressbar"` on decorative 1px
dividers (`SeasonSection`).

### Skip link

Add a visually hidden skip link as the first focusable element in `Layout`:

```html
<a href="#main-content" class="skip-link">Skip to main content</a>
```

Set `id="main-content"` on `<main>`.

### Focus-visible

There is no global `:focus-visible` style today. Interactive elements should
show a clear focus ring (e.g. yellow outline) that meets **2.4.7 Focus
Visible**. Prefer `:focus-visible` over `:focus` so mouse clicks do not show
rings unnecessarily.

### i18n labels

- All `aria-label`, `aria-labelledby`, button text, and placeholders must use
  `t("…")` keys.
- Do **not** edit `i18n/tr.json` or `i18n/en.json` manually — follow the
  project's i18n workflow for new keys.
- Icon-only controls (`AppTabBar`, header actions, sort trigger) require
  `aria-label` even when `title` is present.

---

## Testing

### Storybook a11y addon

Configured in `apps/web/.storybook/main.ts` (`@storybook/addon-a11y`).

Current preview setting (`apps/web/.storybook/preview.ts`):

```ts
a11y: {
  test: "error",
},
```

Story tests (`pnpm test:storybook`) run the same axe checks in CI — violations fail the suite.

Run locally:

```bash
cd apps/web && npm run storybook
```

Use the **Accessibility** panel on each story.

### Storybook component tests (Vitest browser)

Stories run as real browser tests via `@storybook/addon-vitest` (Chromium /
Playwright). Config: `apps/web/vitest.storybook.config.ts` + root
`vitest.workspace.ts`.

```bash
pnpm test:storybook          # all stories (smoke + a11y todo)
pnpm test                    # unit tests only (packages + apps)
pnpm test:all                # unit + storybook
```

First-time setup needs Playwright Chromium:

```bash
pnpm --filter @baykus/web exec playwright install chromium
```

In Storybook UI (`pnpm storybook`), the **Test** widget runs the same suite
with live status on each story.

### Component unit tests (vitest-axe)

`vitest-axe` is wired in `apps/web/src/test/setup.ts`. Use it in `*.test.tsx`
for targeted a11y assertions on components under test (see example below).

```ts
import { axe } from "vitest-axe";

it("has no a11y violations", async () => {
  const { container } = render(<Checkbox … />);
  expect(await axe(container)).toHaveNoViolations();
});
```

### Manual keyboard checklist

Before merging UI changes:

- [ ] Tab through the page — order is logical; no invisible focus traps.
- [ ] Operate all actions with keyboard only (no mouse).
- [ ] Escape closes every modal/sheet/popover.
- [ ] Focus returns to trigger after closing overlays.
- [ ] Screen reader (VoiceOver/NVDA) announces toasts and dynamic updates.
- [ ] Zoom to 200% — layout usable; no horizontal scroll on primary flows.
- [ ] Verify both **tr** and **en** locales for label length and truncation.

---

## Implementation roadmap

Phased plan from the audit. Complete Phase 1 before treating AA as in reach.

### Phase 1 — Blockers (highest impact)

1. **`Modal`** — focus trap, initial focus, `aria-labelledby`, focus restore.
2. **`EpisodeRow`** — keyboard-accessible row (button/link or key handler) to
   open details; keep checkbox/link stopPropagation.
3. **Toasts** — `aria-live` container; distinguish error vs success in text.
4. **Skip link** — `Layout` + `main` id.
5. **Automated axe** — add vitest-axe; baseline tests for Modal, Checkbox,
   SearchPage; enable Storybook `a11y.test`.

### Phase 2 — Semantics & data exposure

1. **`SettingsSelect`** — listbox pattern (`aria-expanded`, `aria-controls`,
   `role="listbox"` / `role="option"`, `aria-selected`).
2. **Stats** — `Heatmap` and `HBarList`: expose data as text table or
   `aria-label` per row/cell; remove blanket `aria-hidden` where it hides
   meaning.
3. **`SegmentedProgress`** — proper progressbar or visible text summary.
4. **`SeasonSection`** — fix progressbar misuse; add `aria-expanded` on season
   toggle.

### Phase 3 — Polish & coverage

1. Global **`focus-visible`** styles in `index.css`.
2. Remaining **Partial** dialogs and menus — audit after Modal fix lands.
3. **`ScheduleGrid` / `MonthGrid`** — structured semantics or documented
   keyboard alternatives.
4. **`PullToRefresh`** — status announcements.
5. Expand Storybook a11y to all organisms; track violations to zero in CI.

---

## Reference implementations

Copy these patterns when building new interactive components.

### SearchPage combobox — `pages/search/SearchPage.tsx`

Full keyboard-driven combobox:

- Input: `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-autocomplete="list"`, `aria-activedescendant`.
- List: `role="listbox"` with `role="option"` items and `aria-selected`.
- Keys: ArrowUp/Down, Enter, Escape — see `lib/searchListKeyboard.ts`.

### Checkbox — `components/atoms/Checkbox/Checkbox.tsx`

Custom-styled control without sacrificing semantics:

- Native `<button type="button">` with `role="checkbox"` and `aria-checked`.
- Documented biome exception explaining why not `<input type="checkbox">`.

### RatingControl — `components/atoms/RatingControl/RatingControl.tsx`

Toggle group for mutually exclusive options:

- Wrapping `<fieldset aria-label={…}>`.
- Each option is a `<button aria-pressed={…}>` with visible text labels from i18n.

When adding a new atom or molecule, check these three first before inventing a
new ARIA pattern.
