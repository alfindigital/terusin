---
name: testing-terusin
description: How to run and E2E-test the Terusin habit-tracker PWA locally — serving, service worker caveats, drag-handle focus quirk, file-import dialog, and grid/date behavior.
---

# Testing Terusin locally

## Serve
- `python3 -m http.server 4820` from repo root → http://localhost:4820. SW/PWA only registers on localhost or HTTPS, never `file://`.
- No package.json. Node lives behind nvm: `source ~/.nvm/nvm.sh && node tools/cek.js` (51-assertion smoke test: assets exist, `?v=` versions match between index.html and sw.js, build-dist ALLOW list covers public assets).

## App behavior to know before testing
- State is one localStorage key `terusin.v1`. Fresh profile = clean state.
- Day grid rows = weeks (Mon–Sun). A brand-new habit renders ONE row (current week) — past-day backfill is only possible for days earlier this week; more rows appear via "Buka 4 pekan sebelumnya" (only shown once the top row has a mark). Future cells are `disabled` + aria "Belum bisa ditandai".
- Cells: `.sel[data-t=YYYY-MM-DD]`, classes `-kini` (today), `-lewat` (past unmarked), `-isi` (marked), `-luar` (future). Adjacent marked days merge visually via `-sL`/`-sR`.
- Streak text: "N hari nyambung" / "belum jalan" in `.kartu__stat`; stacked habits add "· habis <name>" and trigger a header "giliran" line when the trigger habit is done today.

## Drag handle quirks (both paths tested)
- `.pegang` calls `preventDefault()` on pointerdown → **clicking the handle does NOT focus it**. Mouse click + Arrow keys does nothing. Keyboard reorder requires Tab-focusing the handle first, then ArrowUp/ArrowDown.
- Pointer drag reorders via vertical delta only (drop target = nearest card center to dragged card's center+dy). In a multi-column row (viewport ≥700px = 2-col grid, ≥1000px = 3-col) vertical drag can never swap — **narrow the window below 700px to test pointer drag** (`wmctrl -i -r <wid> -e 0,0,0,500,900`).

## Import/export
- Export auto-downloads `terusin-YYYY-MM-DD.json` to ~/Downloads. Import opens a GTK file chooser — `Ctrl+L`, type the absolute path, Enter.
- Adversarial import check: export → add a dummy habit → import → dummy must disappear (import fully replaces state through `pulihkan()`).

## Environment gotchas (Chrome for Testing / automation profile)
- `browser_console` tool does not await promises — stash results on `window.__x` then stringify in a second call.
- SW may not be registered on the very first page load even though `document.readyState` is complete; calling `navigator.serviceWorker.register('sw.js')` manually works instantly. `navigator.serviceWorker.controller` stayed null across reloads (pages uncontrolled) — appears to be an automation-profile quirk, verify in a normal Chrome profile if offline behavior matters. On a second origin/port the registration can be stuck empty (reg exists, no worker, no caches) — move to an origin where a SW already activated and let it auto-update.
- After `location.reload()`/F5, `browser_console` evals get blocked ~10-30 s by a phantom "JavaScript dialog" — retry or use `xdotool key F5` for the reload itself; the block clears on its own.
- Toast lifetime is ~6 s with an action button (~2.6 s without) — too fast for screenshot round-trips. Capture the whole screen with `ffmpeg -f x11grab` during the reload and extract frames, or set `#toast.hidden = false` afterwards to re-show the app's own last toast (its action button still has the real wired handler, so a real pointer click still exercises the feature).
- Notification permission prompt is a real browser dialog — click Allow at its coordinates; `Notification.permission` then reads `granted` and `cekIngat` fires an OS-level notification at boot when the chosen time has passed and habits are unmarked (once/day via `ingatTerakhir`).
- DevTools: F12 opens docked panel; Application tab lives under the `>>` overflow. Cache storage shows `terusin-v4` with 14 entries (`?v=4` assets + maskable icons); Service Workers panel shows the periodic-sync test row.

## Devin Secrets Needed
- none — app is fully static, no login.
