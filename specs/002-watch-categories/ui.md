# UI Spec 002 — Home Sections, Calendar Modes, Watch Page

Conventions (three data states, optimistic mutations, `/img` handling,
component/file layout, i18n key style) are inherited from ui.md 001. This doc
covers only the changed/new screens.

## Layout (changed)

```
┌──────────────────────────────────────────────────────────────┐
│ 🦉 baykuş   [🔍 Dizi ara……]   Kütüphane İzleme Takvim        │
│                               İstatistik Ayarlar             │
└──────────────────────────────────────────────────────────────┘
```
- The `🦉 baykuş` logo becomes a `<Link to="/">` (today it is a plain span).
- New nav item **İzleme** (`/watch`) between Kütüphane and Takvim
  (`app.nav.watch`; existing nav keys follow the same area).

## Home / Library `/` (reworked)

```
                                              [⚙ Filtrele] [Tümünü yenile]
İzleniyor (3)
┌──────┐ ┌──────┐ ┌──────┐
│poster│ │poster│ │poster│      ← same SeriesCard grid, 2/4/6 cols
└──────┘ └──────┘ └──────┘
Bir süredir izlenmedi (2)
┌──────┐ ┌──────┐
Daha başlanmadı (4)
…
```
- Sections stacked in E16 display order: İzleniyor, Bir süredir izlenmedi,
  Daha başlanmadı, Sonra izlenecek, Güncel, Bitirildi, Bırakıldı. Header =
  category label + count. Empty categories render nothing.
- One `GET /api/library/series` call (no category param); grouping happens
  client-side on `category`.
- **Filtre** button opens a panel (popover on desktop, full-width sheet on
  mobile):

```
┌ Filtrele ────────────────────────────┐
│ Sıralama                             │
│ (•) Son izlenen  ( ) Son eklenen     │
│ ( ) Alfabetik    ( ) Puan            │
│ ( ) Sonraki yayın                    │
│ İlerleme                             │
│ (•) Tümü  ( ) İzleniyor  ( ) Bir süredir izlenmedi │
│ ( ) Daha başlanmadı ( ) Sonra izlenecek ( ) Güncel │
│ ( ) Bitirildi ( ) Bırakıldı          │
│              [SIFIRLA]   [UYGULA]    │
└──────────────────────────────────────┘
```
- APPLY applies both choices; RESET = Tümü + Son eklenen. State is component
  state only (not persisted, not URL).
- Progress = a single category → flat grid (no section headers), still
  sorted by the chosen sort. Tümü → sections; sort orders cards *within*
  each section.
- SeriesCard: ✓ overlay now keys off `category === "finished"`; hover menu
  "durum değiştir" becomes manual-list actions ("Sonra izlenecek'e taşı",
  "Bırakıldı'ya taşı", "Otomatik'e döndür" — shown contextually), plus the
  existing kaldır/yenile.

## Search add flow (changed)

The 5-status `StatusPicker` in the search dropdown becomes a 2-option
`ManualListPicker` (component renamed): **Ekle** (default, dynamic) and
**Sonra izlenecek**. POST sends `manualList` accordingly (absent for Ekle).

## Series detail `/series/$id` (changed header only)

```
House of the Dragon (2022)   [İZLENİYOR]  [Liste: Otomatik ▼]  [⟳] [🔔]
```
- The status `<select>` is replaced by: a read-only **category badge**
  (i18n `category.*`, subtle chip) + a **Liste** select with three options:
  Otomatik (null) / Sonra izlenecek / Bırakıldı. PATCH `manualList`,
  optimistic with rollback.
- When `category === "finished"`, the Bırakıldı option is `disabled` (title
  tooltip `series.stoppedBlocked`); the server 409 is still handled with an
  error toast (message from the envelope) in case of a race.
- The suggest-completed toast (001 E7) is deleted, along with its i18n keys.
- Watching an episode may change the badge (e.g. Bırakıldı → İzleniyor via
  E19); the detail query refetch after a watch mutation already covers this.

## Calendar `/calendar` (reworked)

Tab switch at the top: `[Zaman çizelgesi] [Takvim]` (`calendar.mode.timeline`,
`calendar.mode.month`). Default: timeline.

### Timeline mode

```
[Zaman çizelgesi] [Takvim]
1 Tem Salı                                  ← 14 gün geçmiş: sadece izlenmemiş
  ▢ Dark S1E3 · Netflix        [SPECIAL]      (▢ = hızlı izledim checkbox)
BUGÜN 15 Tem                                ← açılışta buraya scroll
  — (boş)
19 Tem Pazar
  House of the Dragon S3E5 · HBO Max  [YENİ]
26 Tem Pazar
  House of the Dragon S3E6            [FİNAL]
…3 ay ileriye kadar
```
- One `GET /api/calendar` with defaults (today−14 … today+90). Day-grouped
  list; today gets a `BUGÜN` header and `scrollIntoView()` after load (even
  when empty).
