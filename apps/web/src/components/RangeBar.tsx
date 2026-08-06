import { useMemo, useState } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { format, parseISO } from 'date-fns';
import {
  MAX_RANGE_DAYS,
  canGoNextMonth,
  currentMonthRange,
  isCurrentMonth,
  lastMonthRange,
  shiftMonthRange,
  spanDays,
  toIsoDate,
} from '../api';
import { RangeTrigger } from './RangeTrigger';
import { Button } from './ui/Button';
import { Divider } from './ui/Divider';
import { ChevronLeft, ChevronRight } from './ui/icons';
import 'react-day-picker/style.css';

type Props = {
  from: string;
  to: string;
  loading: boolean;
  onApply: (from: string, to: string) => void;
  onGoToday: () => void;
};

function toRange(from: string, to: string): DateRange {
  return { from: parseISO(from), to: parseISO(to) };
}

const PICKER_MONTHS_SHOWN = 2;

/** True when the picker view already centers on the current month (incl. Jul+Aug at end). */
function isPickerAtCurrentMonth(pickerMonth: Date, monthsShown: number, endMonth: Date): boolean {
  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth();

  const startY = pickerMonth.getFullYear();
  const startM = pickerMonth.getMonth();

  let includesCurrent = false;
  for (let i = 0; i < monthsShown; i++) {
    const d = new Date(startY, startM + i, 1);
    if (d.getFullYear() === curY && d.getMonth() === curM) {
      includesCurrent = true;
      break;
    }
  }
  if (!includesCurrent) return false;
  if (startY === curY && startM === curM) return true;

  const lastVisible = new Date(startY, startM + monthsShown - 1, 1);
  return (
    lastVisible.getFullYear() === endMonth.getFullYear() &&
    lastVisible.getMonth() === endMonth.getMonth()
  );
}

export function RangeBar({ from, to, loading, onApply, onGoToday }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>(() => toRange(from, to));
  const [pickerMonth, setPickerMonth] = useState(() => parseISO(from));

  const today = useMemo(() => parseISO(toIsoDate(new Date())), []);
  const disableFutureDays = useMemo(() => ({ after: today }), [today]);

  const label = useMemo(() => {
    if (from === to) return format(parseISO(from), 'd MMM yyyy');
    return `${format(parseISO(from), 'd MMM yyyy')} – ${format(parseISO(to), 'd MMM yyyy')}`;
  }, [from, to]);

  const monthLabel = useMemo(() => format(parseISO(from), 'MMM yyyy'), [from]);

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

  const applyPreset = (preset: 'this-month' | 'last-month') => {
    const range = preset === 'this-month' ? currentMonthRange() : lastMonthRange();
    if (preset === 'this-month') {
      const today = new Date();
      setPickerMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    } else {
      setPickerMonth(parseISO(range.from));
    }
    onApply(range.from, range.to);
    setOpen(false);
  };

  const onCurrentMonth = isCurrentMonth(from);
  const pickerOnCurrentMonth = isPickerAtCurrentMonth(pickerMonth, PICKER_MONTHS_SHOWN, today);

  const goPickerToday = () => {
    const today = new Date();
    setPickerMonth(new Date(today.getFullYear(), today.getMonth(), 1));
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
      <div className="range-picker-wrap">
        <span className="range-field-label" id="range-field-label">
          Range
        </span>
        <RangeTrigger
          label={label}
          open={open}
          labelledBy="range-field-label"
          compact
          onClick={() => {
            setDraft(toRange(from, to));
            setPickerMonth(parseISO(from));
            setOpen((v) => !v);
          }}
        />

        {open ? (
          <div className="range-popover" role="dialog" aria-label="Choose date range">
            <div className="range-presets">
              <Button
                variant="secondary"
                size="sm"
                disabled={loading || pickerOnCurrentMonth}
                onClick={goPickerToday}
              >
                Today
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={loading}
                onClick={() => applyPreset('this-month')}
              >
                This month
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={loading}
                onClick={() => applyPreset('last-month')}
              >
                Last month
              </Button>
            </div>
            <DayPicker
              mode="range"
              animate
              selected={draft}
              onSelect={setDraft}
              month={pickerMonth}
              onMonthChange={setPickerMonth}
              numberOfMonths={PICKER_MONTHS_SHOWN}
              max={MAX_RANGE_DAYS}
              min={1}
              disabled={disableFutureDays}
              endMonth={today}
              weekStartsOn={0}
              resetOnSelect
              excludeDisabled
              className="range-daypicker"
            />
            <Divider orientation="horizontal" />
            <div className="range-popover-footer">
              <span className="hint">
                {canApply
                  ? `${draftDays} day${draftDays === 1 ? '' : 's'} selected (max ${MAX_RANGE_DAYS})`
                  : `Pick a start and end day (max ${MAX_RANGE_DAYS} days). Same day = single day.`}
              </span>
              <div className="range-popover-actions">
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" disabled={!canApply || loading} onClick={apply}>
                  {loading ? 'Loading…' : 'Apply'}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <Divider orientation="vertical" />

      <div className="month-nav">
        <Button
          variant="icon"
          size="md"
          onClick={goPrevMonth}
          disabled={loading}
          aria-label="Previous month"
        >
          <ChevronLeft />
        </Button>
        <span className="month-nav-label">{monthLabel}</span>
        <Button
          variant="icon"
          size="md"
          onClick={goNextMonth}
          disabled={loading || !canGoNextMonth(from)}
          aria-label="Next month"
        >
          <ChevronRight />
        </Button>
      </div>

      <Divider orientation="vertical" />

      <Button
        variant="secondary"
        disabled={loading || onCurrentMonth}
        aria-label="Go to today"
        onClick={onGoToday}
      >
        Today
      </Button>

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
