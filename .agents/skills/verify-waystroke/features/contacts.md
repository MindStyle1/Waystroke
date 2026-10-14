# Contacts and booking

The visitor can reach Telegram or the real Cal.com booking page and inspect the inline calendar without booking.

## Sub-features

Contact Telegram; footer Telegram; external calendar; inline details; timeout fallback.

## How to get to it (user POV)

All CTAs and «Контакты» reach #contact. Contact links, footer Telegram, calendar summary, inline fallback and separate-tab link.

## Driving it with Playwright

Preconditions: Launch and Doctor; telemetry intercepted; fresh Russian root page.

- **Drive contacts:** `node .agents/skills/verify-waystroke/scripts/drive.mjs http://127.0.0.1:4173/ output/playwright/verify-waystroke contacts`.

`contacts` clicks first real Telegram and Cal.com contact links, observes destination popup URL and closes it without submission. It observes inline calendar frame URLs/responses after timeout. Additionally click footer Telegram and each inline calendar fallback link; toggle `details.cal summary` open/closed. In a fresh browser context abort Cal.com iframe requests, wait over 8 seconds and verify visible fallback remains usable. Intercept telemetry before any CTA.

- **Observe:** actions and PASS/FAIL in `journeys.json`, ARIA state and screenshots under `output/playwright/verify-waystroke`. Additional entry points require their own action/result record.

## Gotchas

A load event or availability data alone does not prove visible calendar content: the app acknowledges `__iframeReady` and accepts `linkReady` only from its own https://cal.com iframe. Cal.com network failure is an external boundary; report separately from Angular errors. Never select/submit a booking. Popup destination URL alone does not prove its full content. Use `node .agents/skills/verify-waystroke/scripts/calendar.mjs http://127.0.0.1:4173/ output/playwright/verify-waystroke-calendar` for real Cal.com readiness, aborted requests, HTTP 200 iframe loads without readiness, and delayed readiness from an isolated Cal.com boundary fixture. Error scenarios must end loading, keep the unready frame hidden/inert while allowing late readiness recovery, preserve the fallback, and allow closing/reopening. A real-boundary timeout is recorded as fallback coverage, not successful schedule coverage.
