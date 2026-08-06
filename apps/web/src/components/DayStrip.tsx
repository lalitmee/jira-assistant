import type { DayBucket } from '../api';
import { formatDuration } from '../api';

type Props = {
  from: string;
  to: string;
  days: Record<string, DayBucket>;
  selected: string | null;
  loading?: boolean;
  onSelect: (iso: string) => void;
};

function parseLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function eachDateInclusive(from: string, to: string): string[] {
  const out: string[] = [];
  const cur = parseLocal(from);
  const end = parseLocal(to);
  while (cur.getTime() <= end.getTime()) {
    out.push(toIso(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/** Weekday hours status: green in [6h, 8h], red outside. Weekends are ignored. */
export function hoursStatus(seconds: number, isWeekend: boolean): 'ok' | 'bad' | 'skip' {
  if (isWeekend) return 'skip';
  const hours = seconds / 3600;
  if (hours >= 6 && hours <= 8) return 'ok';
  return 'bad';
}

export function DayStrip({ from, to, days, selected, loading, onSelect }: Props) {
  const dates = eachDateInclusive(from, to);

  return (
    <div className={`day-strip-wrap${loading ? ' is-loading' : ''}`}>
      {loading ? (
        <div className="strip-loading" role="status" aria-live="polite">
          <div className="spinner" />
          <span>Fetching worklogs from Jira…</span>
        </div>
      ) : null}
      <div className="day-strip" role="list" aria-label="Days in selected range">
        {dates.map((iso) => {
          const d = parseLocal(iso);
          const weekday = d.getDay();
          const isWeekend = weekday === 0 || weekday === 6;
          const seconds = days[iso]?.totalSeconds ?? 0;
          const status = hoursStatus(seconds, isWeekend);
          const weekdayLabel = d.toLocaleDateString(undefined, { weekday: 'short' });
          const dayNum = d.getDate();
          const monthLabel = d.toLocaleDateString(undefined, { month: 'short' });

          const hasWorklogs = seconds > 0;
          const weekendDisabled = isWeekend && !hasWorklogs;

          const classes = [
            'day-chip',
            isWeekend ? 'weekend' : '',
            weekendDisabled ? 'disabled' : '',
            status === 'ok' ? 'hours-ok' : '',
            status === 'bad' ? 'hours-bad' : '',
            selected === iso ? 'selected' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              type="button"
              key={iso}
              role="listitem"
              className={classes}
              disabled={weekendDisabled}
              aria-disabled={weekendDisabled}
              onClick={() => {
                if (weekendDisabled) return;
                onSelect(iso);
              }}
            >
              <span className="day-chip-weekday">{weekdayLabel}</span>
              <span className="day-chip-date">
                {dayNum} {monthLabel}
              </span>
              <span className="day-chip-hours">
                {seconds > 0 ? formatDuration(seconds) : '—'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
