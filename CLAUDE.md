# CLAUDE.md

See [AGENTS.md](AGENTS.md) for full project instructions — read it before
changing code. Constitution: `.specify/memory/constitution.md`. Specs
001–008 (`specs/001-series-tracking/` through `specs/008-stats-dashboard/`,
each a delta over the previous, newest wins where they overlap) are all
fully implemented. Nothing is queued for new code work — root
`HANDOVER.md` has the details. **Every browser checkpoint has now been
executed:** 008's §M52 and the combined pre-008 §M33 walk (specs 002–007)
both done (see `MANUELTEST.md`). What remains anywhere is M9.2 (hosted
deploy, credential-blocked) plus a few USER-ONLY manual checks a headless
env can't cover (push delivery, TMDB backfill, animation smoothness,
multi-mode surfaces — all listed in `HANDOVER.md`).

Claude-specific notes:

- This project follows spec-driven development. Before implementing a feature,
  read its spec + plan; if the request contradicts them, update the spec in the
  same PR (or flag the conflict) rather than silently diverging.
- Specs 001–008's tasks.md files are fully checked off — 001 is finished
  except M9.2 (blocked on the user's credentials — do not attempt); 008 is
  fully checked including its M52 browser checkpoint. The cross-spec
  §M33 browser walk (specs 002–007) was executed 2026-07-17 (root
  `MANUELTEST.md` §M33 has results). What's left is M9.2 + a few USER-ONLY
  manual checks (see `HANDOVER.md`). Read root `HANDOVER.md` first — if it
  says nothing is queued, ask the user what's next before starting new work.
- Order of truth when docs disagree: AGENTS.md § Normative sources.
- The user (xava) communicates in Turkish; reply in Turkish. Code, comments,
  commit messages, and docs under `specs/` stay in English. UI strings live in
  i18n catalogs (tr default + en).
- Never weaken the zip round-trip test or the provider import boundaries to
  make something pass.
