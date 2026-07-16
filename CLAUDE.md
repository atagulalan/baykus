# CLAUDE.md

See [AGENTS.md](AGENTS.md) for full project instructions — read it before
changing code. Constitution: `.specify/memory/constitution.md`. Specs
001–008 (`specs/001-series-tracking/` through `specs/008-stats-dashboard/`,
each a delta over the previous, newest wins where they overlap) are all
fully implemented. Nothing is queued for new code work — root
`HANDOVER.md` has the details. 008's own browser checkpoint (M52) is done
(see `MANUELTEST.md` §M52); the only thing left anywhere is §M33, an
older pre-008 backlog (specs 002–007).

Claude-specific notes:

- This project follows spec-driven development. Before implementing a feature,
  read its spec + plan; if the request contradicts them, update the spec in the
  same PR (or flag the conflict) rather than silently diverging.
- Specs 001–008's tasks.md files are fully checked off — 001 is finished
  except M9.2 (blocked on the user's credentials — do not attempt); 008 is
  fully checked including its M52 browser checkpoint. What's left is
  cross-spec, not per-spec: root `MANUELTEST.md` §M33 (specs 002–007,
  never walked in a session with browser access). If a root `HANDOVER.md`
  exists, read it first — if it doesn't, there's nothing queued and you
  should ask the user what's next before starting new work.
- Order of truth when docs disagree: AGENTS.md § Normative sources.
- The user (xava) communicates in Turkish; reply in Turkish. Code, comments,
  commit messages, and docs under `specs/` stay in English. UI strings live in
  i18n catalogs (tr default + en).
- Never weaken the zip round-trip test or the provider import boundaries to
  make something pass.
