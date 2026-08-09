import type { CalendarLayout } from './components/DayChip';
import {
  defaultWeekRange,
  defaultWeekWindowStart,
  parseLocal,
} from './lib/calendarDates';
import { defaultRange, monthRange, toIsoDate, type DurationFormat } from './api';
import { THEME_CHANGE_EVENT, type ResolvedTheme, type ThemePreference } from './theme';

export type CalendarSpacing = 'tight' | 'normal' | 'relaxed';
export type WeekStart = 'sunday' | 'monday';
export type WeekWindowWeeks = 1 | 2;
export type TimeFormat = 'system' | '12h' | '24h';
export type DateFormat = 'short' | 'medium' | 'numeric' | 'iso';
export type DrawerGroupBy = 'issue' | 'chronological';
export type { DurationFormat };
export type StartupRange = 'month-to-date' | 'current-week' | 'full-month';
export type DefaultLayout = 'remember' | 'week' | 'month';
export type ReducedMotion = 'system' | 'reduce' | 'no-preference';
export type IssueLinkTarget = 'new-tab' | 'same-tab';

export type AuditConfig = {
  minHours: number;
  maxHours: number;
  auditWeekends: boolean;
};

export type Settings = {
  version: 3;
  showLegend: boolean;
  calendarGrid: boolean;
  calendarSpacing: CalendarSpacing;
  weekStart: WeekStart;
  weekWindowWeeks: WeekWindowWeeks;
  showFutureDays: boolean;
  weekSwipeEnabled: boolean;
  monthSwipeEnabled: boolean;
  timeFormat: TimeFormat;
  dateFormat: DateFormat;
  durationFormat: DurationFormat;
  startupRange: StartupRange;
  defaultLayout: DefaultLayout;
  drawerShowEstimates: boolean;
  drawerGroupBy: DrawerGroupBy;
  drawerShowComments: boolean;
  drawerShowSummary: boolean;
  issueLinkTarget: IssueLinkTarget;
  auditMinHours: number;
  auditMaxHours: number;
  auditWeekends: boolean;
  theme: ThemePreference;
  reducedMotion: ReducedMotion;
  layout: CalendarLayout;
};

export const SETTINGS_STORAGE_KEY = 'ja_settings';
export const SETTINGS_CHANGE_EVENT = 'ja-settings-change';

export const AUDIT_HOURS_MIN = 1;
export const AUDIT_HOURS_MAX = 12;

const LEGACY_THEME_KEY = 'ja_theme';
const LEGACY_LAYOUT_KEY = 'ja_calendar_layout';

