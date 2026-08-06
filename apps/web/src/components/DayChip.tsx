import type { DayBucket } from '../api';
import { formatDuration } from '../api';

export type CalendarLayout = 'week' | 'month';

export const LAYOUT_STORAGE_KEY = 'ja_calendar_layout';

export function hoursStatus(
  seconds: number,
  isWeekend: boolean,
): 'ok' | 'under' | 'over' | 'skip' {
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

/** Sun–Sat week that contains `iso`. */
export function weekContaining(iso: string): { from: string; to: string; dates: string[] } {
  const d = parseLocal(iso);
  const start = new Date(d);
  start.setDate(start.getDate() - sundayIndex(start));
  const dates: string[] = [];
  const cur = new Date(start);
  for (let i = 0; i < 7; i++) {
    dates.push(toIso(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return { from: dates[0], to: dates[6], dates };
}

export const WEEK_WINDOW_WEEKS = 12;

export function shiftWeekAnchor(anchorIso: string, deltaWeeks: number): string {
  const d = parseLocal(anchorIso);
  d.setDate(d.getDate() + deltaWeeks * 7);
  return toIso(d);
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
export function weekWindowForFocus(focusIso: string): {
  from: string;
  to: string;
  weekStarts: string[];
} {
  const today = toIso(new Date());
  const focusStart = weekContaining(focusIso).from;
  const currentStart = weekContaining(today).from;
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
  const lastSat = weekContaining(lastStart).to;
  const to = lastSat > today ? today : lastSat;
  return { from, to, weekStarts };
}

export function isCurrentWeek(focusSundayIso: string): boolean {
  const today = toIso(new Date());
  return weekContaining(today).from === focusSundayIso;
}

export function weekLabel(anchorIso: string): string {
  const { from, to } = weekContaining(anchorIso);
  const a = parseLocal(from);
  const b = parseLocal(to);
  const sameYear = a.getFullYear() === b.getFullYear();
  const left = a.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  const right = b.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${left} – ${right}`;
}

export function readStoredLayout(): CalendarLayout {
  try {
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
  /** Flat cell inside a hairline calendar grid (no card chrome). */
  variant?: 'card' | 'cell';
  /** Hide weekday line when a shared weekday header is present. */
  hideWeekday?: boolean;
  onSelect: (iso: string) => void;
};

export function DayChip({
  iso,
  bucket,
  selected,
  outOfRange = false,
  variant = 'card',
  hideWeekday = false,
  onSelect,
}: DayChipProps) {
  const d = parseLocal(iso);
  const weekday = d.getDay();
  const isWeekend = weekday === 0 || weekday === 6;
  const today = toIso(new Date());
  const isFuture = iso > today;
  const seconds = bucket?.totalSeconds ?? 0;
  const status = isFuture || outOfRange ? 'skip' : hoursStatus(seconds, isWeekend);
  const hasWorklogs = seconds > 0;
  const weekendDisabled = isWeekend && !hasWorklogs;
  const disabled = outOfRange || weekendDisabled || isFuture;

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
        <span className="day-chip-weekday">
          {isToday ? 'Today' : weekdayLabel}
        </span>
      )}
      {hideWeekday && isToday ? <span className="day-chip-today-tag">Today</span> : null}
      <span className="day-chip-date">
        {dayNum} {monthLabel}
      </span>
      <span className="day-chip-hours">{seconds > 0 ? formatDuration(seconds) : '—'}</span>
    </button>
  );
}
