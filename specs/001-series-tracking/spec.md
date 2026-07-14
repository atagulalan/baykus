# Spec 001 — Series Tracking (v1)

**Status:** Draft · **Owner:** xava · **Created:** 2026-07-13
**Scope:** Series (TV) module only. Movies and books are future specs (002, 003) that reuse the same architecture.

## Summary

baykuş v1 is a personal TV-series tracker in the spirit of TV Time / Serializd:
search a series, add it to your library, mark episodes watched (with dates and
rewatches), rate things on a 1–3 scale, and see what's airing next — with all
data portable as a single zip. It runs self-hosted (single mode) and as a hosted
instance at baykus.xava.me where anyone can claim a handle (multi mode).

## Decisions locked in (from product Q&A, 2026-07-13)

| Topic | Decision |
|---|---|
| User model | Core is single-user per library; hosted instance is open — anyone can claim a handle and upload their zip |
| v1 scope | Series only; movies/books later, architecture must allow them |
| Social | None. Personal tracking only. No public profiles in v1 |
| Rating | 3-point scale: 1 = kötü (bad), 2 = normal (okay), 3 = iyi (good) |
| Providers | TMDB (primary), TVmaze (keyless fallback), IMDb scraper (optional, ratings), Serializd scraper (optional) |
| Storage | SQLite canonical + versioned zip export/import; images excluded from zip |
| Import | TV Time (GDPR data export) |
| Calendar/notifications | In-app upcoming calendar + web push; metadata refresh is manual-first |
| Repo | Single monorepo, workspace packages, no npm publishing |
| Auth (multi mode) | Handle + password; single mode auth optional (env password) or delegated to reverse proxy |

## User stories

### US-1: Search and add a series
As a user, I search by title and add a series to my library so I can track it.

- **Given** no TMDB key is configured, **when** I search, **then** results come
  from TVmaze and adding still works (Article IV).
- **Given** a TMDB key, **when** I add a series, **then** full metadata is
  fetched: seasons, episodes, air dates, poster, status, watch providers.
- Adding sets tracking status (default: `watching`; selectable at add time).

### US-2: Mark episodes watched
As a user, I mark episodes as watched so my progress is accurate.

- Single episode toggle; "mark season watched"; "mark series watched up to here".
- Each watch records a timestamp. Default = now; editable to any past date.
- **Rewatch:** marking an already-watched episode again creates a second watch
  entry — history keeps all of them.
- Unmarking removes the most recent watch entry for that episode.
- The series card shows next-unwatched episode and progress (e.g. `S02E05 · 23/48`).

### US-3: Track status
As a user, I set a status per series: `watching`, `plan_to_watch`, `completed`,
`dropped`, `paused`. Library views filter/group by status. Marking the final
episode watched offers (does not force) moving the series to `completed`.

### US-4: Rate series and episodes
As a user, I rate a series or an individual episode 1–3
(1 = kötü, 2 = normal, 3 = iyi).

- Ratings are editable and removable.
- Series list can sort/filter by my rating.
- Episode rating is offered right after marking watched (one-tap, dismissible).

### US-5: Upcoming calendar
As a user, I see upcoming episodes of series I'm watching.

- In-app calendar view: next 30 days grouped by day, plus "aired recently,
  unwatched" section.
- Data comes from cached metadata; accuracy depends on last refresh (US-6).
- Shows which platform each series streams on (TMDB watch providers, region TR
  by default, configurable).

### US-6: Manual metadata refresh
As a user, I press "Refresh" to update metadata so I control when network calls
happen (Article V).

- Per-series refresh and library-wide refresh.
- Refresh updates: new/changed episodes, air dates, series status, watch
  providers, images (lazily).
- Shows per-series `last_refreshed_at`. Failures are reported per series and
  never abort the whole batch.
- Optional (env-flag) daily scheduled refresh in hosted mode — additive only.

### US-7: Web push for new episodes
As a user, I opt into browser push notifications for new episodes of series I'm
`watching`.

- Detection happens during refresh (manual or scheduled): episodes whose air
  date passed since the previous refresh trigger one notification per series.
- Per-series mute toggle. Standard Web Push (VAPID); no third-party service.

### US-8: Zip export / import
As a user, I download my whole library as one zip and can restore it anywhere
(Article III).

- Export: single file `baykus-export-YYYYMMDD.zip`, JSON inside, no images.
- Import: uploading a zip into an empty library restores everything; importing
  into a non-empty library asks: replace or merge (merge = union of watch
  events, incoming ratings/statuses win on conflict).
- Round-trip lossless; enforced by test.

### US-9: TV Time import
As a user, I upload my TV Time GDPR export and my watch history appears.

- Input: the zip/CSV set TV Time provides via GDPR request.
- Maps: shows (via TVDB/TMDB id or name lookup), episodes watched + timestamps.
- Produces an import report: matched, fuzzy-matched (user confirms), unmatched.

### US-10: Claim a handle (multi mode only)
As a visitor to baykus.xava.me, I claim a handle and password to get my own
library, optionally seeding it by uploading a zip.

- Handle: 3–30 chars, `[a-z0-9-]`, unique, reserved list (admin, api, www, …).
- Signup = handle + password (argon2id hashed). No email required in v1;
  password reset is therefore impossible — the UI must say "your zip export is
  your backup" loudly.
- Session: httpOnly secure cookie. Login/logout. Account deletion removes the
  library after a confirmation that offers a final zip export.

### US-11: Single-mode access control
As a self-hoster, I optionally set `BAYKUS_PASSWORD`; when set, the UI requires
it once per session. When unset, the app is open (assume reverse-proxy/LAN
protection).

