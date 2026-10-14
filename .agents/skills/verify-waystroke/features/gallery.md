# Concept gallery

The visitor opens six example website concepts and returns to their card.

## Sub-features

Cards sdvig, miora, moto, kroshka, exhibit, saldo; dialog heading, initial focus, focus containment, Escape and return.

## How to get to it (user POV)

Scroll to Design or follow «Дизайн» / «Смотреть дизайн», then choose a concept card.

## Driving it with Playwright

Preconditions: Launch and Doctor; telemetry intercepted; fresh Russian root page.

- **Drive gallery:** `node .agents/skills/verify-waystroke/scripts/drive.mjs http://127.0.0.1:4173/ output/playwright/verify-waystroke gallery`.

`gallery` clicks `button[data-concept="sdvig|miora|moto|kroshka|exhibit|saldo"]` one at a time, observes `getByRole("dialog")`, focused close button and Tab containment, then Escape and restored card focus. Additionally close with `getByRole("dialog").getByRole("button")` and a click outside its bounding rectangle; prove the same end state. Screenshots include first modal for each viewport.

- **Observe:** actions and PASS/FAIL in `journeys.json`, ARIA state and screenshots under `output/playwright/verify-waystroke`. Additional entry points require their own action/result record.

## Gotchas

These are concept demos. Decorative nested mock controls are inert; do not book via a concept. Source does not contain the previously documented slider. Modal keyboard and visible-close paths must both be covered.
