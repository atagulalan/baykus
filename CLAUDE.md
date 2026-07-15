# CLAUDE.md

See [AGENTS.md](AGENTS.md) for full project instructions — read it before
changing code. Constitution: `.specify/memory/constitution.md`. Active spec:
`specs/004-import-fidelity-ux/` (a delta over `specs/003-dynamic-watching-ux/`
over `specs/002-watch-categories/` over `specs/001-series-tracking/`; the
newest spec wins where they overlap).

Claude-specific notes:

- This project follows spec-driven development. Before implementing a feature,
  read its spec + plan; if the request contradicts them, update the spec in the
  same PR (or flag the conflict) rather than silently diverging.
- Work through `specs/004-import-fidelity-ux/tasks.md` (M18+) in order
  unless told otherwise, following AGENTS.md § Execution protocol and
  § Reading map exactly — each task lists Files/DoD/Tests/Verify; do not
  exceed its scope. (001's tasks.md is finished except M9.2, which is
  blocked on the user; 002's and 003's are implemented, pending
  browser-checkpoint confirmations — 003's M17.7 covers them. If a root
  `HANDOVER.md` exists, read it first.)
- Order of truth when docs disagree: AGENTS.md § Normative sources.
- The user (xava) communicates in Turkish; reply in Turkish. Code, comments,
  commit messages, and docs under `specs/` stay in English. UI strings live in
  i18n catalogs (tr default + en).
- Never weaken the zip round-trip test or the provider import boundaries to
  make something pass.
