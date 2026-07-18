# baykuş — Spec 011 — WP-A: Episode / detail

You own **Track A (M62)**. Do not edit ProfilePage or SettingsPage markup.

## Ground rules

- Read `AGENTS.md` and `specs/011-ux-polish-round4/{spec,ui,plan,tasks}.md`.
- English in code/docs; i18n catalogs for UI strings.
- Never weaken zip round-trip or provider boundaries.

## Task

Implement **E149–E152**:

1. **E149** — In `EpisodeRow`, series-chrome poster never gets `blur-md`
   under spoiler protection.
2. **E151** — Add `unairedTrailingState` in `airDateLabel.ts` (+ tests).
   Null airDate → trailing TBD (`episode.tbd`); future → countdown.
3. **E150** — In `SeriesDetailPage`, only `setPromptEpisodeId` when
   `myRating == null` (toggleWatch + watchAgain).
4. **E152** — Replace `NextEpisodeCarousel` with `NextUpCard` (single
   episode card). Delete the carousel file. Keep uiPrefs key
   `showNextUpCarousel`; rename settings *labels* in i18n only.

## Owns

`EpisodeRow.tsx`, `airDateLabel.ts` (+ test), `SeriesDetailPage.tsx`,
`NextUpCard.tsx` (new), delete `NextEpisodeCarousel.tsx`, i18n keys
`episode.tbd` + Next Up settings label renames, optional
`shouldPromptEpisodeRating` helper.

## Acceptance

Spoiler on → series poster sharp; rated rewatch → no popup; null air →
TBD; detail Next Up is one card; tests green.
