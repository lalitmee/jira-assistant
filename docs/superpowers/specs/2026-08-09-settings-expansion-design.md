# Settings Expansion Design

**Project:** Worklog Auditor (`jira-assistant`)  
**Date:** 2026-08-09  
**Status:** Approved

## Summary

Expand settings from v2 to v3 with 12 new preferences across display, calendar, navigation, audit, day drawer, and appearance. All settings persist in `localStorage` via `ja_settings`.

## New settings

| Section | Setting | Type | Default |
| ------- | ------- | ---- | ------- |
| Display | Duration format | `hm` \| `decimal` | `hm` |
| Calendar | Default layout | `remember` \| `week` \| `month` | `remember` |
| Calendar | Default startup range | `month-to-date` \| `current-week` \| `full-month` | `month-to-date` |
| Navigation | Month swipe | boolean | `true` |
| Audit | Min hours | 1–12 | `6` |
| Audit | Max hours | 1–12 | `8` |
| Audit | Audit weekends | boolean | `false` |
| Day drawer | Show comments | boolean | `true` |
| Day drawer | Show issue summary | boolean | `true` |
| Day drawer | Open issues in | `new-tab` \| `same-tab` | `new-tab` |
| Appearance | Theme | `system` \| `light` \| `dark` | `system` |
| Appearance | Reduced motion | `system` \| `reduce` \| `no-preference` | `system` |

## Data model

Settings `version: 3`. Migration from v2 copies existing fields; new fields use defaults. Theme `light`/`dark` maps directly; new installs default theme to `system`.

## Behavior

- **Theme system:** Resolved to `light`/`dark` on `data-theme`; listens to OS changes when preference is `system`.
- **Reduced motion:** Resolved to `data-reduced-motion`; carousel uses instant transitions when true.
- **Startup range:** Used on first load and Today reset.
- **Default layout:** When not `remember`, overrides persisted layout on each app load.
- **Audit hours:** Replace hardcoded 6/8 in `hoursStatus()`; legend labels update dynamically.
- **Audit weekends:** When off, weekends keep neutral styling; when on, same bands as weekdays.

## Out of scope

Server sync, export/import, custom colors, URL routing, keyboard shortcuts, prefetch toggle.