### US-12: Language
UI ships in Turkish (default) and English; switchable in settings, persisted in
the library settings (and therefore in the zip).

## Functional requirements

- **FR-001** Search series via configured providers with debounce; provider
  order: TMDB if key present, else TVmaze.
- **FR-002** Add/remove series to/from library; removal keeps nothing (hard
  delete after confirm) — history is only preserved via export.
- **FR-003** Store full episode inventory per series (season/episode numbers,
  titles, air dates, runtime, overview, still image ref, episode type incl.
  finale markers, per-episode community rating).
- **FR-004** Watch events: create (with timestamp), bulk-create, delete-latest;
  multiple events per episode allowed.
- **FR-005** Tracking status per series, one of five values (US-3).
- **FR-006** Ratings: integer 1–3, targets: series, episode. One rating per
  target (upsert semantics).
- **FR-007** Upcoming view + recently-aired-unwatched view derived from cached
  metadata.
- **FR-008** Manual refresh per series and global; concurrency-limited;
  per-item error isolation.
- **FR-009** Web push subscribe/unsubscribe; new-episode detection during
  refresh; per-series mute.
- **FR-010** Zip export (streaming download) and import (replace/merge) per
  data-model.md format.
- **FR-011** TV Time importer with match report.
- **FR-012** Multi mode: handle claim, login, logout, account delete; per-handle
  isolated SQLite database.
- **FR-013** Single mode: optional password gate via env.
- **FR-014** Image cache: posters/stills fetched on demand, stored on disk keyed
  by provider+path hash, served via `/img/*`, evictable without data loss.
- **FR-015** i18n: TR + EN, all UI strings keyed.
- **FR-016** Watch-provider (platform) info per series for a configurable region
  (default `TR`).
- **FR-017** Basic stats page: total episodes watched, watch time, episodes per
  month chart, rating distribution.
- **FR-018** Cache and display rich item metadata whenever the provider offers
  it (detail-max principle, see data-model.md): tagline, genres, content
  rating(s), structured networks with logos, origin country/language, typical
  runtimes, last air date, show logo, curated tags (e.g. Serializd
  nanogenres), and multi-source external community ratings (IMDb / TMDB /
  Serializd) including vote distributions where available.

## Edge-case decisions (normative — do not re-decide these in code)

| # | Question | Decision |
|---|---|---|
| E1 | Are specials (season 0) part of progress? | **No.** Progress counts and "completed" checks exclude season 0 entirely. Specials are still listed and individually watchable. |
| E2 | Does "mark watched up to here" include specials? | **No.** It walks non-special episodes in (season, episode) order up to and including the target. |
| E3 | What does "aired" mean, in which timezone? | `air_date <= today's date in UTC`. Plain-date comparison; ±1 day skew near midnight is accepted. Airstamp-precision is a non-goal in v1. |
| E4 | Progress denominator: aired or announced episodes? | **Aired.** Card shows `watched/aired`; total announced shown only on detail page. |
| E5 | Which watch does "unmark" delete? | The event with the **newest `watched_at`** for that episode. Never touches older (rewatch) history. |
| E6 | Duplicate watch event (same episode + same timestamp)? | Idempotent: silently reuse the existing event (this is also the import dedupe key). |
| E7 | When is "move to completed?" suggested? | The moment a watch (single or bulk) makes every aired non-special episode watched, and status ≠ completed. Suggestion only — never automatic. |
| E8 | Rating prompt after watching? | Only after single-episode marking in the detail view; never after bulk actions. Dismissible, remembers nothing. |
| E9 | "Recently aired, unwatched" window? | Last **14 days**, `watching` status only. Calendar upcoming window: **30 days** default (from/to query params). |
| E10 | Search debounce / minimum query? | 300 ms debounce, minimum 2 characters, results capped at 10. |
| E11 | What happens to a watched episode the provider deleted? | Kept (with its watches); unwatched orphans are deleted on refresh. |
| E12 | Episode identity across refreshes/imports? | `(item, season_number, episode_number)` — never provider episode ids. |
| E13 | Watch time for episodes with unknown runtime? | Fall back to the item's typical runtime (avg of `episode_run_times`), else 0 — never guess per-episode. |
| E14 | Library list pagination? | None in v1 (assume < 1000 items). Calendar and stats are range-bounded by design. |
| E15 | Locale/theme live in the zip? | Yes (settings.json) — a restored library looks the way you left it. Secrets (TMDB key) excluded unless `includeSecrets=1`. |

## Non-goals (v1)

- Movies, books (specs 002/003 — but see Article VI).
- Social features of any kind; public profiles.
- Mobile apps; the web app must simply be responsive.
- npm publishing of packages.
- Email anything (no email infra at all in v1).
- Offline-first/PWA sync (nice-to-have later; plain responsive SPA now).

## Acceptance checklist (definition of done for v1)

- [x] All FRs implemented and covered per Article VIII.
- [x] `pnpm install && pnpm dev` gives a working app with zero config (TVmaze).
- [x] Docker image runs single mode with one volume (`/data`).
- [ ] baykus.xava.me runs multi mode; handle claim → zip upload → library works.
      <!-- Not started: requires real DNS/TLS/hosting credentials the
      assistant doesn't hold and shouldn't act on without explicit user
      go-ahead (M9.2, tasks.md). Multi mode itself is implemented and
      tested (M7); only the actual hosted deployment is outstanding. -->
- [x] Zip round-trip test green; TV Time sample import test green.
- [x] UI complete in TR and EN.
