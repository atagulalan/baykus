# Tasks 007 — Post-006 Deltas

Continues M34+. One conventional commit per milestone when practical.

- [x] M34.1 docs: spec 007 package
- [x] M34.2 core/server/web: Schedule mode + calendar `isWatched`/`hasMore*` (E82/E83)
- [x] M35 TV Time watch resolve + providerEpisodeCount (E84)
- [x] M36 bulk unwatch + UnwatchSeasonDialog (E85)
- [x] M37 stats mostRewatched (E86)
- [x] M38 search open-on-select (E87)
- [x] M39 chrome polish (grain, ScrollRestoration, FAB, startManualSweep)
- [x] M40 server: metadata provider SQLite cache for TV Time import (E88)
- [x] M41 importer: TV Time parse fidelity round 2 — 7-day duplicate window,
      show rescue, overflow-gated resolve precedence, distinct episode counts,
      underflow detection (E89, E91, E92, E94)
      <!-- DECISION: found as an uncommitted working-tree batch (same pattern as
      003's M17.9+); audited, broken pieces fixed (duplicate interface field,
      nonexistent property reference, details.status→releaseStatus, missing
      followedAt), then packaged. -->
- [x] M42 core/server/web: needs_review category — tracking.needs_review +
      migration 0004_tracking_needs_review, zip v5, import wiring + report
      warning UI, PATCH needsReview, detail banner fill/dismiss (E90, E93)
      <!-- DECISION: zip bump follows E61's favorite pattern exactly (v5,
      v1–v4 default false); the WIP had shipped needsReview as an optional
      v4 field, which would have made v4 ambiguous. Banner fill skips season
      0 and everything ≥ the highest started season. -->
- [x] M43 polish: SegmentedProgress zero-width segments render a 1px sliver;
      drop stray migration debug log; biome scope excludes tmp/ scratch and
      the dashboard.html prototype
