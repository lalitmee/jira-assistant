# Settings Page Design

**Project:** Worklog Auditor (`jira-assistant`)  
**Date:** 2026-08-07  
**Status:** Implemented

## Summary

Add a dedicated Settings page reachable from the user menu. Settings persist in `localStorage` via a unified settings module. The calendar remains the primary view; settings are visited occasionally to tune display and behavior.

Audit hour bands (6h–8h) stay fixed. Default calendar layout continues to remember last used (no setting).

## Navigation

- User menu gains **Settings** above **Log out**
- Settings page uses the same app shell header with **← Calendar** back navigation
- View switch in `App`: `'calendar' | 'settings'` (no router dependency for v1)
- Theme control appears in **both** the user menu and Settings → Appearance (kept in sync)

## Settings inventory

### Display

| Setting              | Type                       | Default       | Notes                                                     |
| -------------------- | -------------------------- | ------------- | --------------------------------------------------------- |
| Show legend swatches | toggle                     | on            | Hides color swatches only; range total stays in toolbar   |
| Calendar density     | `compact` \| `comfortable` | `comfortable` | Affects month/week day cell sizing via `data-density` CSS |

### Calendar

| Setting        | Type                 | Default  | Notes                                           |
| -------------- | -------------------- | -------- | ----------------------------------------------- |
| Week starts on | `sunday` \| `monday` | `sunday` | Affects week labels, week window, swipe pager   |
| Future days    | show \| hide         | show     | Hide removes future days from the grid entirely |

### Navigation

| Setting    | Type   | Default | Notes                              |
| ---------- | ------ | ------- | ---------------------------------- |
| Week swipe | toggle | on      | Off → arrow buttons and Today only |

### Regional

| Setting     | Type                       | Default  | Notes                                                           |
| ----------- | -------------------------- | -------- | --------------------------------------------------------------- |
| Time format | `system` \| `12h` \| `24h` | `system` | Day drawer worklog timestamps                                   |
| Date format | enum                       | `medium` | e.g. `Mon 4 Aug 2026`, `4 Aug 2026`, `04/08/2026`, `2026-08-04` |

### Day drawer

| Setting            | Type                       | Default | Notes                                       |
| ------------------ | -------------------------- | ------- | ------------------------------------------- |
| Show dev estimates | toggle                     | on      | Hide estimate comparison rows               |
| Group worklogs     | `issue` \| `chronological` | `issue` | Flat list sorted by time when chronological |

### Appearance

| Setting | Type              | Default | Notes                                       |
| ------- | ----------------- | ------- | ------------------------------------------- |
| Theme   | `light` \| `dark` | `light` | Synced with existing user-menu theme toggle |

### Not configurable (v1)

- Audit hour thresholds (fixed 6h min, 8h max)
- Default layout on load (remember last week/month via existing `ja_calendar_layout` migration)
- Custom accent colors, server-synced prefs, per-project rules

## Data model

Single localStorage key: `ja_settings` (JSON, versioned).

```typescript
type Settings = {
  version: 1;
  showLegend: boolean;
  density: 'compact' | 'comfortable';
  weekStart: 'sunday' | 'monday';
  showFutureDays: boolean;
  weekSwipeEnabled: boolean;
  timeFormat: 'system' | '12h' | '24h';
  dateFormat: 'short' | 'medium' | 'numeric' | 'iso';
  drawerShowEstimates: boolean;
  drawerGroupBy: 'issue' | 'chronological';
  theme: 'light' | 'dark';
  layout: 'week' | 'month';
};
```

### Migration

On first load, merge legacy keys into the blob:

- `ja_theme` → `theme`
- `ja_calendar_layout` → `layout`

Remove legacy keys after successful migration.

### Apply pipeline

`applySettings(settings)`:

1. Set `document.documentElement` attributes: `data-theme`, `data-density`, `data-week-start`
2. Dispatch settings change event for React subscribers
3. Persist to `localStorage`

**Reset to defaults** restores schema defaults except `layout` (keep last-used calendar mode).

## UI structure

Settings page sections (top to bottom):

1. **Display** — legend toggle, density segmented control
2. **Calendar** — week start, future days
3. **Navigation** — week swipe toggle
4. **Regional** — time format, date format dropdown
5. **Day drawer** — estimates toggle, grouping segmented control
6. **Appearance** — theme pill (same component as user menu)
7. **Reset to defaults** — secondary button at bottom

Use existing `Button` component for actions. Form controls match pill/secondary styling from the design system.

## Component impact

| File                                        | Change                                                        |
| ------------------------------------------- | ------------------------------------------------------------- |
| `apps/web/src/settings.ts`                  | New — schema, read/write, migrate, apply                      |
| `apps/web/src/SettingsContext.tsx`          | New — provider + hook                                         |
| `apps/web/src/components/SettingsPage.tsx`  | New — settings form                                           |
| `apps/web/src/App.tsx`                      | View switch; conditional legend; toolbar total always visible |
| `apps/web/src/components/UserMenu.tsx`      | Settings link; theme stays                                    |
| `apps/web/src/components/CalendarViews.tsx` | Swipe toggle, week start, future days, density                |
| `apps/web/src/components/DayChip.tsx`       | Week start labels; hide future days                           |
| `apps/web/src/components/DayDrawer.tsx`     | Grouping, estimates, formatters                               |
| `apps/web/src/theme.ts`                     | Delegate to settings module or stay synced                    |
| `apps/web/src/styles.css`                   | `[data-density="compact"]` grid overrides                     |

## Toolbar behavior (legend)

When `showLegend` is off:

- Hide all legend swatches (Weekend, Future, 6h–8h, Under 6h, Over 8h)
- Keep **Total** duration visible in the main toolbar
- Layout switcher unchanged

## Out of scope (v1)

- URL routing (`/settings` in address bar)
- Export/import settings
- Custom hour thresholds
- Separate month vs week density controls

## Success criteria

- User can hide legend swatches while keeping the range total
- All agreed toggles persist across reload
- Theme changes from user menu reflect on Settings page and vice versa
- Week start and swipe toggles visibly affect week view
- Reset restores defaults without breaking calendar layout preference