- Entries with `airDate ≤ today` get the quick-mark checkbox (same optimistic
  mutation as 001's recently-aired). Future entries: no checkbox.
- Row: title SxEy · platform/network badge · tags (below).

### Month mode

```
[Zaman çizelgesi] [Takvim]        ‹  Temmuz 2026  ›
Pzt  Sal  Çar  Per  Cum  Cmt  Paz
 29   30    1    2    3    4    5
                 HotD
                 S3E3
  6    7    8 …
```
- Opens on the current month; ‹ › navigate months without limit. Each
  navigation fetches that month's exact range (`from`=1st, `to`=last day).
- Cells list compact entries (`title SxEy`), truncated with a `+n` overflow
  indicator when >3; click-through to the series detail. Today's cell is
  highlighted. Weeks start Monday.
- Past cells show only unwatched episodes (server already filters, E24).
- Mobile (<640px): the grid becomes a vertical list of non-empty days for the
  month (same data, no 7-col grid).

## Watch page `/watch` (NEW)

```
İzleme geçmişi                          ← son 30, en yeni EN ALTTA
  Dark S1E1 · Pilot · 12 Tem 21:30
  Dark S1E2 · Yalanlar · 13 Tem 22:00
  HotD S2E7 · The Red Sowing · dün 21:12
──────────────────────────────────────
Sıradaki bölümler                       ← category = watching
  ▢ [poster] HotD  S2E7 +3  The Red Sowing      [YENİ] [FİNAL]
  ▢ [poster] Dark  S1E4     Double Lives
──────────────────────────────────────
Bir süredir izlenmedi                   ← category = not_watched_recently
  ▢ [poster] Severance S2E3 +5  Who Is Alive?
```
- **İzleme geçmişi**: `GET /api/watches/history` (default 30), rendered
  oldest→top, newest→bottom (E27); relative day formatting like the calendar.
- **Sıradaki bölümler** / **Bir süredir izlenmedi**: derived from the same
  `listSeries` data the home page uses — filter by category, one row per
  series showing `nextUnwatched`. `+N` badge per E28. Checkbox = quick-mark
  (`POST /api/episodes/:id/watches`, optimistic), then invalidate
  library/watch/calendar queries — the row advances or the series leaves the
  section on refetch. Hide the checkbox when `nextUnwatched.airDate` is null
  or future (E29).
- Empty states per section (`watch.empty.*`), three data states as usual.

## `EpisodeTags` (NEW shared component)

Input: `{ s, e, airDate, episodeType, episodeTitle?, seasonName? }`. Renders
chips per E25, in priority order: `YENİ`/`YAKLAŞAN` (emerald; mutually
exclusive — YENİ when already aired within the last 3 days, YAKLAŞAN when
scheduled but not yet aired) · `PREMIER` (sky) · `FİNAL` (red, exists in
001) · `OVA`/`SPECIAL` (violet; OVA replaces SPECIAL when the name heuristic
matches). Used by calendar rows/cells and watch-page rows. Labels via
`episode.tag.*` (FİNAL reuses `episode.finale`).

## i18n keys (new/changed areas)

- `category.watching` "İzleniyor" · `category.not_watched_recently`
  "Bir süredir izlenmedi" · `category.not_started` "Daha başlanmadı" ·
  `category.watch_later` "Sonra izlenecek" · `category.up_to_date` "Güncel" ·
  `category.finished` "Bitirildi" · `category.stopped` "Bırakıldı"
  (EN: Watching / Haven't watched for a while / Not started / Watch later /
  Up to date / Finished / Stopped).
- `manualList.label`, `manualList.none` "Otomatik", `manualList.watch_later`,
  `manualList.stopped`, `manualList.addDefault` "Ekle".
- `library.filter.*` (title, sortTitle, progressTitle, reset, apply),
  `library.sort.lastWatched`.
- `calendar.mode.timeline`, `calendar.mode.month`, `calendar.overflow`
  ("+{{count}}").
- `watch.title`, `watch.history`, `watch.next`, `watch.notWatchedRecently`,
  `watch.empty.*`.
- `episode.tag.new`, `episode.tag.upcoming`, `episode.tag.premiere`,
  `episode.tag.special`, `episode.tag.ova`.
- `series.stoppedBlocked`.
- **Deleted:** all `status.*` keys, `library.filter.all` (replaced within the
  new filter panel keys), `series.suggestCompleted` + its action keys.
  Both catalogs in the same commit; parity test guards tr/en skew.
