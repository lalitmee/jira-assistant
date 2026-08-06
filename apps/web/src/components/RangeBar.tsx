import { useMemo, useState } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { format, parseISO } from 'date-fns';
import {
  MAX_RANGE_DAYS,
  canGoNextMonth,
  shiftMonthRange,
  spanDays,
  toIsoDate,
} from '../api';
import 'react-day-picker/style.css';

type Props = {
  from: string;
  to: string;
  totalSeconds: number | null;
  loading: boolean;
  onApply: (from: string, to: string) => void;
  formatDuration: (s: number) => string;
};

function toRange(from: string, to: string): DateRange {
  return { from: parseISO(from), to: parseISO(to) };
}

export function RangeBar({
  from,
  to,
  totalSeconds,
  loading,
  onApply,
  formatDuration,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>(() => toRange(from, to));

  const label = useMemo(() => {
    if (from === to) return format(parseISO(from), 'd MMM yyyy');
    return `${format(parseISO(from), 'd MMM yyyy')} – ${format(parseISO(to), 'd MMM yyyy')}`;
  }, [from, to]);

  const monthLabel = useMemo(() => format(parseISO(from), 'MMMM yyyy'), [from]);

  const draftFrom = draft?.from ? toIsoDate(draft.from) : '';
  const draftTo = draft?.to ? toIsoDate(draft.to) : draftFrom;
  const draftDays = draftFrom && draftTo ? spanDays(draftFrom, draftTo) : 0;
  const canApply =
    Boolean(draftFrom) &&
    Boolean(draftTo) &&
    draftDays >= 1 &&
    draftDays <= MAX_RANGE_DAYS &&
    draftFrom <= draftTo;

  const apply = () => {
    if (!canApply || !draftFrom || !draftTo) return;
    onApply(draftFrom, draftTo);
    setOpen(false);
  };

  const goPrevMonth = () => {
    const next = shiftMonthRange(from, -1);
    onApply(next.from, next.to);
  };

  const goNextMonth = () => {
    if (!canGoNextMonth(from)) return;
    const next = shiftMonthRange(from, 1);
    onApply(next.from, next.to);
  };

  return (
    <div className="range-bar range-bar-header">
      <div className="month-nav">
        <button
          type="button"
          className="btn btn-ghost month-nav-btn"
          onClick={goPrevMonth}
          disabled={loading}
          aria-label="Previous month"
        >
          ←
        </button>
        <span className="month-nav-label">{monthLabel}</span>
        <button
          type="button"
          className="btn btn-ghost month-nav-btn"
          onClick={goNextMonth}
          disabled={loading || !canGoNextMonth(from)}
          aria-label="Next month"
        >
          →
        </button>
      </div>

      <div className="range-picker-wrap">
        <button
          type="button"
          className="range-trigger"
          onClick={() => {
            setDraft(toRange(from, to));
            setOpen((v) => !v);
          }}
          aria-expanded={open}
        >
          <span className="range-trigger-label">Range</span>
          <span className="range-trigger-value">{label}</span>
        </button>

        {open ? (
          <div className="range-popover" role="dialog" aria-label="Choose date range">
            <DayPicker
              mode="range"
              selected={draft}
              onSelect={setDraft}
              numberOfMonths={2}
              max={MAX_RANGE_DAYS}
              min={1}
              defaultMonth={draft?.from ?? parseISO(from)}
              weekStartsOn={1}
              resetOnSelect
              className="range-daypicker"
            />
            <div className="range-popover-footer">
              <span className="hint">
                {canApply
                  ? `${draftDays} day${draftDays === 1 ? '' : 's'} selected (max ${MAX_RANGE_DAYS})`
                  : `Pick a start and end day (max ${MAX_RANGE_DAYS} days). Same day = single day.`}
              </span>
              <div className="range-popover-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!canApply || loading}
                  onClick={apply}
                >
                  {loading ? 'Loading…' : 'Apply'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {totalSeconds != null ? (
        <div className="summary">
          {loading ? 'Loading…' : (
            <>
              Total <strong>{formatDuration(totalSeconds)}</strong>
            </>
          )}
        </div>
      ) : loading ? (
        <div className="summary">Loading…</div>
      ) : null}

      {open ? (
        <button
          type="button"
          className="range-backdrop"
          aria-label="Close"
          onClick={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}
