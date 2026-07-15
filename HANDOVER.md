# HANDOVER — Spec 003 implementation complete, one checkpoint left

**From:** implementing session (Claude Sonnet, 2026-07-15) ·
**To:** whoever runs the final browser pass (xava, or the next agent once a
browser tool is available) ·
**Status:** Spec 003 (`specs/003-dynamic-watching-ux/`) is fully implemented,
M14.1 through M17.14, one task per commit, full green gate
(`pnpm lint && pnpm typecheck && pnpm test && pnpm build`) after every
commit. **Only M17.7 remains** — the consolidated browser pass, now
covering M17.9–M17.14 too (see below).

## What's left

**M17.7 CHECKPOINT 003** — a full browser walkthrough of every
`MANUELTEST.md` section for spec 003 (M14.7, M15.4, M16.4, M17, **and the
M17.9–M17.14 section added this session**) **in both locales**, plus a
spot-check of the 002 milestones (M10–M13) for regressions, then check the
M17.7 box in
[`specs/003-dynamic-watching-ux/tasks.md`](specs/003-dynamic-watching-ux/tasks.md)
and commit. This is explicitly left for a human/browser-capable session —
no browser-automation tool was available while implementing (confirmed
again this session: no chromium/playwright in this environment either).

## What was done this session (M17.9–M17.14, out-of-plan)

A second implementing session found a large batch of uncommitted,
partially-broken work already sitting in the working tree (not from
tasks.md — no task numbers, a duplicate prop that failed typecheck,
missing i18n keys, non-project code formatting) and a standalone
`brand-identity.html` design mockup at the repo root. Reviewed it, fixed
what was broken, retroactively wrote it up as new out-of-plan milestones
(same pattern M17.8 established), and shipped it as six commits:

- **M17.9** (E43) — two TV Time parser bugs found against a real GDPR
  export: a stale `for_later` status could override a show's current
  active/archived state; `collapseDriftingDuplicates` could drop a
  duplicate watch's season/episode numbers depending on file order.
- **M17.10** (E44) — `POST /api/import/tvtime` now streams per-show
  matching progress over SSE (same pattern `/confirm` already used); the
  import wizard shows a progress bar + live match log.
- **M17.11** (E45) — brand refresh: new void/snow/muted/yellow dark theme,
  DM Serif Display/DM Sans/JetBrains Mono, lucide arrow icons replacing
  emoji, new shared `Checkbox` primitive. Design reference now lives at
  `specs/003-dynamic-watching-ux/design/brand-identity.html`. Fixed a
  `lang="en"` regression back to `"tr"` along the way (leaked from the
  mockup; no runtime lang-switching exists).
