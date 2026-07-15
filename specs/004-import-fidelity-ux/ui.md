# UI Spec 004 — Import Wizard Relics, Progress Values, Transitions, URLs

Conventions (three data states, optimistic mutations, `/img` handling,
component/file layout, i18n key style, E45 design system) inherited from
ui.md 001 + 002 + 003. This doc covers only the changed/new surfaces.

## Standing rule (E56 — normative from here on)

No interaction may **require** hover. Hover styling (`hover:` classes) is
allowed only as a redundant enhancement of an affordance that is fully
visible and operable by touch and keyboard. Any future PR adding a
hover-revealed control violates this spec.

## Import wizard `/import` (changed — skipped relics, E49)

Report step, below the matched/fuzzy/unmatched summary line:

```
✓ 214 eşleşti · 12 belirsiz · 3 eşleşmedi
▸ 3 kalıntı takip atlandı (izleme kaydı yok)          ← collapsed disclosure
    Troy · Gotham · Hinterland – Y Gwyll               ← names on expand
```

- Rendered only when `skippedRelics.length > 0`; a `<details>`-style
  disclosure (reuse the existing collapse pattern if one exists, else a
  simple open/close state — no new dependency).
- Copy explains *why* (no watch events + unfollowed), so the user trusts the
  skip instead of hunting for "missing" shows.
- The names come verbatim from the export (`name` field).

## SeriesCard + series detail (changed — links, morph names; E51/E52)

- `SeriesCard`'s link params use `seriesParam(series)` (TMDB id when
  present, `i<id>` otherwise). Poster **container** gains
  `style={{ viewTransitionName: `poster-${series.id}` }}` (internal id).
- Detail header poster container gets the same name for its item. Nothing
  else on either page is named — only the poster pairs.
- `CalendarEntryRow`, `MonthGrid`, `WatchNextRow`/`EpisodeRow` links carry
  only `itemId` → they link `i<id>` unconditionally. Do not widen calendar/
  history payloads for this; the detail page canonicalizes the URL anyway.

## Series detail `/series/$id` (changed — param resolution, E52)

- `parseSeriesParam` decides: bare number → fetch by-tmdb, 404 → fallback to
  internal fetch; `i`-prefix → internal fetch. One React Query keyed by the
  raw param string.
- After data settles: if `seriesParam(detail) !== param`, replace-navigate to
  the canonical param (no history entry). Guard: only when different —
  no loops.
- Not-found (both lookups miss) → the existing error/empty state, unchanged.

## Page transitions (new — E51)

- Router: `defaultViewTransition: true` (see plan.md — verify option name on
  the installed version).
- `index.css` additions:
  - root cross-fade tuned to ~160ms
    (`::view-transition-old(root), ::view-transition-new(root)
    { animation-duration: 160ms; }`)
  - chrome opts out: header wrapper `[view-transition-name:app-header]`,
    mobile tab bar `[view-transition-name:app-tabbar]` (arbitrary-property
    Tailwind classes or plain CSS — either is fine)
  - reduced-motion kill-switch per plan.md (all `::view-transition-*`
    animations `none`).
- Behavior matrix: Chrome/Edge/Safari 18+ → morph + fade; Firefox <139 →
  instant (router no-ops); `prefers-reduced-motion: reduce` → instant
  everywhere.

## SegmentedProgress (values-only change — E50)

No component change. A caught-up series (all aired watched) now receives
`watched == total` for every emitted season and renders all-filled squares
via the existing branch; announced-but-unaired seasons no longer appear.
The plain fallback bar was already aired-based — unchanged.

## i18n keys (new)

- `import.skippedRelics` — TR `"{{count}} kalıntı takip atlandı (izleme kaydı
  yok)"` · EN `"{{count}} stale follows skipped (no watch history)"`
- `import.skippedRelicsHint` — TR `"TV Time'da takipten çıkarılmış ve hiç
  izleme kaydı olmayan diziler içe aktarılmaz."` · EN `"Shows you unfollowed
  on TV Time with no watch history are not imported."`
- No other new keys: transitions, URLs, and progress changes are
  non-textual. Both catalogs in the same commit; parity test guards skew.
