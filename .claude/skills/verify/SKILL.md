---
name: verify
description: Build/launch/drive recipe for verifying baykuş web UI changes end-to-end with headless Playwright against the real dev server.
---

# Verifying baykuş changes at the browser surface

## Launch

- The dev server is usually already running (user's `pnpm dev`): web on
  `http://localhost:5173` (proxies `/api`), API on `:4004`. Check with
  `ss -ltnp | grep -E '4004|5173'` before starting your own.
- If you must start it: `pnpm dev` from repo root. **Node >=26 required**;
  the shell's nvm default may be v24 and shadow the system Node 26 — prefix
  commands with `env PATH="/usr/bin:$PATH"` if pnpm fails with
  `ERR_PNPM_UNSUPPORTED_ENGINE`. When stopping, kill the root `pnpm` process,
  not just the port's PID, or `tsx watch` respawns a stray server.
- Vite serves the working tree live — no rebuild step needed for web changes.

## Drive

- No Playwright in the repo. Install `playwright-core` in the session
  scratchpad (`npm i playwright-core`, seconds) and launch with
  `executablePath: ~/.cache/ms-playwright/chromium-<latest>/chrome-linux64/chrome`
  (browsers are pre-cached; check the dir for the current revision).
- UI is Turkish by default — select by tr.json strings ("Filtrele", "Kapat",
  "Dizi menüsü", "Kaldır"…).
- Breakpoint: Tailwind `sm` = 640px. Overlays (`components/Modal.tsx`) are
  bottom sheets <sm and modal/popover/none ≥sm via the `desktop` prop; sheets
  and centered modals carry `role="dialog"`, popovers don't.

## Safety — the real library is live data

- `apps/server/data/` is the user's real library. **Read-only interactions
  only**: opening/closing overlays, navigation, Escape/backdrop dismiss are
  safe; never click confirm/apply/option buttons that mutate (season/episode
  checkboxes open confirm dialogs — opening is safe, confirming is not; a
  checked *season* checkbox opens UnwatchSeasonDialog whose confirm deletes
  watch history).
- For mutating flows, copy the DB (`sqlite3 .backup`) and run a second server
  with `BAYKUS_DATA_DIR=<copy>` on another port (see HANDOVER.md §M33 notes).

## Gotchas

- `getByRole("dialog")` can match 2 on mobile /settings (the page itself is a
  sheet; a select opens a second one) — use `.last()`.
- The sheet backdrop is an `aria-label="Kapat"` button *outside* the dialog
  container; scope close-button queries inside `getByRole("dialog")`.
- When rerouting API calls to a sandbox server with `page.route`, never use
  the glob `**/api/**` — it also matches Vite module URLs like
  `/src/api/client.ts` and blanks the whole app. Use a regex anchored to the
  path root: `/^http:\/\/localhost:5173\/api\//`.
- Touch gestures (e.g. E132 pull-to-refresh) need `hasTouch: true` in the
  context plus CDP `Input.dispatchTouchEvent` (touchStart/touchMove/touchEnd)
  via `context.newCDPSession(page)` — Playwright's `page.touchscreen` only
  taps. Remember /calendar auto-anchors to BUGÜN, so `window.scrollTo(0, 0)`
  first; the pull gesture only arms at document top.
