---
name: verify-waystroke
description: Verify Waystroke's Angular portfolio in a real browser: production build, navigation, six concept dialogs, FAQ, RU/EN and safe contact links. Use after behavior changes or to compare local and deployed journeys.
---

# Verify Waystroke

Read [Feature Map](features/README.md) first. Work from the repository root. This is a static Angular 22.2 application: no login, database, migrations or seeds. The root page is prerendered; sections are not router routes. Do not infer deployed correctness from a build. Do not submit a booking, Telegram message, or analytics event.

## Launch

Use the installed dependencies; if absent, `npm ci` uses the repository lockfile. Node version: `.nvmrc` (24.21.0 at creation).

```sh
npm run build:prod
node .agents/skills/verify-waystroke/scripts/lifecycle.mjs launch output/playwright/verify-waystroke 4173
```

Launch fails if the port is occupied or an uncleaned instance exists. Readiness requires HTTP 200, the exact built HTML hash, hero content and hydration markers. `instance.json` identifies the PID, Linux process start time, URL and build. The application server listens on all interfaces; use loopback for testing. Do not rebuild the shared `dist` during another run. For parallel runs use separate checkouts/builds, ports and evidence directories.

## Doctor

```sh
node .agents/skills/verify-waystroke/scripts/lifecycle.mjs doctor output/playwright/verify-waystroke
```

Read-only check: PID ownership and process start time, current build hash, HTTP response identity and usable prerender. Any mismatch means stop driving and investigate. Remote targets do not have an owned PID: record HTTP identity and compare their HTML/resources separately.

## Drive

Use existing Playwright and Chromium. The helper resolves `playwright` normally or accepts `WAYSTROKE_PLAYWRIGHT_MODULE` as the absolute path to an **existing** `playwright/index.mjs`; `WAYSTROKE_CHROME` optionally selects an existing Chrome executable. These paths are machine-specific, not dependencies to install blindly. Discover cached runtimes with `find ~/.npm/_npx -path '*/playwright/index.mjs'` and `find ~/.cache/ms-playwright -name chrome`. If unavailable, use the existing Playwright MCP and the feature recipes; report the helper unavailable.

```sh
node .agents/skills/verify-waystroke/scripts/drive.mjs http://127.0.0.1:4173/ output/playwright/verify-waystroke all
# Focused example; actual selectors and entry points are in the map:
node .agents/skills/verify-waystroke/scripts/drive.mjs http://127.0.0.1:4173/ output/playwright/verify-waystroke gallery
# Published behavior is a separate target:
node .agents/skills/verify-waystroke/scripts/drive.mjs https://waystroke.online/ output/playwright/verify-waystroke-production all
```

Features: `navigation`, `gallery`, `faq`, `language`, `contacts`, `all`. Each runs desktop 1440×1000, mobile 390×844, narrow 320×800, common hero/reflow/resource checks and reduced-motion reload. Selectors derive from real ARIA names and existing IDs. Browser inputs use clicks/keyboard, never component setters. See `journeys.json` for each action/result. A nonzero exit is a failed journey or harness error, never a pass.

## Evidence

Store proof under the supplied directory (`output/playwright/verify-waystroke` by default): `instance.json`, `server.log`, `journeys.json`, ARIA snapshots, hero/page/modal/destination screenshots. JSON records browser version, URL, viewport profile, checks, observed metrics, responses, errors and intercepted boundary requests.

The helper intercepts the existing external telemetry boundaries `track.waystroke.online` and `/cdn-cgi/rum` before navigation and records their requests; no write reaches them. Cal.com and Telegram navigation stays real. Never press a date/time booking flow, submit a form or send a message. Calendar availability is an observation, not automatically a pass. Errors and failed resource requests require review even when assertions pass. Screenshots must be opened and reviewed to claim visual quality. Lab observers are single-session evidence; their raw event durations are **not** field INP. Raw shift entries require session-window aggregation for CLS.

For a keyboard/a11y audit additionally inspect hover and focus styles, reverse Tab, skip link, modal visible-close and backdrop entry paths, blocked-calendar fallback, no-JS mode and an actual screen reader if available. Automated checks do not establish WCAG conformance. Map entries not driven must be explicitly unverified.

## Cleanup

```sh
node .agents/skills/verify-waystroke/scripts/lifecycle.mjs cleanup output/playwright/verify-waystroke
```

Only stops the PID launched by this run after matching command and Linux process start time. The drive helper closes its own browser in `finally`. Run cleanup after failed iterations too. It preserves all proof. Confirm `journeys.json` and screenshots still exist. No kill-by-name, no deletion of evidence. Dist remains the project's normal build output.

## Helpers

- Executable `scripts/lifecycle.mjs`: Launch / Doctor / Cleanup (Linux `/proc` identity checks).
- Executable `scripts/calendar.mjs`: `node .agents/skills/verify-waystroke/scripts/calendar.mjs http://127.0.0.1:4173/ output/playwright/verify-waystroke-calendar` tests real booking readiness and controlled abort/unready HTTP 200/late-ready boundaries, without submissions. Late-ready coverage uses a labeled external-boundary fixture; real Cal.com coverage separately requires a visible schedule.
- Executable `scripts/drive.mjs`: feature journeys and evidence. Optional runtime environment variables above.
- Existing `node scripts/verify-prerender.mjs`: HTML contract without executing JS, also invoked by postbuild.
- Existing `npm test -- --watch=false`; `node --test worker/track.test.mjs`: focused unit verification; neither replaces Drive.

Use `/maintain-verification-skill` when features change to keep this map and its entry points honest.
