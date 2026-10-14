# Waystroke project verification

For behavior changes and production checks, use [.agents/skills/verify-waystroke/SKILL.md](.agents/skills/verify-waystroke/SKILL.md) and its [Feature Map](.agents/skills/verify-waystroke/features/README.md). Exercise the affected user entry points and preserve proof under `output/playwright/`.

The production surface is a prerendered single page on GitHub Pages; section IDs are not routes. Compare a fresh local production build and the public target when deployment behavior matters. Never submit real bookings/messages or write test conversion events. Follow the verification skill's telemetry interception and owned-instance cleanup.
