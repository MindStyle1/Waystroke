# Services and FAQ

The visitor understands three service offers and reads answers to six common questions.

## Sub-features

New website, adaptive layout, refinement; process; six native details disclosures open and close.

## How to get to it (user POV)

Use «Услуги», then scroll past workshop/team to «Коротко о главном».

## Driving it with Playwright

Preconditions: Launch and Doctor; telemetry intercepted; fresh Russian root page.

- **Drive faq:** `node .agents/skills/verify-waystroke/scripts/drive.mjs http://127.0.0.1:4173/ output/playwright/verify-waystroke faq`.

`faq` focuses each `.faq details summary`, presses Enter twice and observes `details.open` true then false. Also click a summary with pointer; assert visible answer text, and read the three `#services .service` cards and process 01–04. Common reflow check samples services and FAQ at three widths.

- **Observe:** actions and PASS/FAIL in `journeys.json`, ARIA state and screenshots under `output/playwright/verify-waystroke`. Additional entry points require their own action/result record.

## Gotchas

Native details may animate after input. Helper asserts disclosure state/count, not completeness/quality of answer text. No submission or backend mutation.