export const DEFAULT_SETTINGS: Settings = {
  version: 3,
  showLegend: true,
  calendarGrid: false,
  calendarSpacing: 'normal',
  weekStart: 'sunday',
  weekWindowWeeks: 1,
  showFutureDays: true,
  weekSwipeEnabled: true,
  monthSwipeEnabled: true,
  timeFormat: 'system',
  dateFormat: 'medium',
  durationFormat: 'hm',
  startupRange: 'month-to-date',
  defaultLayout: 'remember',
  drawerShowEstimates: true,
  drawerGroupBy: 'issue',
  drawerShowComments: true,
  drawerShowSummary: true,
  issueLinkTarget: 'new-tab',
  auditMinHours: 6,
  auditMaxHours: 8,
  auditWeekends: false,
  theme: 'system',
  reducedMotion: 'system',
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

export const DURATION_FORMAT_OPTIONS: Array<{ value: DurationFormat; label: string }> = [
  { value: 'hm', label: '7h 30m' },
  { value: 'decimal', label: '7.5h' },
];

export const STARTUP_RANGE_OPTIONS: Array<{ value: StartupRange; label: string }> = [
  { value: 'month-to-date', label: 'Month to date' },
  { value: 'current-week', label: 'Current week' },
  { value: 'full-month', label: 'Full month' },
];

export const DEFAULT_LAYOUT_OPTIONS: Array<{ value: DefaultLayout; label: string }> = [
  { value: 'remember', label: 'Remember last' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

export const REDUCED_MOTION_OPTIONS: Array<{ value: ReducedMotion; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'reduce', label: 'Reduce' },
  { value: 'no-preference', label: 'Animate' },
];

export const ISSUE_LINK_OPTIONS: Array<{ value: IssueLinkTarget; label: string }> = [
  { value: 'new-tab', label: 'New tab' },
  { value: 'same-tab', label: 'Same tab' },
];

export const THEME_PREFERENCE_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function readLegacyTheme(): ThemePreference | null {
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

export function systemTheme(): ResolvedTheme {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') return systemTheme();
  return preference;
}

export function systemPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function resolveReducedMotion(preference: ReducedMotion): boolean {
  if (preference === 'reduce') return true;
  if (preference === 'no-preference') return false;
  return systemPrefersReducedMotion();
}

export function clampAuditHours(minHours: number, maxHours: number): { minHours: number; maxHours: number } {
  const min = Math.min(AUDIT_HOURS_MAX, Math.max(AUDIT_HOURS_MIN, Math.round(minHours)));
  const max = Math.min(AUDIT_HOURS_MAX, Math.max(AUDIT_HOURS_MIN, Math.round(maxHours)));
  return min <= max ? { minHours: min, maxHours: max } : { minHours: max, maxHours: min };
}

export function auditConfigFromSettings(settings: Pick<Settings, 'auditMinHours' | 'auditMaxHours' | 'auditWeekends'>): AuditConfig {
  const { minHours, maxHours } = clampAuditHours(settings.auditMinHours, settings.auditMaxHours);
  return { minHours, maxHours, auditWeekends: settings.auditWeekends };
}

export function formatAuditBandLabel(minHours: number, maxHours: number): string {
  return `${minHours}h–${maxHours}h`;
}

export function formatUnderAuditLabel(minHours: number): string {
  return `Under ${minHours}h`;
}

export function formatOverAuditLabel(maxHours: number): string {
  return `Over ${maxHours}h`;
}

export function rangeForStartup(
  startupRange: StartupRange,
  weekStart: WeekStart,
  weekWindowWeeks: WeekWindowWeeks,
  showFutureDays: boolean,
): { from: string; to: string } {
  if (startupRange === 'current-week') {
    return defaultWeekRange(weekStart, weekWindowWeeks);
  }

  if (startupRange === 'full-month') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { from, to } = monthRange(today.getFullYear(), today.getMonth());
    if (showFutureDays) {
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { from, to: toIsoDate(end) };
    }
    return { from, to };
  }

  return defaultRange();
}

export function weekFocusForStartup(
  _startupRange: StartupRange,
  weekStart: WeekStart,
  weekWindowWeeks: WeekWindowWeeks,
): string {
  return defaultWeekWindowStart(weekStart, weekWindowWeeks);
}

function applyDefaultLayout(settings: Settings): Settings {
  if (settings.defaultLayout === 'remember') return settings;
  return { ...settings, layout: settings.defaultLayout };
}

function parseCalendarSpacing(value: unknown): CalendarSpacing | null {
  if (value === 'tight' || value === 'normal' || value === 'relaxed') return value;
  return null;
}

function parseWeekWindowWeeks(value: unknown): WeekWindowWeeks {
  return value === 2 ? 2 : 1;
}

type SharedV2Fields = Omit<
  Settings,
  | 'version'
  | 'calendarGrid'
  | 'calendarSpacing'
  | 'monthSwipeEnabled'
  | 'durationFormat'
  | 'startupRange'
  | 'defaultLayout'
  | 'drawerShowComments'
  | 'drawerShowSummary'
  | 'issueLinkTarget'
  | 'auditMinHours'
  | 'auditMaxHours'
  | 'auditWeekends'
  | 'reducedMotion'
>;

function sharedFieldsV2(o: Record<string, unknown>): SharedV2Fields | null {
  const theme: ThemePreference | null =
    o.theme === 'dark' ? 'dark' : o.theme === 'light' ? 'light' : o.theme === 'system' ? 'system' : null;
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

function parseSettingsV3(raw: unknown): Settings | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 3) return null;

  const shared = sharedFieldsV2(o);
  const calendarSpacing = parseCalendarSpacing(o.calendarSpacing);
  if (!shared || calendarSpacing == null || typeof o.calendarGrid !== 'boolean') return null;

  const durationFormat: DurationFormat | null =
    o.durationFormat === 'decimal' ? 'decimal' : o.durationFormat === 'hm' ? 'hm' : null;
  const startupRange: StartupRange | null =
    o.startupRange === 'current-week' || o.startupRange === 'full-month' || o.startupRange === 'month-to-date'
      ? o.startupRange
      : null;
  const defaultLayout: DefaultLayout | null =
    o.defaultLayout === 'remember' || o.defaultLayout === 'week' || o.defaultLayout === 'month'
      ? o.defaultLayout
      : null;
  const reducedMotion: ReducedMotion | null =
    o.reducedMotion === 'reduce' || o.reducedMotion === 'no-preference' || o.reducedMotion === 'system'
      ? o.reducedMotion
      : null;
  const issueLinkTarget: IssueLinkTarget | null =
    o.issueLinkTarget === 'same-tab' || o.issueLinkTarget === 'new-tab' ? o.issueLinkTarget : null;

  if (!durationFormat || !startupRange || !defaultLayout || !reducedMotion || !issueLinkTarget) return null;

  const audit = clampAuditHours(Number(o.auditMinHours), Number(o.auditMaxHours));

  return applyDefaultLayout({
    version: 3,
    calendarGrid: o.calendarGrid,
    calendarSpacing,
    monthSwipeEnabled: o.monthSwipeEnabled !== false,
    durationFormat,
    startupRange,
    defaultLayout,
    drawerShowComments: o.drawerShowComments !== false,
    drawerShowSummary: o.drawerShowSummary !== false,
    issueLinkTarget,
    auditMinHours: audit.minHours,
    auditMaxHours: audit.maxHours,
    auditWeekends: o.auditWeekends === true,
    reducedMotion,
    ...shared,
  });
}

function migrateSettingsV2(raw: unknown): Settings | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 2) return null;

  const shared = sharedFieldsV2(o);
  const calendarSpacing = parseCalendarSpacing(o.calendarSpacing);
  if (!shared || calendarSpacing == null || typeof o.calendarGrid !== 'boolean') return null;

  return applyDefaultLayout({
    version: 3,
    calendarGrid: o.calendarGrid,
    calendarSpacing,
    monthSwipeEnabled: true,
    durationFormat: 'hm',
    startupRange: 'month-to-date',
    defaultLayout: 'remember',
    drawerShowComments: true,
    drawerShowSummary: true,
    issueLinkTarget: 'new-tab',
    auditMinHours: 6,
    auditMaxHours: 8,
    auditWeekends: false,
    reducedMotion: 'system',
    ...shared,
  });
}

