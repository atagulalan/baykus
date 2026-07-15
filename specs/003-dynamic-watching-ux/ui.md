# UI Spec 003 — Segmented Progress, Posters, Chrome, Watch Page, Settings

Conventions (three data states, optimistic mutations, `/img` handling,
component/file layout, i18n key style) inherited from ui.md 001 + 002. This
doc covers only the changed/new surfaces.

## Layout (changed — sticky header + mobile bottom nav, E36)

```
Desktop (sm+):                          Mobile (<sm):
┌───────────────────────── sticky ┐     ┌──────────────── sticky ┐
│ 🦉 baykuş [🔍] Kütüphane İzleme │     │ 🦉 baykuş  [🔍 ara…]   │
│            Takvim İst. Ayarlar  │     └────────────────────────┘
└─────────────────────────────────┘     │        content         │
                                        ┌──────────────── fixed ─┐
                                        │ ▦    ▶    📅   📊   ⚙ │
                                        │ Ktp  İzl  Tkv  İst  Ayr│
                                        └────────────────────────┘
```

- `<header>` becomes `sticky top-0 z-40` with an opaque `bg-zinc-950` (it
  overlaps scrolled content) + the existing border.
- `sm+`: nav links unchanged inside the header.
- `<sm`: nav links hidden in the header; a `fixed bottom-0 inset-x-0 z-40`
  tab bar renders the same `navItems` array as icon+label tabs. Icons from
  **lucide-react** (`LayoutGrid`, `Play`, `CalendarDays`, `ChartColumn`,
  `Settings` — size ~20). Labels: existing `app.nav.*` keys at ~10px.
  Active route: `text-zinc-100` (inactive `text-zinc-500`), same
  `[&.active]` mechanism as today. Bar background `bg-zinc-950` + top
  border + `pb-[env(safe-area-inset-bottom)]`.
- `<main>` gets mobile-only bottom padding (≥ bar height) so nothing hides
  behind the bar.
- Anchored scrolls (timeline BUGÜN, watch page) get `scroll-mt` matching the
  sticky header height so the header doesn't cover the anchor row.
- **Never FontAwesome; no icon fonts; no CDN assets** (self-host rule).

## SeriesCard + detail header — `SegmentedProgress` (NEW component, E34)

```
sequential, 2/8 in S2 of 4:   ◼ [▰▰▰▱▱▱▱▱] ◻ ◻
all watched:                  ◼ ◼ ◼ ◼
fallback (gap / >12 seasons): ▰▰▰▰▰▰▱▱▱▱   ← today's single bar
```

- Input: `seasonProgress` off SeriesSummary. Pure helper
  `buildProgressSegments(sp): Segment[] | null` decides; `null` → render the
  existing percentage bar (unchanged markup). Unit-test the helper
  (`SegmentedProgress.test.ts`), not the JSX — same pattern as
  `WatchNextRow.test.ts`.
- Squares: small rounded divs (filled `bg-emerald-500`, hollow
  `border border-zinc-700`); frontier bar: a flex-grown track identical in
  style to today's bar, filled `watched/total` of that season.
- Replaces the bar in **SeriesCard** and the **detail header** (both
  currently hand-rolled divs); keep the `watched/aired` text + ✓ overlay
  behavior as is.

## Home / Library `/` — filter panel (fixed, E41)

RESET sets the draft to **Son izlenen + Tümü** (the page-load defaults:
`DEFAULT_LIBRARY_SORT` / `DEFAULT_LIBRARY_CATEGORY`), replacing the
`RESET_SORT = "added"` constant. APPLY semantics unchanged. (Supersedes 002
ui.md "RESET = Tümü + Son eklenen".)

## Calendar `/calendar` (changed — posters, E35)

### Timeline rows
```
▢ [poster] Dark S1E3 · Bölüm adı        [YENİ]   Netflix
   40×56px
```
`h-14 w-10` rounded thumb (same as WatchNextRow), `buildImageUrl(posterRef)`;
null/404 → placeholder block (`bg-zinc-800`), never a broken-image glyph.

