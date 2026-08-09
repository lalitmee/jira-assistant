import type { DayBucket } from '../api';
import { formatDuration } from '../api';
import { parseLocal, toIso } from '../lib/calendarDates';

export type { CalendarLayout } from '../lib/calendarDates';
export {
  WEEK_PREFETCH_EDGE_WEEKS,
  WEEK_PREFETCH_WEEKS,
  addDaysIso,
  canGoNextWeek,
  canGoNextWeekWindow,
  clampWeekFocusToRange,
  clampWeekWindowStart,
  defaultWeekRange,
  defaultWeekWindowStart,
  earlierWeekPrefetchChunk,
  isCurrentWeek,
  isCurrentWeekWindow,
  isRangeCoveredBySegments,
  mergeLoadedSegment,
  parseLocal,
  shiftWeekAnchor,
  shiftWeekWindow,
  shouldPrefetchEarlierWeeks,
  toIso,
  twoWeekWindowStartsInRange,
  visibleWeekBounds,
  weekCarouselPageDelta,
  weekContaining,
  weekFocusIndexInRange,
  weekStartsInRange,
  weekStartOffset,
  weekWindowStartForFocus,
  weekdayLabels,
  weeksOnWindow,
  type LoadedSegment,
} from '../lib/calendarDates';

export function hoursStatus(seconds: number, isWeekend: boolean): 'ok' | 'under' | 'over' | 'skip' {
  if (isWeekend) return 'skip';
  const hours = seconds / 3600;
  if (hours >= 6 && hours <= 8) return 'ok';
  if (hours > 8) return 'over';
  return 'under';
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