function migrateSettingsV1(raw: unknown): Settings | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1) return null;

  const shared = sharedFieldsV2(o);
  if (!shared) return null;

  const calendarSpacing = o.density === 'compact' ? 'tight' : 'normal';

  return applyDefaultLayout({
    version: 3,
    calendarGrid: false,
    calendarSpacing,
    monthSwipeEnabled: true,
    durationFormat: 'hm',
    startupRange: 'month-to-date',
    defaultLayout: 'remember',
    drawerShowComments: true,
    drawerShowSummary: true,
    issueLinkTarget: 'new-tab',
    auditMinHours: 6,
    auditMaxHours: 8,
    auditWeekends: false,
    reducedMotion: 'system',
    ...shared,
  });
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      const current = parseSettingsV3(data);
      if (current) return current;
      const fromV2 = migrateSettingsV2(data);
      if (fromV2) {
        saveSettings(fromV2);
        return fromV2;
      }
      const fromV1 = migrateSettingsV1(data);
      if (fromV1) {
        saveSettings(fromV1);
        return fromV1;
      }
    }
  } catch {
    // ignore
  }

  const legacyTheme = readLegacyTheme();
  const legacyLayout = readLegacyLayout();
  return applyDefaultLayout({
    ...DEFAULT_SETTINGS,
    theme: legacyTheme ?? 'system',
    layout: legacyLayout ?? DEFAULT_SETTINGS.layout,
  });
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
  const resolvedTheme = resolveTheme(settings.theme);
  const reducedMotion = resolveReducedMotion(settings.reducedMotion);

  document.documentElement.setAttribute('data-theme', resolvedTheme);
  document.documentElement.setAttribute(
    'data-calendar-grid',
    settings.calendarGrid ? 'true' : 'false',
  );
  document.documentElement.setAttribute('data-calendar-spacing', settings.calendarSpacing);
  document.documentElement.setAttribute('data-week-start', settings.weekStart);
  document.documentElement.setAttribute('data-reduced-motion', reducedMotion ? 'true' : 'false');
  saveSettings(settings);
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: resolvedTheme }));
  window.dispatchEvent(new CustomEvent(SETTINGS_CHANGE_EVENT, { detail: settings }));
}

export function resetSettings(currentLayout: CalendarLayout): Settings {
  const layout =
    DEFAULT_SETTINGS.defaultLayout === 'remember'
      ? currentLayout
      : DEFAULT_SETTINGS.defaultLayout;

  return applyDefaultLayout({
    ...DEFAULT_SETTINGS,
    theme: 'system',
    layout,
  });
}

export function formatDrawerDate(iso: string, dateFormat: DateFormat): string {
  const d = parseLocal(iso);
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

let themeMediaQuery: MediaQueryList | null = null;
let themeMediaHandler: (() => void) | null = null;
let reducedMotionMediaQuery: MediaQueryList | null = null;
let reducedMotionMediaHandler: (() => void) | null = null;

export function bindSystemPreferenceListeners(getSettings: () => Settings): void {
  if (typeof window === 'undefined') return;

  if (!themeMediaQuery) {
    themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    themeMediaHandler = () => {
      const settings = getSettings();
      if (settings.theme !== 'system') return;
      applySettings(settings);
    };
    themeMediaQuery.addEventListener('change', themeMediaHandler);
  }

  if (!reducedMotionMediaQuery) {
    reducedMotionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionMediaHandler = () => {
      const settings = getSettings();
      if (settings.reducedMotion !== 'system') return;
      applySettings(settings);
    };
    reducedMotionMediaQuery.addEventListener('change', reducedMotionMediaHandler);
  }
}

export function unbindSystemPreferenceListeners(): void {
  if (themeMediaQuery && themeMediaHandler) {
    themeMediaQuery.removeEventListener('change', themeMediaHandler);
    themeMediaQuery = null;
    themeMediaHandler = null;
  }
  if (reducedMotionMediaQuery && reducedMotionMediaHandler) {
    reducedMotionMediaQuery.removeEventListener('change', reducedMotionMediaHandler);
    reducedMotionMediaQuery = null;
    reducedMotionMediaHandler = null;
  }
}
