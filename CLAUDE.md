# CLAUDE.md

See [AGENTS.md](AGENTS.md) for full project instructions — read it before
changing code. Constitution: `.specify/memory/constitution.md`. Specs
001–008 (`specs/001-series-tracking/` through `specs/008-stats-dashboard/`,
each a delta over the previous, newest wins where they overlap) are all
fully implemented. Nothing is queued for new code work — root
`HANDOVER.md` has the details; the only thing left anywhere is the
combined manual browser pass in `MANUELTEST.md` (§M33 + §M52).

Claude-specific notes:

- This project follows spec-driven development. Before implementing a feature,
  read its spec + plan; if the request contradicts them, update the spec in the
  same PR (or flag the conflict) rather than silently diverging.
- Specs 001–008's tasks.md files are checked off except browser-only
  boxes: 001 is finished except M9.2 (blocked on the user's credentials —
  do not attempt); everything else is implemented and test-green, pending
  one combined browser-checkpoint pass (root `MANUELTEST.md` §M33 covers
  002–007, §M52 covers 008; either order). `dashboard.html` stays until
  that pass's value spot-checks are done (M44.2's own clause), then gets
  deleted alongside checking off M44.2 + M52.1. If a root `HANDOVER.md`
  exists, read it first — if it doesn't, there's nothing queued and you
  should ask the user what's next before starting new work.
- Order of truth when docs disagree: AGENTS.md § Normative sources.
- The user (xava) communicates in Turkish; reply in Turkish. Code, comments,
  commit messages, and docs under `specs/` stay in English. UI strings live in
  i18n catalogs (tr default + en).
- Never weaken the zip round-trip test or the provider import boundaries to
  make something pass.