- **M17.13** (E46, no M17.12 — renamed into M17.11 mid-session, see
  tasks.md's own note at M17.13) — `SeriesCard` drops its hover action
  buttons; they (plus mute/unmute) now live in one "⋮" menu on the series
  detail page. Extracted a shared `lib/categoryColors.ts` (was duplicated 3×).
- **M17.14** (E47) — episode row's "⋮" dropdown replaced by checkbox-
  driven modals ("mark up to here?" / watch-again-edit-unwatch sheet);
  `SeasonSection`'s button becomes a checkbox, auto-collapses when
  complete.

Bugs fixed along the way (found during review, not part of the original
diff's intent): `EpisodeRow.tsx` had a duplicate `onBulkUpToHere` prop
(TS2300, failed typecheck) and was formatted with single-quotes/no-
semicolons (not this project's Biome style); four new modal strings and
the series-menu aria-label were missing from both i18n catalogs (English
fallback text would've shown in the Turkish-default UI); `Checkbox` and
one `<label>` wrapping it needed `biome-ignore` a11y comments (custom
button-based checkbox, not a native input); `index.css`'s new `@theme`
block needed `css.parser.tailwindDirectives: true` in `biome.json`, which
wasn't set. All caught by running the full gate per commit, not just
trusting the diff. Mechanically verified beyond the gate: `pnpm dev` +
curl smoke check (server health, real dev library via
`/api/library/series`, web root serving the new markup), server stopped
cleanly after.

Also still outstanding from **spec 002** (never blocking, just not yet
confirmed):
- `specs/002-watch-categories/tasks.md` M11.4 and M12.4 checkboxes — the
  underlying features are implemented and green on tests, but the boxes are
  reserved for a human browser pass (matches the M10.8 precedent).
- `specs/002-watch-categories/spec.md` §Acceptance checklist — same five
  browser-only lines, same reason.
- **M9.2** (hosted deployment) stays blocked on the user's credentials — do
  not attempt.

**MANUELTEST.md** has every section written and waiting: M10.8 (done),
M11.4, M12.4, M13.1, M14.7, M15.4, M16.4, M17 — walk them all in one pass,
check items as you confirm them in the browser, then check the tasks.md
boxes listed above (both 002's leftovers and 003's M17.7).

## What was done this session (spec 003, M14–M17.6)

- **M14** — category engine v2 (E30/E33): a manual add lifts to `watching`
  for a configurable window even with zero watches; a dormant-but-watched
  show's new episode lifts it too (never reaching zero-watch items); window
  length is now a setting (`watchingWindowDays`, default 30, 1–365); zip
  bumped to schemaVersion 3 carrying `added_via` (v1/v2 default to
  `import:zip` on import, never flooding İzleniyor).
- **M15** — `seasonProgress` on summaries; `SegmentedProgress` component
  (season squares + frontier bar, falls back to the plain bar on any
  skip-around watch history or >12 seasons); series detail polish
  (Specials last, poster renders uncropped).
- **M16** — sticky header on all viewports; mobile bottom tab bar
  (lucide-react icons, no FontAwesome); poster thumbnails in the calendar
  timeline, month grid, and mobile month list; filter panel RESET now
  restores the actual page defaults (was a stale `"added"` constant).
- **M17** — watch history entries carry `airDate`/`episodeType`; the watch
  page's history rows now share the same visual row component as
  watch-next/stalled sections (poster/title/SxEy/tags + trailing relative
  timestamp instead of a boxed text list), full list rendered (no inner
  scroll), page opens anchored to "Sıradaki bölümler"; `POST /api/push/test`
  sends a fixed payload to exactly the requesting subscription (404/410
  cleanup, generic 500 mapping for anything else); Settings gained a "Test
  bildirimi gönder" button.

## Notable decisions made along the way (see tasks.md `<!-- DECISION -->`
notes for full detail on each)

- Fixed a stale-migration-ordering bug: 0001's journal `"when"` timestamp
  was ahead of real wall-clock time, silently causing drizzle's migrator to
  skip 0002 (only applies migrations with a later `"when"` than the last
  applied one). Bumped 0002's journal `"when"` by 1ms past 0001's.
- Rungs 1–2/4–5 of the category engine stayed byte-identical to 002 as
  required; a few pre-existing test *fixtures* needed their filler-episode
  air dates moved outside the window, because E33's new-episode lift now
  legitimately fires on dates that used to be inert filler.
- Closed a real test-coverage gap found during the M17.5 acceptance walk
  (same situation 002's M13.1 hit): extracted E37's season-sort comparator
  into `apps/web/src/lib/seasons.ts` and unit-tested it. E35/E36/E37(b)/E41
  remain presentation-only with no unit test by design — covered by
  MANUELTEST.md instead, called out explicitly in spec.md's checklist
  rather than silently marked done.

## Hard guardrails — still true, still enforced

- Never weaken the zip round-trip test (Article III) — still green,
  unweakened, at schemaVersion 3.
- No `addedVia` default of `'manual'` in any import path — verified
  test-covered (tvtime confirm, zip v1/v2 import all default correctly).
- lucide-react only in `apps/web`, per-icon imports, no FontAwesome/icon
  fonts/CDN.

Delete this file once M17.7 (and 002's leftover boxes) are confirmed and
checked — it's a working document, not permanent documentation.
