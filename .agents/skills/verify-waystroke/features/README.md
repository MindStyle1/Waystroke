# Waystroke Feature Map

Maintained user journeys, based on source and live site on 2026-10-14. There is one route `/`; design, services and contacts are sections. «О мастерской» is the visible team section (`.team`). Six concept cards represent example designs, not shipped customer projects. There is no separate «Проекты» route and no comparison slider in the current version.

## Preconditions and conventions

Build, Launch and Doctor from SKILL.md. No auth or seeded data. Default Russian, clean query. Keep each evidence directory independent. `drive.mjs <URL> <DIR> <FEATURE>` drives Playwright inputs and common viewport/reduced-motion checks. Use `all` for the full automated sample. Review failures, errors and calendar observations, not only the pass count. Artifacts must survive Cleanup.

## Features

- [Navigation and workshop](navigation.md): hero, sections, mobile menu, CTA and skip link.
- [Concept gallery](gallery.md): six cards and native modal dialogs.
- [Services and FAQ](faq.md): service content, six question disclosures.
- [RU / EN](language.md): language switch and reload/query entry.
- [Contacts and booking](contacts.md): Telegram, external booking and inline calendar/fallback.

## Proof boundary

Each file lists all known entry points. Automated helper coverage is explicitly separated from additional manual paths. A feature is not fully verified if an entry point remains undriven. No booking/message submission. No production analytics writes. No field CWV or screen-reader verdict from browser assertions.
