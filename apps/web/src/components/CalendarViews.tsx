import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type TransitionEvent,
} from 'react';
import type { DayBucket } from '../api';
import {
  DayChip,
  parseLocal,
  shiftWeekAnchor,
  toIso,
  weekContaining,
  weekStartOffset,
  weekStartsInRange,
  weekdayLabels,
} from './DayChip';

import type { WeekStart } from '../settings';

/** Fraction of page width required to commit a swipe to the neighbor week. */
const WEEK_SWIPE_THRESHOLD = 0.4;
/** Horizontal velocity (px/ms) that commits a fling even below the distance threshold. */
const WEEK_FLING_VELOCITY_PX_MS = 0.5;
/** Ignore tiny moves so day-chip clicks still register. */
const WEEK_DRAG_DEADZONE_PX = 8;
/** Page slide duration when committing via buttons or swipe release. */
const WEEK_PAGE_TRANSITION_MS = 320;

function focusIndex(weekStarts: string[], focusSunday: string): number {
  const idx = weekStarts.indexOf(focusSunday);
  if (idx >= 0) return idx;
  return Math.max(0, weekStarts.length - 1);
}

function clampIndex(idx: number, length: number): number {
  return Math.min(Math.max(idx, 0), Math.max(0, length - 1));
}

function WeekdayHeaderRow({ weekStart }: { weekStart: WeekStart }) {
  const weekdays = weekdayLabels(weekStart);
  return (
    <div className="card-row month-weekday-row" role="row">
      {weekdays.map((d) => (
        <div key={d} className="month-weekday" role="columnheader">
          {d}
        </div>
      ))}
    </div>
  );
}

type WeekProps = {
  focusSunday: string;
  rangeFrom: string;
  rangeTo: string;
  days: Record<string, DayBucket>;
  selected: string | null;
  loading?: boolean;
  weekStart: WeekStart;
  showFutureDays: boolean;
  weekSwipeEnabled: boolean;
  onSelect: (iso: string) => void;
  onFocusWeek: (sundayIso: string) => void;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startT: number;
  offset: number;
  dragging: boolean;
  suppressClick: boolean;
};

