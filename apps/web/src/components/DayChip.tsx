import type { DayBucket } from '../api';
import { formatDuration, MAX_RANGE_DAYS, spanDays } from '../api';
import type { WeekStart, WeekWindowWeeks } from '../settings';

export type CalendarLayout = 'week' | 'month';

/** @deprecated Migrated to ja_settings; kept for type re-exports only. */
export const LAYOUT_STORAGE_KEY = 'ja_calendar_layout';

export function hoursStatus(seconds: number, isWeekend: boolean): 'ok' | 'under' | 'over' | 'skip' {
  if (isWeekend) return 'skip';
  const hours = seconds / 3600;
  if (hours >= 6 && hours <= 8) return 'ok';
  if (hours > 8) return 'over';
  return 'under';
}

export function parseLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function eachDateInclusive(from: string, to: string): string[] {
  const out: string[] = [];
  const cur = parseLocal(from);
  const end = parseLocal(to);
  while (cur.getTime() <= end.getTime()) {
    out.push(toIso(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/** Sunday=0 … Saturday=6 (matches `Date#getDay`). */
export function sundayIndex(d: Date): number {
  return d.getDay();
}

/** Days since the start of the week containing `d`. */
export function weekStartOffset(d: Date, weekStart: WeekStart): number {
  const day = d.getDay();
  if (weekStart === 'sunday') return day;
  return (day + 6) % 7;
}

/** Week that contains `iso`, starting on Sunday or Monday. */
export function weekContaining(
  iso: string,
  weekStart: WeekStart = 'sunday',
): { from: string; to: string; dates: string[] } {
  const d = parseLocal(iso);
  const start = new Date(d);
  start.setDate(start.getDate() - weekStartOffset(d, weekStart));
  const dates: string[] = [];
  const cur = new Date(start);
  for (let i = 0; i < 7; i++) {
    dates.push(toIso(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return { from: dates[0], to: dates[6], dates };
}

export function weekdayLabels(weekStart: WeekStart): string[] {
  const base = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (weekStart === 'sunday') return base;
  return [...base.slice(1), base[0]];
}

export const WEEK_WINDOW_WEEKS = 12;

export function shiftWeekAnchor(anchorIso: string, deltaWeeks: number): string {
  const d = parseLocal(anchorIso);
  d.setDate(d.getDate() + deltaWeeks * 7);
  return toIso(d);
}

export function weekStartsInRange(from: string, to: string, weekStart: WeekStart): string[] {
  const start = weekContaining(from, weekStart).from;
  const end = weekContaining(to, weekStart).from;
  const out: string[] = [];
  let sun = start;
  while (sun <= end) {
    out.push(sun);
    sun = shiftWeekAnchor(sun, 1);
  }
  return out.length > 0 ? out : [start];
}

export function weekFocusIndexInRange(
  focusIso: string,
  rangeFrom: string,
  rangeTo: string,
  weekStart: WeekStart,
): number {
  const focusStart = weekContaining(focusIso, weekStart).from;
  return weekStartsInRange(rangeFrom, rangeTo, weekStart).indexOf(focusStart);
}

export const WEEK_PREFETCH_EDGE_WEEKS = 2;
export const WEEK_PREFETCH_WEEKS = 12;

export function shouldPrefetchEarlierWeeks(
  focusIso: string,
  rangeFrom: string,
  rangeTo: string,
  weekStart: WeekStart,
  edgeWeeks = WEEK_PREFETCH_EDGE_WEEKS,
): boolean {
  const idx = weekFocusIndexInRange(focusIso, rangeFrom, rangeTo, weekStart);
  return idx >= 0 && idx <= edgeWeeks;
}

export function extendRangeBackward(rangeFrom: string, weeks = WEEK_WINDOW_WEEKS): string {
  return shiftWeekAnchor(rangeFrom, -weeks);
}

/** One API-safe chunk (≤84 days) to load immediately before the earliest loaded week. */
export function earlierWeekPrefetchChunk(
  loadedRangeFrom: string,
  weekStart: WeekStart = 'sunday',
): { from: string; to: string } | null {
  const loadedWeekStart = weekContaining(loadedRangeFrom, weekStart).from;
  const chunkFrom = shiftWeekAnchor(loadedWeekStart, -WEEK_PREFETCH_WEEKS);
  const chunkTo = addDaysIso(loadedWeekStart, -1);
  if (chunkFrom > chunkTo) return null;
  return { from: chunkFrom, to: chunkTo };
}

export function addDaysIso(iso: string, days: number): string {
  const d = parseLocal(iso);
  d.setDate(d.getDate() + days);
  return toIso(d);
}

/** ISO of the 1st of the month that "owns" this week (Wednesday of Sun–Sat week). */
export function monthStartForWeek(weekStartIso: string): string {
  const mid = parseLocal(addDaysIso(weekStartIso, 3));
  return toIso(new Date(mid.getFullYear(), mid.getMonth(), 1));
}

/**
 * 12-week window for Week layout.
 * Prefer last 12 weeks ending at the current week when `focus` is inside that range;
 * otherwise start at the focus Sunday and extend forward (capped at current week).
 */
export function weekWindowForFocus(
  focusIso: string,
  weekStart: WeekStart = 'sunday',
): {
  from: string;
  to: string;
  weekStarts: string[];
} {
  const today = toIso(new Date());
  const focusStart = weekContaining(focusIso, weekStart).from;
  const currentStart = weekContaining(today, weekStart).from;
  const defaultStart = shiftWeekAnchor(currentStart, -(WEEK_WINDOW_WEEKS - 1));

  const start =
    focusStart >= defaultStart && focusStart <= currentStart ? defaultStart : focusStart;

  const weekStarts: string[] = [];
  for (let i = 0; i < WEEK_WINDOW_WEEKS; i++) {
    const sun = shiftWeekAnchor(start, i);
    if (sun > currentStart) break;
    weekStarts.push(sun);
  }

  if (weekStarts.length === 0) weekStarts.push(currentStart);

  const from = weekStarts[0];
  const lastStart = weekStarts[weekStarts.length - 1];
  const lastSat = weekContaining(lastStart, weekStart).to;
  const to = lastSat > today ? today : lastSat;
  return { from, to, weekStarts };
}

export function isCurrentWeek(focusStartIso: string, weekStart: WeekStart = 'sunday'): boolean {
  const today = toIso(new Date());
  return weekContaining(today, weekStart).from === focusStartIso;
}

/** Week anchors shown for a window starting at `windowStartIso`. */
export function weeksOnWindow(
  windowStartIso: string,
  weekStart: WeekStart,
  windowWeeks: WeekWindowWeeks,
): string[] {
  const start = weekContaining(windowStartIso, weekStart).from;
  if (windowWeeks === 1) return [start];
  return [start, shiftWeekAnchor(start, 1)];
}

/** @deprecated Use weeksOnWindow(windowStart, weekStart, visibleWeeks). */
export function visibleWeekStarts(
  windowStartIso: string,
  weekStart: WeekStart,
  visibleWeeks: WeekWindowWeeks,
): string[] {
  return weeksOnWindow(windowStartIso, weekStart, visibleWeeks);
}

/** Carousel page keys for 2-week mode: non-overlapping pairs stepping by 2 weeks. */
export function twoWeekWindowStartsInRange(
  rangeFrom: string,
  rangeTo: string,
  weekStart: WeekStart,
): string[] {
  const first = weekContaining(rangeFrom, weekStart).from;
  const last = weekContaining(rangeTo, weekStart).from;
  const out: string[] = [];
  let w = first;
  while (w <= last) {
    out.push(w);
    w = shiftWeekAnchor(w, 2);
  }
  return out.length > 0 ? out : [first];
}

/** Default window start for week view (current week, or previous week when window is 2). */
export function defaultWeekWindowStart(
  weekStart: WeekStart = 'sunday',
  windowWeeks: WeekWindowWeeks = 1,
): string {
  const currentStart = weekContaining(toIso(new Date()), weekStart).from;
  return windowWeeks === 1 ? currentStart : shiftWeekAnchor(currentStart, -1);
}

/** True when the visible window is the default position (includes current week when window is 2). */
export function isCurrentWeekWindow(
  windowStartIso: string,
  weekStart: WeekStart,
  windowWeeks: WeekWindowWeeks,
): boolean {
  const start = weekContaining(windowStartIso, weekStart).from;
  return start === defaultWeekWindowStart(weekStart, windowWeeks);
}

/** Shift carousel by one page (1 week in 1-week mode, 2 weeks in 2-week mode). */
export function shiftWeekWindow(
  windowStartIso: string,
  weekStart: WeekStart,
  pageDelta: number,
  windowWeeks: WeekWindowWeeks,
): string {
  const start = weekContaining(windowStartIso, weekStart).from;
  const step = windowWeeks === 2 ? 2 : 1;
  return shiftWeekAnchor(start, pageDelta * step);
}

/** Signed carousel page count between two window starts. */
export function weekCarouselPageDelta(
  fromWindowStart: string,
  toWindowStart: string,
  weekStart: WeekStart,
  windowWeeks: WeekWindowWeeks,
): number {
  const from = weekContaining(fromWindowStart, weekStart).from;
  const to = weekContaining(toWindowStart, weekStart).from;
  const step = windowWeeks === 2 ? 2 : 1;
  let cur = from;
  let delta = 0;
  if (to > from) {
    while (cur < to) {
      cur = shiftWeekAnchor(cur, step);
      delta++;
    }
  } else if (to < from) {
    while (cur > to) {
      cur = shiftWeekAnchor(cur, -step);
      delta--;
    }
  }
  return delta;
}

/** Inclusive bounds for all weeks currently shown in week view. */
export function visibleWeekBounds(
  windowStartIso: string,
  weekStart: WeekStart,
  visibleWeeks: WeekWindowWeeks,
): { from: string; to: string } {
  const starts = weeksOnWindow(windowStartIso, weekStart, visibleWeeks);
  const today = toIso(new Date());
  const { from } = weekContaining(starts[0], weekStart);
  const { to } = weekContaining(starts[starts.length - 1], weekStart);
  return { from, to: to > today ? today : to };
}

/** Default week-mode range: current week, or previous + current when window is 2. */
export function defaultWeekRange(
  weekStart: WeekStart = 'sunday',
  windowWeeks: WeekWindowWeeks = 1,
): { from: string; to: string } {
  const today = toIso(new Date());
  const currentStart = weekContaining(today, weekStart).from;
  const from =
    windowWeeks === 1 ? currentStart : shiftWeekAnchor(currentStart, -(windowWeeks - 1));
  const { to: weekEnd } = weekContaining(today, weekStart);
  return { from, to: weekEnd > today ? today : weekEnd };
}

/** @deprecated Use defaultWeekRange(weekStart, 1) */
export function currentWeekRange(weekStart: WeekStart = 'sunday'): { from: string; to: string } {
  return defaultWeekRange(weekStart, 1);
}

/** Carousel window start when expanding backward before the loaded range. */
export function weekWindowStartForFocus(
  windowStartIso: string,
  weekStart: WeekStart,
  windowWeeks: WeekWindowWeeks,
): string {
  const start = weekContaining(windowStartIso, weekStart).from;
  return shiftWeekAnchor(start, windowWeeks === 2 ? -2 : -1);
}

/** Inclusive bounds for the week containing `focusIso`, capped at today. */
export function focusedWeekBounds(
  focusIso: string,
  weekStart: WeekStart = 'sunday',
): { from: string; to: string } {
  const today = toIso(new Date());
  const { from, to } = weekContaining(focusIso, weekStart);
  return { from, to: to > today ? today : to };
}

export type LoadedSegment = { from: string; to: string };

/** Merge a fetched interval into the list of contiguous loaded segments. */
export function mergeLoadedSegment(
  segments: LoadedSegment[],
  from: string,
  to: string,
): LoadedSegment[] {
  if (from > to) return segments;

  const next = [...segments, { from, to }].sort((a, b) => a.from.localeCompare(b.from));
  const merged: LoadedSegment[] = [];

  for (const seg of next) {
    const last = merged[merged.length - 1];
    if (!last || seg.from > addDaysIso(last.to, 1)) {
      merged.push({ ...seg });
      continue;
    }
    if (seg.to > last.to) last.to = seg.to;
  }

  return merged;
}

/** True when every day in [from, to] lies inside one or more contiguous loaded segments. */
export function isRangeCoveredBySegments(
  segments: LoadedSegment[],
  from: string,
  to: string,
): boolean {
  if (from > to) return true;
  if (segments.length === 0) return false;

  let cursor = from;
  while (cursor <= to) {
    const seg = segments.find((s) => s.from <= cursor && s.to >= cursor);
    if (!seg) return false;
    cursor = addDaysIso(seg.to, 1);
  }
  return true;
}

/** @deprecated Prefer isRangeCoveredBySegments; merged cache bounds can span unfetched gaps. */
export function isRangeCoveredByCache(
  cached: { from: string; to: string },
  from: string,
  to: string,
): boolean {
  return cached.from <= from && cached.to >= to;
}

export function weekLabelParts(
  anchorIso: string,
  weekStart: WeekStart = 'sunday',
): { year: string; range: string } {
  const { from, to } = weekContaining(anchorIso, weekStart);
  const a = parseLocal(from);
  const b = parseLocal(to);
  const year =
    a.getFullYear() === b.getFullYear()
      ? String(a.getFullYear())
      : `${a.getFullYear()} – ${b.getFullYear()}`;
  const left = a.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const right = b.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return { year, range: `${left} – ${right}` };
}

export function weekLabel(anchorIso: string, weekStart: WeekStart = 'sunday'): string {
  const { year, range } = weekLabelParts(anchorIso, weekStart);
  return year.includes('–') ? `${range} (${year})` : `${range} ${year}`;
}

/** Keep focus when still in range; otherwise snap to the last week that fits. */
export function clampWeekFocusToRange(
  focusIso: string,
  rangeFrom: string,
  rangeTo: string,
  weekStart: WeekStart = 'sunday',
): string {
  const focusStart = weekContaining(focusIso, weekStart).from;
  const weekStarts = weekStartsInRange(rangeFrom, rangeTo, weekStart);
  if (weekStarts.includes(focusStart)) return focusStart;
  if (weekStarts.length === 0) return weekContaining(rangeFrom, weekStart).from;
  return weekStarts[weekStarts.length - 1];
}

/** Snap window start to a valid carousel page when range or mode changes. */
export function clampWeekWindowStart(
  windowStartIso: string,
  rangeFrom: string,
  rangeTo: string,
  weekStart: WeekStart,
  windowWeeks: WeekWindowWeeks,
): string {
  const start = weekContaining(windowStartIso, weekStart).from;
  if (windowWeeks === 1) return clampWeekFocusToRange(start, rangeFrom, rangeTo, weekStart);

  const pages = twoWeekWindowStartsInRange(rangeFrom, rangeTo, weekStart);
  if (pages.includes(start)) return start;
  if (pages.length === 0) return start;

  for (let i = pages.length - 1; i >= 0; i--) {
    if (pages[i] <= start) return pages[i];
  }
  return pages[0];
}

export function canGoNextWeek(
  focusIso: string,
  rangeTo: string,
  weekStart: WeekStart = 'sunday',
): boolean {
  if (isCurrentWeek(focusIso, weekStart)) return false;
  const focusStart = weekContaining(focusIso, weekStart).from;
  const nextStart = shiftWeekAnchor(focusStart, 1);
  const lastStart = weekContaining(rangeTo, weekStart).from;
  return nextStart <= lastStart;
}

export function canGoNextWeekWindow(
  windowStartIso: string,
  rangeTo: string,
  weekStart: WeekStart,
  windowWeeks: WeekWindowWeeks,
): boolean {
  if (windowWeeks === 1) return canGoNextWeek(windowStartIso, rangeTo, weekStart);
  if (isCurrentWeekWindow(windowStartIso, weekStart, windowWeeks)) return false;
  const nextWindow = shiftWeekAnchor(weekContaining(windowStartIso, weekStart).from, 2);
  const lastStart = weekContaining(rangeTo, weekStart).from;
  return nextWindow <= lastStart;
}

/** Month → week: preserve range when it fits API limits; otherwise clip around the focus week. */
export function clipRangeToMaxDaysCenteredOn(
  from: string,
  to: string,
  focusIso: string,
  maxDays = MAX_RANGE_DAYS,
): { from: string; to: string } {
  if (spanDays(from, to) <= maxDays) return { from, to };

  const today = toIso(new Date());
  const before = Math.floor((maxDays - 1) / 2);
  let newFrom = addDaysIso(focusIso, -before);
  let newTo = addDaysIso(focusIso, maxDays - 1 - before);

  if (newFrom < from) {
    newFrom = from;
    newTo = addDaysIso(from, maxDays - 1);
  }
  if (newTo > to) {
    newTo = to;
    newFrom = addDaysIso(to, -(maxDays - 1));
  }
  if (newTo > today) newTo = today;
  if (newFrom > newTo) newFrom = newTo;

  return { from: newFrom, to: newTo };
}

export function weekFocusForLayoutSwitch(
  rangeFrom: string,
  rangeTo: string,
  weekStart: WeekStart = 'sunday',
): string {
  const today = toIso(new Date());
  if (today >= rangeFrom && today <= rangeTo) {
    return weekContaining(today, weekStart).from;
  }
  return weekContaining(rangeFrom, weekStart).from;
}

/** Month → week: keep the active range when possible; clip only when above API limits. */
export function weekRangeForMonthSwitch(
  from: string,
  to: string,
  focusIso: string,
  maxDays = MAX_RANGE_DAYS,
): { from: string; to: string } {
  return clipRangeToMaxDaysCenteredOn(from, to, focusIso, maxDays);
}

export function readStoredLayout(): CalendarLayout {
  try {
    const raw = localStorage.getItem('ja_settings');
    if (raw) {
      const parsed = JSON.parse(raw) as { layout?: string };
      if (parsed.layout === 'week' || parsed.layout === 'month') return parsed.layout;
    }
    const v = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (v === 'week' || v === 'month') return v;
  } catch {
    // ignore
  }
  return 'month';
}

type DayChipProps = {
  iso: string;
  bucket: DayBucket | undefined;
  selected: boolean;
  /** Outside the loaded data range (e.g. padding cells in month grid). */
  outOfRange?: boolean;
  /** Adjacent-month padding day in month grid (not selectable). */
  outsideMonth?: boolean;
  /** Flat cell inside a hairline calendar grid (no card chrome). */
  variant?: 'card' | 'cell';
  /** Hide weekday line when a shared weekday header is present. */
  hideWeekday?: boolean;
  /** When false, future days render as empty placeholders. */
  showFutureDays?: boolean;
  onSelect: (iso: string) => void;
};

export function DayChip({
  iso,
  bucket,
  selected,
  outOfRange = false,
  outsideMonth = false,
  variant = 'card',
  hideWeekday = false,
  showFutureDays = true,
  onSelect,
}: DayChipProps) {
  const d = parseLocal(iso);
  const weekday = d.getDay();
  const isWeekend = weekday === 0 || weekday === 6;
  const today = toIso(new Date());
  const isFuture = iso > today;

  if (!showFutureDays && isFuture) return null;
  const seconds = bucket?.totalSeconds ?? 0;
  const status =
    isFuture || outOfRange || outsideMonth ? 'skip' : hoursStatus(seconds, isWeekend);
  const hasWorklogs = seconds > 0;
  const weekendDisabled = isWeekend && !hasWorklogs;
  const disabled = outOfRange || weekendDisabled || isFuture || outsideMonth;

  const weekdayLabel = d.toLocaleDateString(undefined, { weekday: 'short' });
  const dayNum = d.getDate();
  const monthLabel = d.toLocaleDateString(undefined, { month: 'short' });
  const isToday = iso === toIso(new Date());

  const classes = [
    'day-chip',
    variant === 'cell' ? 'day-chip-cell' : '',
    isWeekend ? 'weekend' : '',
    disabled ? 'disabled' : '',
    isFuture ? 'future' : '',
    outOfRange ? 'out-of-range' : '',
    outsideMonth ? 'outside-month' : '',
    status === 'ok' ? 'hours-ok' : '',
    status === 'under' ? 'hours-bad' : '',
    status === 'over' ? 'hours-over' : '',
    selected ? 'selected' : '',
    isToday ? 'is-today' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      disabled={disabled}
      aria-disabled={disabled}
      aria-current={isToday ? 'date' : undefined}
      onClick={() => {
        if (disabled) return;
        onSelect(iso);
      }}
    >
      {hideWeekday ? null : (
        <span className="day-chip-weekday">{isToday ? 'Today' : weekdayLabel}</span>
      )}
      {hideWeekday && isToday ? <span className="day-chip-today-tag">Today</span> : null}
      <span className="day-chip-date">
        {dayNum} {monthLabel}
      </span>
      <span className="day-chip-hours">{seconds > 0 ? formatDuration(seconds) : '—'}</span>
    </button>
  );
}
