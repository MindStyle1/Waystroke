# Navigation and workshop

The visitor reads the hero, design, services, process, team and contact sections and reaches them from navigation.

## Sub-features

Hero and section visibility; desktop header; mobile disclosure; CTA; skip-link keyboard path.

## How to get to it (user POV)

Header links «Дизайн», «Услуги», «Контакты»; hero «Смотреть дизайн»; header/hero/services/mobile CTAs; brand to top; first Tab skip link. Team is reached by scrolling after process.

## Driving it with Playwright

Preconditions: Launch and Doctor; telemetry intercepted; fresh Russian root page.

- **Drive navigation:** `node .agents/skills/verify-waystroke/scripts/drive.mjs http://127.0.0.1:4173/ output/playwright/verify-waystroke navigation`.

`navigation` drives all three header destinations on desktop/mobile, menu Enter/Tab/Escape and clean URLs, plus Enter navigation for all three destinations after a reduced-motion reload. Expected: section top below header, collapsed menu, focus returned. Additionally use Playwright `getByRole("link", {name:"Смотреть дизайн"})`, `.brand`, `.hero a[data-track]`, `.services a[data-track]`, `.mobile-menu__cta` and first Tab → Enter for each distinct entry point; capture action and viewport/focus result.

- **Observe:** actions and PASS/FAIL in `journeys.json`, ARIA state and screenshots under `output/playwright/verify-waystroke`. Additional entry points require their own action/result record.

## Gotchas

Scroll animations need time to settle. Closed mobile links must be absent from the focus path. No dedicated About or Projects route. CTA clicks are telemetry writes unless intercepted. Common helper checks scroll through team content but do not assert its copy.