export function WeekView({
  focusSunday,
  rangeFrom,
  rangeTo,
  days,
  selected,
  loading,
  weekStart,
  showFutureDays,
  weekSwipeEnabled,
  onSelect,
  onFocusWeek,
}: WeekProps) {
  const weekStarts = useMemo(
    () => weekStartsInRange(rangeFrom, rangeTo, weekStart),
    [rangeFrom, rangeTo, weekStart],
  );
  const viewportRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);
  const internalNavRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState(() => focusIndex(weekStarts, focusSunday));
  const [pageWidth, setPageWidth] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [prevFocusSunday, setPrevFocusSunday] = useState(focusSunday);
  const [prevWeekStartsKey, setPrevWeekStartsKey] = useState(() => weekStarts.join('|'));

  const weekStartsKey = weekStarts.join('|');
  if (focusSunday !== prevFocusSunday || weekStartsKey !== prevWeekStartsKey) {
    const idx = focusIndex(weekStarts, focusSunday);
    const prevIdx = indexRef.current;

    if (internalNavRef.current) {
      setPrevFocusSunday(focusSunday);
      setPrevWeekStartsKey(weekStartsKey);
    } else {
      const focusChanged = focusSunday !== prevFocusSunday;
      const rangeChanged = weekStartsKey !== prevWeekStartsKey;
      const adjacent = focusChanged && !rangeChanged && Math.abs(idx - prevIdx) === 1;

      setPrevFocusSunday(focusSunday);
      setPrevWeekStartsKey(weekStartsKey);

      if (idx !== prevIdx) {
        setIndex(idx);
        setDragOffset(0);
        if (adjacent) setAnimating(true);
      } else if (rangeChanged) {
        setDragOffset(0);
      }
    }
  }

  useLayoutEffect(() => {
    indexRef.current = index;
  }, [index]);

  const maxIndex = Math.max(0, weekStarts.length - 1);
  const canPrev = true;
  const canNext = index < maxIndex;

  const focusEarlierWeek = useCallback(() => {
    const first = weekStarts[0];
    if (!first) return;
    onFocusWeek(shiftWeekAnchor(first, -1));
  }, [onFocusWeek, weekStarts]);

  const commitWeek = useCallback(
    (nextIndex: number) => {
      const clamped = clampIndex(nextIndex, weekStarts.length);
      const sun = weekStarts[clamped];
      if (!sun) return;
      internalNavRef.current = true;
      setIndex(clamped);
      setDragOffset(0);
      setAnimating(true);
      if (sun !== focusSunday) onFocusWeek(sun);
    },
    [focusSunday, onFocusWeek, weekStarts],
  );

  const bounceHome = useCallback(() => {
    setDragOffset(0);
    setAnimating(true);
  }, []);

  const goToWeek = useCallback(
    (nextIndex: number) => {
      if (dragRef.current?.dragging) return;
      if (nextIndex < 0) {
        focusEarlierWeek();
        return;
      }
      if (nextIndex > maxIndex) return;
      commitWeek(nextIndex);
    },
    [commitWeek, focusEarlierWeek, maxIndex],
  );

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    let placed = false;

    const place = (): boolean => {
      const w = el.clientWidth;
      if (w === 0) return false;
      setPageWidth(w);
      if (!placed) {
        const idx = focusIndex(weekStarts, focusSunday);
        setIndex(idx);
        setDragOffset(0);
        setAnimating(false);
        setReady(true);
        placed = true;
      }
      return true;
    };

    place();

    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w === 0) return;
      if (!placed) {
        place();
        return;
      }
      setPageWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [weekStarts, rangeFrom, rangeTo, loading]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!weekSwipeEnabled || e.button !== 0 || loading) return;
    // Let day chips / controls receive a normal click — don't capture yet.
    const target = e.target as Element | null;
    if (target?.closest('button, a, input, textarea, select, [role="button"]')) return;

    const el = viewportRef.current;
    if (!el) return;
    suppressClickRef.current = false;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startT: e.timeStamp,
      offset: 0,
      dragging: false,
      suppressClick: false,
    };
    setAnimating(false);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const el = viewportRef.current;
    if (!el) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (!drag.dragging) {
      if (Math.abs(dx) < WEEK_DRAG_DEADZONE_PX) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        dragRef.current = null;
        return;
      }
      drag.dragging = true;
      drag.suppressClick = true;
      suppressClickRef.current = true;
      el.setPointerCapture(e.pointerId);
    }

    let offset = dx;
    const atStart = indexRef.current <= 0 && offset > 0;
    const atEnd = indexRef.current >= maxIndex && offset < 0;
    if (atStart || atEnd) offset *= 0.35;

    drag.offset = offset;
    setDragOffset(offset);
  };

  const finishPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const el = viewportRef.current;
    if (el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    dragRef.current = null;

    if (!drag.dragging) {
      setDragOffset(0);
      return;
    }

    const width = el?.clientWidth || pageWidth;
    const offset = drag.offset;
    const elapsed = Math.max(1, e.timeStamp - drag.startT);
    const velocity = offset / elapsed;
    const threshold = width * WEEK_SWIPE_THRESHOLD;

    let delta = 0;
    if (width > 0 && (offset <= -threshold || velocity <= -WEEK_FLING_VELOCITY_PX_MS)) {
      delta = 1;
    } else if (width > 0 && (offset >= threshold || velocity >= WEEK_FLING_VELOCITY_PX_MS)) {
      delta = -1;
    }

    if (delta !== 0) {
      const next = indexRef.current + delta;
      if (next < 0) {
        setDragOffset(0);
        setAnimating(true);
        focusEarlierWeek();
        return;
      }
      const clamped = clampIndex(next, weekStarts.length);
      if (clamped !== indexRef.current) {
        commitWeek(clamped);
        return;
      }
    }
    bounceHome();
  };

  const onClickCapture = (e: ReactMouseEvent) => {
    if (!suppressClickRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    suppressClickRef.current = false;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft' && canPrev) {
      e.preventDefault();
      goToWeek(index - 1);
    } else if (e.key === 'ArrowRight' && canNext) {
      e.preventDefault();
      goToWeek(index + 1);
    }
  };

  const trackStyle: CSSProperties = {
    transform: `translate3d(${-index * pageWidth + dragOffset}px, 0, 0)`,
    width: pageWidth > 0 ? pageWidth * weekStarts.length : undefined,
    ['--week-page-transition-ms' as string]: `${WEEK_PAGE_TRANSITION_MS}ms`,
  };

  const onTrackTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== 'transform') return;
    internalNavRef.current = false;
    setAnimating(false);
  };

  return (
    <div
      className={`week-view-wrap${loading ? ' is-loading' : ''}${ready ? '' : ' is-placing'}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label="Week view"
    >
      {loading ? (
        <div className="strip-loading" role="status" aria-live="polite">
          <div className="spinner" />
          <span>Fetching worklogs from Jira…</span>
        </div>
      ) : null}

      <div className="week-carousel-column">
        <WeekdayHeaderRow weekStart={weekStart} />
        <div
          ref={viewportRef}
          className="week-carousel"
          role="list"
          aria-label="Week pages"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finishPointer}
          onPointerCancel={finishPointer}
          onClickCapture={onClickCapture}
        >
          <div
            className={`week-track${animating ? ' is-animating' : ''}`}
            style={trackStyle}
            onTransitionEnd={onTrackTransitionEnd}
          >
            {weekStarts.map((sun) => {
              const { dates } = weekContaining(sun, weekStart);
              return (
                <div
                  key={sun}
                  className="week-page"
                  role="listitem"
                  style={pageWidth > 0 ? { width: pageWidth } : undefined}
                >
                  <div className="card-row">
                    {dates.map((iso) => {
                      const outOfRange = iso < rangeFrom || iso > rangeTo;
                      return (
                        <div key={iso} className="card-cell">
                          <DayChip
                            iso={iso}
                            bucket={days[iso]}
                            selected={selected === iso}
                            outOfRange={outOfRange}
                            hideWeekday
                            showFutureDays={showFutureDays}
                            onSelect={onSelect}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

type MonthProps = {
  /** Any ISO date in the month to display (typically range `from`). */
  monthIso: string;
  rangeFrom: string;
  rangeTo: string;
  days: Record<string, DayBucket>;
  selected: string | null;
  loading?: boolean;
  weekStart: WeekStart;
  showFutureDays: boolean;
  onSelect: (iso: string) => void;
};

export function MonthView({
  monthIso,
  rangeFrom,
  rangeTo,
  days,
  selected,
  loading,
  weekStart,
  showFutureDays,
  onSelect,
}: MonthProps) {
  const anchor = parseLocal(monthIso);
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);

  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - weekStartOffset(gridStart, weekStart));
  const gridEnd = new Date(monthEnd);
  gridEnd.setDate(gridEnd.getDate() + (6 - weekStartOffset(gridEnd, weekStart)));

  const cells: Array<{ iso: string; inMonth: boolean }> = [];
  const cur = new Date(gridStart);
  while (cur.getTime() <= gridEnd.getTime()) {
    const iso = toIso(cur);
    cells.push({
      iso,
      inMonth: iso >= toIso(monthStart) && iso <= toIso(monthEnd),
    });
    cur.setDate(cur.getDate() + 1);
  }

  const rows: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <div className={`month-view-wrap${loading ? ' is-loading' : ''}`}>
      {loading ? (
        <div className="strip-loading" role="status" aria-live="polite">
          <div className="spinner" />
          <span>Fetching worklogs from Jira…</span>
        </div>
      ) : null}

      <div className="month-view" role="grid" aria-label="Month calendar">
        <WeekdayHeaderRow weekStart={weekStart} />
        {rows.map((row) => (
          <div className="card-row" key={row[0].iso} role="row">
            {row.map((cell) => {
              const outsideMonth = !cell.inMonth;
              const outOfRange =
                !outsideMonth && (cell.iso < rangeFrom || cell.iso > rangeTo);
              return (
                <div key={cell.iso} className="card-cell" role="gridcell">
                  <DayChip
                    iso={cell.iso}
                    bucket={days[cell.iso]}
                    selected={selected === cell.iso}
                    outOfRange={outOfRange}
                    outsideMonth={outsideMonth}
                    hideWeekday
                    showFutureDays={showFutureDays}
                    onSelect={onSelect}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
