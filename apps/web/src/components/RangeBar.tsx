import { useMemo, useState } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { parseISO } from 'date-fns';
import {
  MAX_RANGE_DAYS,
  canGoNextMonth,
  currentMonthRange,
  isCurrentMonth,
  lastMonthRange,
  rangeLabelParts,
  shiftMonthRange,
  spanDays,
  toIsoDate,
} from '../api';
import { canGoNextWeek, canGoNextWeekWindow, isCurrentWeek, isCurrentWeekWindow } from './DayChip';
import type { WeekStart, WeekWindowWeeks } from '../settings';
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
  navMode?: 'month' | 'week';
  weekFocus?: string;
  weekStart?: WeekStart;
  weekWindowWeeks?: WeekWindowWeeks;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  /** Disables prev/next only; falls back to `loading` when omitted. */
  navLoading?: boolean;
  /** Disables Today while a fly-to-today slide is running. */
  todayAnimating?: boolean;
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

export function RangeBar(props: Props) {
  const { from, to, loading, onApply, onGoToday } = props;
  const navMode = props.navMode ?? 'month';
  const navBusy = props.navLoading ?? loading;

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>(() => toRange(from, to));
  const [pickerMonth, setPickerMonth] = useState(() => parseISO(from));

  const today = useMemo(() => parseISO(toIsoDate(new Date())), []);
  const disableFutureDays = useMemo(() => ({ after: today }), [today]);

  const rangeParts = useMemo(() => rangeLabelParts(from, to), [from, to]);

  const label = useMemo(() => {
    const { year, range } = rangeParts;
    return year.includes('–') ? `${range} (${year})` : `${range} ${year}`;
  }, [rangeParts]);

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
  const onCurrentWeek =
    navMode === 'week' && props.weekFocus && props.weekStart
      ? props.weekWindowWeeks === 2
        ? isCurrentWeekWindow(props.weekFocus, props.weekStart, 2)
        : isCurrentWeek(props.weekFocus, props.weekStart)
      : false;
  const pickerOnCurrentMonth = isPickerAtCurrentMonth(pickerMonth, PICKER_MONTHS_SHOWN, today);

  const goPickerToday = () => {
    const today = new Date();
    setPickerMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const goPrev = () => {
    if (navMode === 'week') {
      props.onPrevWeek?.();
      return;
    }
    if (props.onPrevMonth) {
      props.onPrevMonth();
      return;
    }
    const next = shiftMonthRange(from, -1);
    onApply(next.from, next.to);
  };

  const goNext = () => {
    if (navMode === 'week') {
      props.onNextWeek?.();
      return;
    }
    if (props.onNextMonth) {
      props.onNextMonth();
      return;
    }
    if (!canGoNextMonth(from)) return;
    const next = shiftMonthRange(from, 1);
    onApply(next.from, next.to);
  };

  const canGoNext =
    navMode === 'week' && props.weekFocus && props.weekStart
      ? props.weekWindowWeeks === 2
        ? canGoNextWeekWindow(props.weekFocus, to, props.weekStart, 2)
        : canGoNextWeek(props.weekFocus, to, props.weekStart)
      : canGoNextMonth(from);

  const prevLabel = navMode === 'week' ? 'Previous week' : 'Previous month';
  const nextLabel = navMode === 'week' ? 'Next week' : 'Next month';
  const todayDisabled =
    loading || props.todayAnimating || (navMode === 'week' ? onCurrentWeek : onCurrentMonth);

  return (
    <div className="range-bar range-bar-header">
      <div className="range-picker-wrap">
        <div className="range-nav">
          <Button
            variant="icon"
            size="sm"
            onClick={goPrev}
            disabled={navBusy}
            aria-label={prevLabel}
          >
            <ChevronLeft />
          </Button>
          <div className="range-trigger-wrap">
            <RangeTrigger
              label={label}
              parts={rangeParts}
              open={open}
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
          <Button
            variant="icon"
            size="sm"
            onClick={goNext}
            disabled={navBusy || !canGoNext}
            aria-label={nextLabel}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      <Divider orientation="vertical" />

      <Button
        variant="secondary"
        disabled={todayDisabled}
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
