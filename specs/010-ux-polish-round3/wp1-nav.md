# baykuş — Spec 010 — WP1: Instagram-style bottom nav

You are the agent for **WP1**, working **in parallel** with 3 other agents on the
baykuş web app (`apps/web` React + TanStack Router/Query + Tailwind; `apps/server`
Fastify + Drizzle). Stay inside WP1's "Owns" list. This is spec 010
(ux-polish-round3), a delta over 009.

## Ground rules
- Read `AGENTS.md` and `specs/010-ux-polish-round3/` before coding.
- Code/comments/commits/`specs/` docs in **English**. UI strings in i18n catalogs
  (`apps/web/src/i18n/tr.json` default + `en.json`) — never hardcoded. tr is the
  source of truth. Talk to the user in **Turkish**.
- Match surrounding style; add/adjust vitest tests for any lib logic; run web +
  server test suites before finishing.
- Env: Node 26 — prefix package commands with `env PATH="/usr/bin:$PATH"` if your
  shell inherited older node. Stop the dev server by killing the **root pnpm**
  process (tsx watch respawns otherwise).
- Verify UI end-to-end with the **`verify` skill** (headless Playwright).
- Don't weaken the zip round-trip test or provider import boundaries.

## Shared-file etiquette (parallel safety)
- i18n `tr.json`/`en.json`: **additive only**, namespaced keys (yours: `nav.*` if
  needed). Never reorder/delete existing keys.
- **`Layout.tsx` is yours alone.** Do not touch `router.tsx`, page bodies, or any
  other WP's files.

## Your task
**Goal:** Make the nav read like Instagram's tab bar: pure icons, active state
shown by a **filled** icon (search = **thicker stroke** instead of fill), no text
labels. Tabs stay **watch / calendar / search / profile** (4 items, unchanged
set — only the visual treatment changes).

**Requirements**
- Mobile tab bar (`AppTabBar`) and desktop header (`AppHeader`): drop the
  `font-mono` text labels under/around the icons; icon-only.
- Active tab = filled glyph (e.g. `fill="currentColor"` on the lucide icon, or a
  filled variant) in the accent color; inactive = outline/muted. **Search** has no
  natural filled form — represent active by increased `strokeWidth` (bolder).
- Keep existing routes/targets, the browse (list⇄grid) active-forcing logic, the
  back button, and the wordmark. Only the presentation of the nav items changes.
- Keep accessibility: retain `aria-label`s now that visible text is gone.

**Owns:** `apps/web/src/components/Layout.tsx`, minimal `index.css`/i18n if needed.
**Out of scope:** routing changes, page bodies.

**Acceptance:** All 4 tabs icon-only; active tab visibly filled (search bolder);
labels gone; a11y labels present; `verify` shows correct active state per route.
