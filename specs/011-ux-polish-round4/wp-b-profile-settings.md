# baykuş — Spec 011 — WP-B: Profile / settings

You own **Track B (M63)**. Do not edit EpisodeRow, SeriesDetailPage, or
Next Up components.

## Ground rules

- Read `AGENTS.md` and `specs/011-ux-polish-round4/{spec,ui,plan,tasks}.md`.
- English in code/docs; reuse existing i18n keys for Refresh all.
- Never weaken zip round-trip or provider boundaries.

## Task

Implement **E153**:

1. **ProfilePage** order: banner → identity → **stat tiles** → favorites
   → all series. Remove Detailed stats / Settings link rows and the
   Refresh all button. Drop unused `staleSweep` / toast / queryClient
   imports if unused.
2. **SettingsPage** Data section: add Refresh all wired to
   `startManualSweep` with `useManualRefreshRunning` /
   `useManualRefreshProgress` and existing `library.refreshAll*` toasts.

## Owns

`ProfilePage.tsx`, `SettingsPage.tsx` (refresh row only — do not rename
Next Up settings labels; Track A owns those i18n strings).

## Acceptance

Profile shows stats first then rails; no bottom link rows; no profile
Refresh all; Settings → Data has Refresh all with progress; tests green.
