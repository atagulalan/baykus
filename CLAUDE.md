# CLAUDE.md

See [AGENTS.md](AGENTS.md) for full project instructions — read it before
changing code. Constitution: `.specify/memory/constitution.md`. Specs
001–004 (`specs/001-series-tracking/` through `specs/004-import-fidelity-ux/`,
each a delta over the previous, newest wins where they overlap) are all
fully implemented. No spec 005 exists yet.

Claude-specific notes:

- This project follows spec-driven development. Before implementing a feature,
  read its spec + plan; if the request contradicts them, update the spec in the
  same PR (or flag the conflict) rather than silently diverging.
- All four specs' tasks.md files are checked off except browser-only
  boxes: 001 is finished except M9.2 (blocked on the user's credentials —
  do not attempt); 002, 003, and 004 are implemented and test-green,
  pending one combined browser-checkpoint pass (003's M17.7 + 004's M22,
  see root `MANUELTEST.md`). If a root `HANDOVER.md` exists, read it
  first — if it doesn't, there's nothing queued and you should ask the
  user what's next before starting new work.
- Order of truth when docs disagree: AGENTS.md § Normative sources.
- The user (xava) communicates in Turkish; reply in Turkish. Code, comments,
  commit messages, and docs under `specs/` stay in English. UI strings live in
  i18n catalogs (tr default + en).
- Never weaken the zip round-trip test or the provider import boundaries to
  make something pass.
