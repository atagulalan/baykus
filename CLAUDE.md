# CLAUDE.md

See [AGENTS.md](AGENTS.md) for full project instructions — read it before
changing code. Constitution: `.specify/memory/constitution.md`. Active spec:
`specs/001-series-tracking/`.

Claude-specific notes:

- This project follows spec-driven development. Before implementing a feature,
  read its spec + plan; if the request contradicts them, update the spec in the
  same PR (or flag the conflict) rather than silently diverging.
- Work through `specs/001-series-tracking/tasks.md` in order unless told
  otherwise, following AGENTS.md § Execution protocol and § Reading map
  exactly — each task lists Files/DoD/Tests/Verify; do not exceed its scope.
- Order of truth when docs disagree: AGENTS.md § Normative sources.
- The user (xava) communicates in Turkish; reply in Turkish. Code, comments,
  commit messages, and docs under `specs/` stay in English. UI strings live in
  i18n catalogs (tr default + en).
- Never weaken the zip round-trip test or the provider import boundaries to
  make something pass.
