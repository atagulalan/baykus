# Spec 008 — Stats Dashboard (TV Time Panosu parity)

**Status:** Approved (xava, 2026-07-16 — E95 flag, single long page, full scope,
Monday-first all confirmed via AskUserQuestion) · **Owner:** xava · **Created:** 2026-07-16
**Scope:** Rebuild the full statistics surface prototyped in root
`dashboard.html` (generated 2026-07-02 from a TV Time GDPR zip) as a native
part of the app: core stat aggregates, one extended API endpoint, and a
restructured Stats page. Delta over 001–007; **008 wins on overlap**.

## Why

`dashboard.html` is a one-off static export: it proves which statistics are
worth having, but it is computed from the raw TV Time CSVs, hand-generated,
and dies the moment the library changes. The app already owns all the
underlying data (items, episodes, watches, tracking, ratings, favorites,
categories, release status, genres, networks, air dates, runtimes), so every
panel can be recomputed live from the DB. This spec maps **every panel of the
prototype** to an app-native definition and records where the app's own model
deliberately diverges from the prototype's CSV-derived numbers.

## Prototype inventory → app definition

Every section of `dashboard.html`, in page order. "Dated watches" =
watch rows not flagged `dateUnknown` (E95). Watch time always uses the E13
runtime fallback (episode `runtimeMin`, else item `episodeRunTimes` average,
else 0).

