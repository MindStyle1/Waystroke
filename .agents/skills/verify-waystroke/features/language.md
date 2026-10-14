# RU / EN language

The visitor switches visible copy and reopens the page in the selected language.

## Sub-features

RU and EN buttons; pressed state; document language/title; query persistence; Russian reset.

## How to get to it (user POV)

Header RU/EN group; direct `/?lang=en`; browser reload after EN.

## Driving it with Playwright

Preconditions: Launch and Doctor; telemetry intercepted; fresh Russian root page.

- **Drive language:** `node .agents/skills/verify-waystroke/scripts/drive.mjs http://127.0.0.1:4173/ output/playwright/verify-waystroke language`.

`language` clicks EN, checks html lang and query, reloads and checks EN pressed, checks English OG/Twitter title/description and locale against the active document, then clicks RU and checks URL reset. Open `/?lang=en` in a fresh context separately to prove independent entry; inspect hero, sections, FAQ and gallery labels. Record title/description/OG/canonical rather than assuming all metadata is localized.

- **Observe:** actions and PASS/FAIL in `journeys.json`, ARIA state and screenshots under `output/playwright/verify-waystroke`. Additional entry points require their own action/result record.

## Gotchas

English is applied after hydration to Russian prerender. No distinct English prerender or hreflang in the current build. Title, description, OG/Twitter titles/descriptions/image alt and OG locale update together in the rendered DOM. Static query responses still contain Russian metadata for crawlers that do not execute JavaScript.
