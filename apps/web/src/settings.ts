import type { CalendarLayout } from './components/DayChip';
import { THEME_CHANGE_EVENT, type Theme } from './theme';

export type CalendarSpacing = 'tight' | 'normal' | 'relaxed';
export type WeekStart = 'sunday' | 'monday';
export type WeekWindowWeeks = 1 | 2;
export type TimeFormat = 'system' | '12h' | '24h';
export type DateFormat = 'short' | 'medium' | 'numeric' | 'iso';
export type DrawerGroupBy = 'issue' | 'chronological';

export type Settings = {
  version: 2;
  showLegend: boolean;
  calendarGrid: boolean;
  calendarSpacing: CalendarSpacing;
  weekStart: WeekStart;
  weekWindowWeeks: WeekWindowWeeks;
  showFutureDays: boolean;
  weekSwipeEnabled: boolean;
  timeFormat: TimeFormat;
  dateFormat: DateFormat;
  drawerShowEstimates: boolean;
  drawerGroupBy: DrawerGroupBy;
  theme: Theme;
  layout: CalendarLayout;
};

export const SETTINGS_STORAGE_KEY = 'ja_settings';
export const SETTINGS_CHANGE_EVENT = 'ja-settings-change';

const LEGACY_THEME_KEY = 'ja_theme';
const LEGACY_LAYOUT_KEY = 'ja_calendar_layout';

export const DEFAULT_SETTINGS: Settings = {
  version: 2,
  showLegend: true,
  calendarGrid: false,
  calendarSpacing: 'normal',
  weekStart: 'sunday',
  weekWindowWeeks: 1,
  showFutureDays: true,
  weekSwipeEnabled: true,
  timeFormat: 'system',
  dateFormat: 'medium',
  drawerShowEstimates: true,
  drawerGroupBy: 'issue',
  theme: 'light',
  layout: 'month',
};

export const CALENDAR_SPACING_OPTIONS: Array<{ value: CalendarSpacing; label: string }> = [
  { value: 'tight', label: 'Tight' },
  { value: 'normal', label: 'Normal' },
  { value: 'relaxed', label: 'Relaxed' },
];

export const WEEK_WINDOW_WEEKS_OPTIONS: Array<{ value: WeekWindowWeeks; label: string }> = [
  { value: 1, label: '1 week' },
  { value: 2, label: '2 weeks' },
];

function readLegacyTheme(): Theme | null {
  try {
    const v = localStorage.getItem(LEGACY_THEME_KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    // ignore
  }
  return null;
}

function readLegacyLayout(): CalendarLayout | null {
  try {
    const v = localStorage.getItem(LEGACY_LAYOUT_KEY);
    if (v === 'week' || v === 'month') return v;
  } catch {
    // ignore
  }
  return null;
}

function systemTheme(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function parseCalendarSpacing(value: unknown): CalendarSpacing | null {
  if (value === 'tight' || value === 'normal' || value === 'relaxed') return value;
  return null;
}

function parseWeekWindowWeeks(value: unknown): WeekWindowWeeks {
  return value === 2 ? 2 : 1;
}

function sharedFields(
  o: Record<string, unknown>,
): Omit<Settings, 'version' | 'calendarGrid' | 'calendarSpacing'> | null {
  const theme: Theme | null = o.theme === 'dark' ? 'dark' : o.theme === 'light' ? 'light' : null;
  const layout: CalendarLayout | null =
    o.layout === 'week' ? 'week' : o.layout === 'month' ? 'month' : null;
  const weekStart: WeekStart | null =
    o.weekStart === 'monday' ? 'monday' : o.weekStart === 'sunday' ? 'sunday' : null;
  const timeFormat: TimeFormat | null =
    o.timeFormat === '12h'
      ? '12h'
      : o.timeFormat === '24h'
        ? '24h'
        : o.timeFormat === 'system'
          ? 'system'
          : null;
  const dateFormat: DateFormat | null =
    o.dateFormat === 'short' ||
    o.dateFormat === 'medium' ||
    o.dateFormat === 'numeric' ||
    o.dateFormat === 'iso'
      ? (o.dateFormat as DateFormat)
      : null;
  const drawerGroupBy: DrawerGroupBy | null =
    o.drawerGroupBy === 'chronological'
      ? 'chronological'
      : o.drawerGroupBy === 'issue'
        ? 'issue'
        : null;

  if (!theme || !layout || !weekStart || !timeFormat || !dateFormat || !drawerGroupBy) return null;

  return {
    showLegend: o.showLegend !== false,
    weekStart,
    weekWindowWeeks: parseWeekWindowWeeks(o.weekWindowWeeks),
    showFutureDays: o.showFutureDays !== false,
    weekSwipeEnabled: o.weekSwipeEnabled !== false,
    timeFormat,
    dateFormat,
    drawerShowEstimates: o.drawerShowEstimates !== false,
    drawerGroupBy,
    theme,
    layout,
  };
}

function parseSettingsV2(raw: unknown): Settings | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 2) return null;

  const shared = sharedFields(o);
  const calendarSpacing = parseCalendarSpacing(o.calendarSpacing);
  if (!shared || calendarSpacing == null || typeof o.calendarGrid !== 'boolean') return null;

  return {
    version: 2,
    calendarGrid: o.calendarGrid,
    calendarSpacing,
    ...shared,
  };
}

