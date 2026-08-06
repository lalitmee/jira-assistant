# Date Navigation Improvements

**Date:** 2026-08-07  
**Status:** Approved

## Goal

Make it easy to return to the current period after browsing history, and add minimal month-mode presets for common ranges.

## Decisions

| Topic | Choice |
|-------|--------|
| Week mode controls | Today shortcut only; swipe/arrows remain primary navigation |
| Month presets | This month, Last month (inside range popover) |
| Today placement | Month: header next to month nav; Week: beside week label |
| Today when current | Button shown but disabled |

## Behavior

### Today

| Mode | Action |
|------|--------|
| Month | Load current calendar month (`monthRange` for today’s year/month), capped at today |
| Week | Focus Sun–Sat week containing today; reload 12-week window via `weekWindowForFocus` |

### Presets (month popover only)

| Preset | Range |
|--------|-------|
| This month | Same as Today |
| Last month | Full previous calendar month |

Presets apply immediately and close the popover.

## UI

```
Month header:  [◀]  Aug 2026  [▶]  [Today]     Range ▾
Week view:     3–9 Aug 2026  [Today]   (above week carousel)
```

Popover adds preset chips above the day picker.

## Files

- `apps/web/src/api.ts` — `currentMonthRange`, `lastMonthRange`, `isCurrentMonth`
- `apps/web/src/components/DayChip.tsx` — `isCurrentWeek`
- `apps/web/src/components/RangeBar.tsx` — Today button, presets
- `apps/web/src/components/CalendarViews.tsx` — Today in week nav
- `apps/web/src/App.tsx` — `goToToday` handler
- `apps/web/src/styles.css` — preset chips, today button, week nav row

## Out of scope

- Custom range picker in week mode
- Auto-extending week window at swipe edges
- Extended presets (last 7 days, quarter, etc.)
