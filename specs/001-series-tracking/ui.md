# UI Spec 001 — Screens, States, Conventions

Wireframes are layout intent, not pixel specs. Dark theme is the default look
(zinc-950 background, zinc-100 text — already in the scaffold); light theme via
the `theme` setting is a v1.1 polish item, don't build it speculatively.

## Conventions

- **Routes** (TanStack Router, code-based in `router.tsx`):
  `/` library · `/series/$id` detail · `/calendar` · `/stats` · `/settings` ·
  `/import` · `/login` · `/claim` (multi mode only)
- **i18n keys:** `<area>.<element>[.<variant>]`, camelCase leafs. Areas:
  `app`, `search`, `library`, `series`, `episode`, `rating`, `calendar`,
  `stats`, `settings`, `auth`, `import`, `errors`. Rating labels are fixed:
  `rating.bad` = "kötü", `rating.okay` = "normal", `rating.good` = "iyi".
- **Components** live in `apps/web/src/components/`, one file per component,
  named exports. Pages in `src/pages/`.
- **Every data view has three states:** loading (skeleton, not spinner-only),
  empty (title + hint, never blank), error (message + retry button wired to
  TanStack Query `refetch`).
- Mutations are optimistic where listed, with rollback + error toast.
- Images: always via `/img/:provider/:size/:path` with a gray placeholder
  block (poster aspect 2:3) while loading / on 404.

## Layout (all routes)

```
┌──────────────────────────────────────────────────────────┐
│ 🦉 baykuş   [🔍 Dizi ara………………]   Kütüphane Takvim       │
│                                    İstatistik Ayarlar    │
├──────────────────────────────────────────────────────────┤
│                     <Outlet/>                             │
└──────────────────────────────────────────────────────────┘
```
SearchBar sits in the header on every page (except /login, /claim). On mobile
(<640px) nav collapses to icons; search expands full-width on focus.

## Search (header dropdown)

```
[🔍 house of the dr…        ]
┌─────────────────────────────────────┐
│ ▢ House of the Dragon   2022 · HBO  │  ← poster thumb, title, year, network
│ ▢ Enter the House of…   2022 · HBO  │
│   (en fazla 10 sonuç)               │
└─────────────────────────────────────┘
```
- 300 ms debounce, min 2 chars (E10). Esc closes; ↑↓ + Enter navigates.
- Click/Enter on a result → inline status picker (5 statuses, default
  `watching`) → POST → success toast → dropdown closes, library refetches.
- Already-in-library results show a ✓ badge instead of being addable; clicking
  navigates to the detail page (uses 409 `details.itemId`).
- Error state inside dropdown: `search.providerError` + retry.

## Library `/`

```
Filtre: [Tümü|İzliyorum|İzleyeceğim|Bitirdim|Bıraktım|Ara verdim]  Sırala: [▼]
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│poster│ │poster│ │poster│ │poster│    ← responsive grid 2/4/6 cols
│██░░░ │ │█████ │ │░░░░░ │ │██░░░ │    ← progress bar (watched/aired, E1/E4)
│Title │ │Title │ │Title │ │Title │
│18/26 │ │ ✓    │ │ 0/8  │ │ 5/10 │
└──────┘ └──────┘ └──────┘ └──────┘
```
- Sort options: title, added (default), rating, next air date.
- Card hover/long-press menu: change status, remove (confirm dialog), refresh.
- Card click → `/series/$id`. Completed cards show ✓ instead of numbers.
- Rating shown as a small 👍/😐/👎 corner chip when set.
- Empty state per status filter (`library.empty.*`).

## Series detail `/series/$id`