function migrateSettingsV1(raw: unknown): Settings | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1) return null;

  const shared = sharedFields(o);
  if (!shared) return null;

  const calendarSpacing = o.density === 'compact' ? 'tight' : 'normal';

  return {
    version: 2,
    calendarGrid: false,
    calendarSpacing,
    ...shared,
  };
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      const current = parseSettingsV2(data);
      if (current) return current;
      const migrated = migrateSettingsV1(data);
      if (migrated) {
        saveSettings(migrated);
        return migrated;
      }
    }
  } catch {
    // ignore
  }

  const legacyTheme = readLegacyTheme();
  const legacyLayout = readLegacyLayout();
  return {
    ...DEFAULT_SETTINGS,
    theme: legacyTheme ?? systemTheme(),
    layout: legacyLayout ?? DEFAULT_SETTINGS.layout,
  };
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    localStorage.removeItem(LEGACY_THEME_KEY);
    localStorage.removeItem(LEGACY_LAYOUT_KEY);
  } catch {
    // ignore
  }
}

export function applySettings(settings: Settings): void {
  document.documentElement.setAttribute('data-theme', settings.theme);
  document.documentElement.setAttribute(
    'data-calendar-grid',
    settings.calendarGrid ? 'true' : 'false',
  );
  document.documentElement.setAttribute('data-calendar-spacing', settings.calendarSpacing);
  document.documentElement.setAttribute('data-week-start', settings.weekStart);
  saveSettings(settings);
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: settings.theme }));
  window.dispatchEvent(new CustomEvent(SETTINGS_CHANGE_EVENT, { detail: settings }));
}

export function resetSettings(currentLayout: CalendarLayout): Settings {
  return {
    ...DEFAULT_SETTINGS,
    theme: systemTheme(),
    layout: currentLayout,
  };
}

export function formatDrawerDate(iso: string, dateFormat: DateFormat): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;

  switch (dateFormat) {
    case 'short':
      return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    case 'numeric':
      return d.toLocaleDateString(undefined, { dateStyle: 'short' });
    case 'iso':
      return iso;
    case 'medium':
    default:
      return d.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
  }
}

export function formatDrawerTime(iso: string, timeFormat: TimeFormat): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  if (timeFormat === 'system') {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  });
}

export const DATE_FORMAT_OPTIONS: Array<{ value: DateFormat; label: string }> = [
  { value: 'medium', label: 'Mon, August 4, 2026' },
  { value: 'short', label: 'Mon, Aug 4' },
  { value: 'numeric', label: '08/04/2026' },
  { value: 'iso', label: '2026-08-04' },
];

export const TIME_FORMAT_OPTIONS: Array<{ value: TimeFormat; label: string }> = [
  { value: 'system', label: 'System default' },
  { value: '12h', label: '12-hour' },
  { value: '24h', label: '24-hour' },
];
