import type { WeekStart, WeekWindowWeeks } from '../settings';

export type CalendarLayout = 'week' | 'month';

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

/** Carousel window start when expanding backward before the loaded range. */
export function weekWindowStartForFocus(
  windowStartIso: string,
  weekStart: WeekStart,
  windowWeeks: WeekWindowWeeks,
): string {
  const start = weekContaining(windowStartIso, weekStart).from;
  return shiftWeekAnchor(start, windowWeeks === 2 ? -2 : -1);
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