```
┌────────┐  House of the Dragon (2022)      [İzliyorum ▼]  [⟳] [🔔/🔕]
│ poster │  "Win or die."  · HBO · TV-MA · Sci-Fi & Fantasy, Drama
│        │  ⭐ TMDB 8.4 · IMDb 8.3 · Serializd 7.9      [👎|😐|👍]
│        │  ▶ HBO Max (TR) — JustWatch verisi
└────────┘  ████████░░░░ 18/26 · Sıradaki: S2E7
────────────────────────────────────────────────────────────
▸ Özel Bölümler (0/73)                        [tümünü izledim]
▾ Sezon 1 (10/10) ✓                           [tümünü izledim]
   ☑ S1E1  The Heirs of the Dragon   21 Ağu 2022   66dk  ×2 ⋮
   ☑ S1E2  The Rogue Prince          28 Ağu 2022   54dk     ⋮
▾ Sezon 2 (8/8) ✓
▾ Sezon 3 (0/8)
   ☐ S3E1  …                         21 Haz 2026 [FİNAL rozeti S3E8'de]
```
- Status select PATCHes immediately (optimistic). ⟳ = per-series refresh with
  spinner + result toast. 🔔/🔕 = push mute toggle (M5).
- Episode row: checkbox toggles watch (optimistic, E5/E6); `×2` = watch count
  badge when >1; `⋮` menu = "tekrar izledim" (new watch event), "tarihi
  düzenle" (WatchDateDialog: datetime input, default last event), "buraya
  kadar izledim" (bulk, E2).
- Marking a single episode watched shows the inline rating prompt (E8):
  `[👎 kötü] [😐 normal] [👍 iyi] · geç` under the row, auto-hides in 5 s.
- `suggestCompleted: true` → toast: "Tüm bölümler izlendi. Bitirdim'e taşınsın
  mı? [Taşı] [Kalsın]" (E7).
- Unaired episodes: dimmed, checkbox disabled, air date emphasized; finale
  rows get a `FİNAL` chip (episodeType).
- Specials section collapsed by default, labeled from season name.

## Calendar `/calendar`

```
[Yaklaşan 30 gün]                    [Son 14 gün · izlenmemiş]
BUGÜN 14 Tem                          ┌ HotD S3E4 · 5 Tem · HBO Max ┐
  — (boş)                             └ Dark S1E3  · 8 Tem          ┘
19 Tem Pazar
  ▢ House of the Dragon S3E5 · HBO Max (TR)
26 Tem Pazar
  ▢ House of the Dragon S3E6 · FİNAL
```
- Two columns on desktop, stacked on mobile. Entries click through to detail.
- Recently-aired entries have a quick "izledim" checkbox inline.

## Stats `/stats`

Tiles row: bölüm sayısı · toplam süre (saat) · aktif dizi sayısı. Below: a
months bar chart (12 mo) and the 1–3 rating distribution as three labeled bars.
Read the `dataviz` skill guidance before building charts; plain divs/SVG
preferred over adding a chart library.

## Settings `/settings`

Sections (single column, cards):
1. **Genel** — dil (TR/EN, live switch), bölge (region select, default TR),
   tema (v1: sadece koyu, disabled select + "yakında").
2. **Sağlayıcılar** — TMDB API key (password input, write-only: shows "kayıtlı ✓"
   when set, never echoes), scrapers toggle + ToS uyarı metni.
3. **Bildirimler** — push izni iste / kaldır (M5).
4. **Veri** — "Zip indir" button; "Zip yükle" with replace/merge radio +
   file input + result summary; TV Time import link → `/import`.
5. **Hesap** (multi mode only) — handle display, çıkış yap, hesabı sil
   (interstitial: "Önce son bir yedek indir → [Zip indir] [Yine de sil]").

## Import wizard `/import`

Step 1 upload (dropzone) → Step 2 report table:
```
Eşleşti (12)   | Emin değilim (2)          | Eşleşmedi (1)
Dark ✓ 30 blm  | The Office → [aday seç ▼] | Some Local Show
```
→ Step 3 confirm → summary card (created/skipped counts). Fuzzy resolution
uses the standard search dropdown scoped to the row.

## Auth screens (multi mode)

- `/login`: handle + şifre, tek kart, hata tek satır (uniform message).
- `/claim`: handle (canlı uygunluk kontrolü yok — submit'te 409), şifre ×2,
  optional "zip ile başla" file input. Success screen (big, unmissable):
  "⚠️ Şifre kurtarma yok. Yedeğin = zip export. Ayarlar → Zip indir."
- Single mode with password: same `/login` with only password field.
