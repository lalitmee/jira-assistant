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
  loading: boolean;
  onApply: (from: string, to: string) => void;
};

function toRange(from: string, to: string): DateRange {
  return { from: parseISO(from), to: parseISO(to) };
}

export function RangeBar({
  from,
  to,
  loading,
  onApply,
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
          <svg className="month-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M15.4 4.6a1.2 1.2 0 0 1 0 1.7L10.7 11l4.7 4.7a1.2 1.2 0 1 1-1.7 1.7l-5.5-5.5a1.2 1.2 0 0 1 0-1.7l5.5-5.5a1.2 1.2 0 0 1 1.7 0z"
              fill="currentColor"
            />
          </svg>
        </button>
        <span className="month-nav-label">{monthLabel}</span>
        <button
          type="button"
          className="btn btn-ghost month-nav-btn"
          onClick={goNextMonth}
          disabled={loading || !canGoNextMonth(from)}
          aria-label="Next month"
        >
          <svg className="month-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M8.6 4.6a1.2 1.2 0 0 1 1.7 0l5.5 5.5a1.2 1.2 0 0 1 0 1.7l-5.5 5.5a1.2 1.2 0 1 1-1.7-1.7l4.7-4.7-4.7-4.7a1.2 1.2 0 0 1 0-1.7z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>

      <div className="range-picker-wrap">
        <span className="range-field-label" id="range-field-label">
          Range
        </span>
        <button
          type="button"
          className="range-trigger"
          onClick={() => {
            setDraft(toRange(from, to));
            setOpen((v) => !v);
          }}
          aria-expanded={open}
          aria-labelledby="range-field-label"
        >
          <span className="range-trigger-value">{label}</span>
          <svg className="range-trigger-chevron" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M7.4 9.4a1.2 1.2 0 0 1 1.7 0L12 12.3l2.9-2.9a1.2 1.2 0 1 1 1.7 1.7l-3.75 3.75a1.2 1.2 0 0 1-1.7 0L7.4 11.1a1.2 1.2 0 0 1 0-1.7z"
            />
          </svg>
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
              weekStartsOn={0}
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