| # | Prototype panel | Contents in prototype | App definition |
|---|---|---|---|
| 1 | Hero | 181g 1s · 7.171 bölüm · 262 dizi | Total watch time over **all** watch events (rewatches count), distinct episodes watched, tracked item count. |
| 2 | Stat tiles ×6 | Takip Edilen 262 / İzlenen Bölüm 7.171 / Favori 18 / İzleniyor 14 / Bitirilen 132 / Sonraya Bırakılan 10 | `seriesCount`, `episodesWatched`, `favoritesCount` (new), and `itemCount.watching / .finished / .watch_later` from the existing category counts. |
| 3 | Son Dönem | Son 7 Gün, Son 30 Gün, Bu Ay — each time + episode count | Rolling 7-day and 30-day windows ending now, plus the current calendar month in the client timezone (E96). Dated watches only. |
| 4 | En Çok İzlediklerim | Top 12 series by total watch time, hbar chart | Top 12 items by summed watch time over all watch events (rewatches count) (E110). |
| 5 | İzleme Durumu | Stacked bar over 6 TV Time buckets + legend | Stacked bar over the app's **own 8 categories** in `CATEGORY_ORDER` (E97); data already in `itemCount`. |
| 6 | Favoriler | 18 cards: watched count, %complete, progress bar (has >100% anomalies) | All favorites, sorted by watched-episode count desc; completion = distinct watched / aired episodes, so ≤100% by construction (E108). |
| 7 | Prodüksiyon Durumu | Hâlâ Devam Ediyor 47 / Bitti 215 + grid of ongoing shows with watched/total | Ongoing = `releaseStatus ∈ {returning, in_production}` (E18's set, E109); ended = everything else incl. NULL. Grid lists ongoing items alphabetically with watched/aired counts. |
| 8 | Tür Dağılımı | Top 8 genres by watched-episode count + Diğer (multi-counted; sums ≫ total) | Distinct watched episodes attributed to **every** genre of their item (overlap allowed); top 8 + `other` remainder (E98). |
| 9 | Network Dağılımı | Takip Edilen Network 51 tile; top 8 networks + Diğer (sums ≈ total ⇒ primary-only) | Each watched episode attributed to its item's **first-listed** network only; top 8 + `other`. `networkCount` = distinct primary networks across tracked items (E98). |
| 10 | Kalan Bölümler | 137 bölüm / 14 dizi / 2g 17s + top 10 series by remaining | Backlog = aired, unwatched, non-special episodes across **active-trio** items (E22 scope; E99). Top 10 by remaining count; remaining time via E13. |
| 11 | Yakalama Hızı | Haftada ~4 bölüm (son 2 ay) + "~39 haftada bitirirsin" projection | Pace = dated watch events in the last 56 days ÷ 8, 1 decimal; projection = ceil(backlog ÷ pace) weeks, omitted when pace = 0 (E100). |
| 12 | Yaklaşan Bölümler | Bu Ay 17 bölüm 9s 57dk / Gelecek Ay 0 + per-month mini chart + horizon caveat | Unwatched episodes with `airDate` ≥ today across active-trio items, bucketed by calendar month (E101). Keep the prototype's "providers only know a few weeks ahead" caveat verbatim in UI copy. |
| 13 | En Hızlı Binge'ler | Top 10 (series, day) same-day episode counts, e.g. B99 33 eps on 2019-05-19 | Top 10 (item, local calendar day) pairs by distinct episodes watched that day, count ≥ 2, dated watches only (E102). |
| 14 | Tekrar İzlemeler | Toplam Tekrar 1 / Tekrar İzlenen Bölüm 1 + per-series bars | `rewatchSummary`: totalRewatches = Σ(watchCount−1) over episodes with >1 watch; rewatchedEpisodes = count of such episodes; top 10 series by rewatch count (E103). Existing per-episode `mostRewatched` (E86) stays. |
| 15 | Haftalık Seri | En Uzun Genel Seri 32 hafta / Güncel Seri 4 / En İstikrarlı Dizi (Suits 16) + top 10 per-series | Streak = consecutive ISO weeks each containing ≥1 dated watch; current streak alive if it includes this or the previous ISO week; per-series variant top 10; most-consistent = argmax (E104). |
| 16 | Haftalık / Aylık İzleme Süresi | Year select (2015–2026); monthly minutes chart, weekly minutes chart, year total | Per year with ≥1 dated watch: 12 monthly minute buckets (calendar year) + ISO-week minute buckets (ISO week-year), year total (E105). |
| 17 | Yıllık Aktivite | Year select; GitHub-style day heatmap, tooltip `date + N bölüm`, 3-shade legend | Per-day dated watch-event counts (non-zero days only in payload); intensity buckets 1–2 / 3–5 / ≥6 + zero (E106). |
| 18 | Haftanın Günü | Episode counts per weekday, **Sunday-first** | Dated watch events per local weekday, **Monday-first** (tr convention; deliberate divergence, E107). |
| 19 | Günün Saati | Episode counts per hour 0–23 | Dated watch events per local hour 0–23 (E107). |
| 20 | Footer caveat | "Zaman bazlı analizler … 3.099 / 7.171 bölüme dayanıyor" | `datedWatches: { dated, total }` counts; Stats page footer renders the same caveat when `dated < total` (E95). |

## Edge-case decisions (normative)

| # | Question | Decision |
|---|---|---|
| E95 | TV Time rows without any timestamp get `toIso(undefined)` = import-run `now()`, which would dump ~4k watches onto the import day and poison every time-bucketed stat. How do stats stay honest? | Add `watches.date_unknown` (bool, default false). The tvtime importer flags watch events whose raw record had no usable timestamp; `addWatch` persists the flag. `watchedAt` fallback behavior is **unchanged** (still import-run now(); `lastWatchedAt`, sorts, dedupe untouched). Every time-bucketed stat (§3, 11, 13, 15, 16, 17, 18, 19) excludes flagged watches; totals (§1, 2, 4, 5–10, 12, 14) include them. Stats payload exposes `datedWatches {dated,total}`; footer caveat shown when they differ. Pre-008 imported rows all read as dated until the user re-imports the zip (documented limitation; re-import is the backfill path). Re-import duplication of dateless watches (fresh now() each run) is a pre-existing issue and stays **out of scope**. |
| E96 | Day/week/month/hour bucketing needs a timezone; SQLite has none. | `GET /api/stats` gains optional `?tz=<IANA name>`. Server buckets in TypeScript via `Intl.DateTimeFormat` with that zone (DST-correct); invalid or absent `tz` → UTC. Web always sends the browser zone. |
| E97 | Prototype's stacked bar uses TV Time's 6 buckets. | The app's own 8 `WatchCategory` buckets in `CATEGORY_ORDER` win. Zero-count categories are skipped in the bar but kept in the legend. |
| E98 | Genre vs network attribution differ in the prototype (genre sums ≫ total, network sums ≈ total). | Deliberate: genres multi-count (an episode counts toward every genre of its item), networks attribute each episode to the item's **first-listed** network only. Both use distinct watched episodes, top 8 + `other` remainder; genre `other` may exceed the true total (overlap) — documented, not a bug. Items with no genres/networks fall into `other`. |
| E99 | Backlog scope? | Aired (airDate ≤ today), unwatched, non-special (season > 0) episodes over items in the **active trio** (E22: watching, not_watched_recently, up_to_date — the latter contributes 0 by definition). `seriesCount` counts trio items with ≥1 remaining episode. |
| E100 | Pace window and projection? | Dated watch events in the last 56 days ÷ 8 → episodes/week, 1 decimal. `projectedWeeks = ceil(backlog.episodes / pace)`; both `null` when the window has 0 dated watches. UI hides the panel body then. |
| E101 | Upcoming scope/horizon? | Active-trio items, unwatched episodes with `airDate ≥ today` (local), bucketed by calendar month from the current month to the last month with data; always emit current + next month even when 0. Time via E13. Horizon caveat is UI copy, not data. |
| E102 | Binge definition? | (item, local day) pairs over dated watches, distinct-episode count ≥ 2, top 10 by count desc then date desc. |
| E103 | Rewatch summary semantics? | Same >1-watch episode set as E86. `totalRewatches` = Σ(watchCount−1); `rewatchedEpisodes` = episode count; `bySeries` top 10 = Σ per item of (watchCount−1), desc. |
| E104 | Week/streak arithmetic? | ISO-8601 weeks (Mon-start) on **local** dates. Overall streak = longest run of consecutive ISO weeks with ≥1 dated watch. Current streak counts backward from the current ISO week and survives if its last week is the current **or previous** week (an empty in-progress week doesn't break it). Per-series streaks: same per item, top 10; `mostConsistent` = the argmax item. |
| E105 | Weekly vs monthly year attribution? | Monthly buckets use the local **calendar year**; weekly buckets use the **ISO week-year**. A late-Dec/early-Jan watch may land in adjacent years across the two charts — accepted. Year list = years with ≥1 dated watch, desc; UI defaults to the newest. |
| E106 | Heatmap intensity? | Fixed buckets on daily watch-event count: 0 (empty), 1–2, 3–5, ≥6. Payload carries only non-zero days; the client renders the full year grid. |
| E107 | Weekday order / hour basis? | Weekday chart is Monday-first (diverges from the prototype's Sunday-first on purpose). Hour chart buckets local hour 0–23. Both dated-watch events. |
| E108 | Favorites completion >100% in the prototype (TV Time counted specials/dupes)? | App computes distinct watched non-special episodes ÷ aired non-special episodes — capped by construction. All favorites listed, watched-count desc. |
| E109 | Production status source? | `items.releaseStatus`: ongoing iff `∈ {returning, in_production}` (same set as E18); everything else incl. NULL counts as ended. Ongoing grid sorted by title; UI shows 15 with an expand control. |
| E110 | Most-watched-by-time counts rewatches? | Yes — Σ over all watch events per item, E13 runtime per event. Top 12 (prototype shows 12). |
| E111 | One endpoint or two? | Extend `GET /api/stats` (single fetch, one query cache). All new fields are **additive**; existing fields (`episodesWatched`, `watchTimeMin`, `itemCount`, `episodesPerMonth`, `ratingDistribution`, `mostRewatched`) keep their exact shapes and semantics. `episodesPerMonth` becomes UI-unused (superseded by `timeByYear`) but is not removed. |

## Non-goals

- No changes to `watchedAt` fallback semantics, `lastWatchedAt`, watch dedupe,
  or import idempotency for dateless rows (E95 records the limitation).
- No per-user/multi-profile stats; the endpoint stays session-scoped like 005.
- No export/share of the stats page; `dashboard.html` stays a throwaway
  prototype and is **not** checked into the app (delete or gitignore it).
- No new provider calls — everything is computed from the local DB.
- Never weaken the zip round-trip test or provider import boundaries.

## Acceptance

- [ ] `pnpm test` green: new core stats units (tz bucketing, dateUnknown
      exclusion, streaks, binges, backlog scope, genre/network attribution,
      pace, upcoming, heatmap buckets) + importer flag propagation + server
      contract test for `?tz=` and the extended payload.
- [ ] Stats page renders all 20 sections against the real imported library;
      Turkish + English catalogs complete; dark/light unaffected (app is
      dark-only per 006 — conformance to ui.md).
- [ ] Footer caveat appears with correct dated/total counts after a fresh
      TV Time re-import.
- [ ] Browser checkpoint folded into MANUELTEST.md (§M52).
