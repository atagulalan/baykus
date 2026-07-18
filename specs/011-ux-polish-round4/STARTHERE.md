# START HERE — Spec 011 (ux-polish-round4), parallel agents

Delta over 009/010. Two independent work packages.

## Pick your WP

| WP | File | What you build |
|----|------|----------------|
| **A** | [`wp-a-episode-detail.md`](./wp-a-episode-detail.md) | Spoiler posters, rating prompt gate, TBD, NextUpCard |
| **B** | [`wp-b-profile-settings.md`](./wp-b-profile-settings.md) | Profile reorder; Refresh all → Settings Data |

## Before you code

- Read `AGENTS.md` and this folder’s `spec.md` / `ui.md`.
- Code/comments/commits/`specs/` in **English**; UI strings in i18n
  (`tr.json` + `en.json`); talk to the user in **English** for this batch
  (project default is Turkish — follow the user’s language preference).
- Stay inside your Owns list. i18n: additive / label renames only.
- `pnpm lint && pnpm typecheck && pnpm test` before finishing; verify skill
  for UI.

## Parallel-safety

- **No shared page ownership.** A owns EpisodeRow / SeriesDetail / Next Up.
  B owns ProfilePage / SettingsPage.
- **i18n:** A adds `episode.tbd` + renames Next Up settings strings; B
  reuses existing `library.refreshAll*` keys (no new keys required).
- Do not rename the uiPrefs storage key `showNextUpCarousel`.