### Month cells (desktop)
Compact entry = ~24px-wide 2/3-aspect thumb + the existing
`title SxEy` text beside it; tags stay; `+n` overflow unchanged. Null poster
→ text-only entry (no placeholder — cells are tight).

### Month list (mobile)
Rows switch to the timeline row rendering (with thumbs).

Today-highlight in both modes: already shipped (002 + the 2026-07-15
local-date fix) — re-verify in the checkpoint, no new work.

## Series detail `/series/$id` (changed, E37)

- Season sections sorted client-side: 1, 2, …, n, then Specials (0) last.
- Poster: `w-40 h-auto rounded-lg` (natural aspect, no crop). No-image
  placeholder keeps the current `aspect-[2/3]` box.

## Watch page `/watch` (reworked, E38)

```
İzleme geçmişi                     ← full list on page, oldest→newest
  [poster] Dark S1E1 · Pilot            [SPECIAL]   12 Tem 21:30
  [poster] HotD S2E7 · The Red Sowing   [FİNAL]     Dün 21:12
──────────────────────────────────
Sıradaki bölümler                  ← page opens scrolled HERE
  ▢ [poster] HotD S3E1 +2 · …           [YENİ]
──────────────────────────────────
Bir süredir izlenmedi
  ▢ [poster] Severance S2E3 +5 · …
```

- One shared presentational row (refactor of `WatchNextRow`): poster / title
  / SxEy / episode title / EpisodeTags, with **either** a leading quick-mark
  checkbox (next sections — unchanged behavior, E28/E29 intact) **or** a
  trailing right-aligned relative timestamp (history — existing
  `watch.relativeDay.*` formatting). Keep the exported pure helpers stable.
- History: no `max-h`/inner scroll; renders all fetched entries (still
  default 30, E27 order unchanged). Tags render from the new
  `airDate`/`episodeType` fields.
- Anchor: after load, one-shot `scrollIntoView({ block: "start" })` on the
  "Sıradaki bölümler" heading (replaces the history bottom-anchor effect).
  Respect `scroll-mt` for the sticky header.

## Settings `/settings` (changed, E31 + E39 + E42)

- **General** section gains:
  ```
  İzleniyor penceresi (gün)   [ 30 ]      ← number input, 1–365
  <hint: Bu süre içinde izlenen/eklenen/yeni bölümü çıkan diziler
   İzleniyor'da kalır.>
  ```
  PATCH `{ watchingWindowDays }` via the existing `patch` mutation (save on
  change like the selects; the server zod is the real validator — surface a
  400 as the generic error toast).
- **Notifications** section: while subscribed, a second button
  **Test bildirimi gönder** → reads the current subscription endpoint
  (`getCurrentPushSubscription()`), `POST /api/push/test { endpoint }`,
  success toast on 200 / error toast otherwise.
- **Danger zone** section (new, E42): always visible, red-bordered, below
  Data. One button **Tüm verimi sil** opens `ResetLibraryDialog` — export
  link, a text input that must exactly match `settings.dangerZone.
  confirmPhrase` ("SİL" / "DELETE") before the confirm button enables,
  `DELETE /api/library { confirm: "DELETE" }` on confirm. Success:
  invalidate every query, close the dialog, toast
  `settings.dangerZone.success`; failure: generic error toast, dialog
  stays open.

## i18n keys (new)

- `settings.general.watchingWindow` "İzleniyor penceresi (gün)" ·
  `settings.general.watchingWindowHint` (the hint text above)
  (EN: "Watching window (days)" / matching hint).
- `settings.notifications.test` "Test bildirimi gönder" ·
  `settings.notifications.testSent` "Test bildirimi gönderildi"
  (EN: "Send test notification" / "Test notification sent").
- `settings.dangerZone.{title,description,button,warning,confirmLabel,
  confirmPhrase,confirm,success}` (E42) — see spec.md's E42 row for the
  exact TR/EN copy.
- No other new keys: mobile nav reuses `app.nav.*`; watch/history reuse
  `watch.*`; segmented bar and posters are non-textual. Both catalogs in the
  same commit; parity test guards skew.
