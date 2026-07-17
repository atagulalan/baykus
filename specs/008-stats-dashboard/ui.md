# UI 008 — Stats Page

The prototype's own CSS (light/dark tokens, `clr-bg`, hover tooltips) is
**not** ported. Every section re-renders in the app's 006 design language:
`font-display` italic section headings, `font-mono` uppercase micro-labels,
`#101010` tiles with `border-white/5`, yellow accent, film grain untouched.
Page: `/stats` (existing route), sections in the order of spec.md's
inventory table. All strings via i18n (tr default + en).

## Section → treatment

| Section | Treatment |
|---|---|
| Hero | Oversized `font-display` value (total time as `181g 1s` style — new `formatDuration` util: days+hours, hours+minutes under 1 day), sub-line with episodes + series counts. |
| Tiles | Existing `StatTile`, 6-up grid (2-up mobile): tracked, episodes, favorites, watching, finished, watch_later. |
| Son Dönem | 3 `StatTile`s with sub-value (episode count). |
| En Çok İzlediklerim | `HBarList` primitive: label / track / value row, widths relative to max, `title` tooltip. Top 12. |
| İzleme Durumu | `StackedBar` over 7 categories (skip zero segments; **omit `needs_review`**) + wrapped legend with counts. <!-- DECISION: E55's shared yellow collapses adjacent segments — use `CATEGORY_CHART_COLORS` (distinct hue per bucket); terminal hues stay E55-aligned. needs_review is import-review noise and stays out of this chart. --> Uses `CATEGORY_CHART_COLORS`, not the shared badge/progress tokens. |
| Favoriler | Card grid `minmax(220px,1fr)`: title, `N bölüm · %P`, 4px progress bar. |
| Prodüksiyon Durumu | 2 `StatTile`s + alphabetical card grid `watched/aired bölüm`; show 15, `daha fazla` expand (E109). |
| Tür / Network Dağılımı | Two `HBarList`s, top 8 + muted `Diğer` row (full-width track, muted fill); network panel adds a `networkCount` tile. |
| Kalan Bölümler | 2 `StatTile`s (episodes+series, remaining time) + top-10 `HBarList`. |
| Yakalama Hızı | Two `StatTile`s side-by-side (`sm+`): projection (`~N haftada bitirirsin` + estimated calendar date sub) and weekly pace. Whole body hidden when `pace: null` (E100). |
| Yaklaşan Bölümler | 2 `StatTile`s (this/next month with time sub) + `MiniBars` per month + horizon caveat as muted paragraph (copy from prototype). |
| En Hızlı Binge'ler | `HBarList`, label `Title — YYYY-MM-DD`, value `N bölüm`. |
| Tekrar İzlemeler | 2 `StatTile`s + per-series `HBarList`; existing per-episode mostRewatched list stays below it. |
| Haftalık Seri | 3 `StatTile`s (longest, current, most consistent w/ series sub) + per-series `HBarList` (`N hafta`). |
| Haftalık / Aylık Süre | `YearSelect` (mono uppercase segmented `<select>`), split panel: monthly `MiniBars` (12, month initials) + weekly `MiniBars` (ISO weeks, label every ~5th), panel subs show year totals via `formatDuration`. |
| Yıllık Aktivite | Same `YearSelect` group; `Heatmap`: week columns × 7 rows (Mon-first), 11px cells, zero = `bg-white/5`, buckets 1–2/3–5/≥6 as 3 yellow-alpha steps; `Az → Çok` legend; horizontal scroll on mobile. |
| Haftanın Günü / Günün Saati | Side-by-side split (stack on mobile), `MiniBars`; weekday labels Pzt→Paz, hour labels every 3rd. |
| Footer caveat | Muted centered mono paragraph, only when `dated < total`: "Zaman bazlı analizler tarih bilgisi olan {dated} / {total} izlemeye dayanıyor…" (E95). |

## Primitives (new, `apps/web/src/components/stats/`)

- `HBarList` — rows of label/track/value; track `h-2 bg-white/5`, fill
  `bg-yellow` (full accent — `/60` looked washed-out across the page);
  `Diğer` rows use `bg-white/10`.
- `StackedBar` — flex segments, 2px gaps, native `title` tooltips.
- `MiniBars` — vertical bars, fixed height 120px, min-height 2px for
  non-zero, `title` tooltips, muted labels; fill `bg-yellow`.
- `Heatmap` — pure CSS grid; no JS beyond render.
- `YearSelect` — controlled `<select>`, shared state per section pair? No:
  **independent per section** (prototype has two groups; keep them
  independent).

## Interaction & a11y

- No custom hover-tooltip layer: native `title` everywhere (keyboard users
  get values in-row anyway — value text is always rendered, unlike the
  prototype which hid some values in tooltips).
- All charts are decorative duplicates of rendered numbers → `aria-hidden`
  on bar/heatmap visuals, real values in text.
- Loading: reuse existing pulse skeleton pattern (tiles row + 2 panels).
- Empty library: existing `stats.empty` line; sections with no data render
  nothing (no empty panels).
