import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { DayBucket } from '../api';
import {
  DayChip,
  sundayIndex,
  parseLocal,
  shiftWeekAnchor,
  toIso,
  weekContaining,
  weekLabel,
} from './DayChip';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function weekStartsInRange(from: string, to: string): string[] {
  const start = weekContaining(from).from;
  const end = weekContaining(to).from;
  const out: string[] = [];
  let sun = start;
  while (sun <= end) {
    out.push(sun);
    sun = shiftWeekAnchor(sun, 1);
  }
  return out.length > 0 ? out : [start];
}

function focusIndex(weekStarts: string[], focusSunday: string): number {
  const idx = weekStarts.indexOf(focusSunday);
  if (idx >= 0) return idx;
  return Math.max(0, weekStarts.length - 1);
}

type WeekProps = {
  focusSunday: string;
  rangeFrom: string;
  rangeTo: string;
  days: Record<string, DayBucket>;
  selected: string | null;
  loading?: boolean;
  onSelect: (iso: string) => void;
  onFocusWeek: (sundayIso: string) => void;
};

export function WeekView({
  focusSunday,
  rangeFrom,
  rangeTo,
  days,
  selected,
  loading,
  onSelect,
  onFocusWeek,
}: WeekProps) {
  const weekStarts = useMemo(
    () => weekStartsInRange(rangeFrom, rangeTo),
    [rangeFrom, rangeTo],
  );
  const scrollerRef = useRef<HTMLDivElement>(null);
  const skipScrollNotify = useRef(false);
  const focusSundayRef = useRef(focusSunday);
  focusSundayRef.current = focusSunday;
  const [ready, setReady] = useState(false);
  const [labelSunday, setLabelSunday] = useState(focusSunday);

  useEffect(() => {
    setLabelSunday(
      weekStarts.includes(focusSunday)
        ? focusSunday
        : weekStarts[weekStarts.length - 1] ?? focusSunday,
    );
  }, [focusSunday, weekStarts]);

  // Place only when the loaded week window changes — not on every focus update from scrolling
  // (re-placing on focusSunday caused a white flash mid-snap).
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const place = (): boolean => {
      if (el.clientWidth === 0) return false;
      const idx = focusIndex(weekStarts, focusSundayRef.current);
      const target = idx * el.clientWidth;
      skipScrollNotify.current = true;
      el.scrollLeft = target;
      setLabelSunday(weekStarts[idx] ?? focusSundayRef.current);
      setReady(true);
      requestAnimationFrame(() => {
        skipScrollNotify.current = false;
      });
      return true;
    };

    if (place()) return undefined;

    const ro = new ResizeObserver(() => {
      if (place()) ro.disconnect();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [weekStarts, rangeFrom, rangeTo, loading]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    let settleTimer = 0;

    const pageWidth = () => el.clientWidth;

    const nearestIndex = () => {
      const w = pageWidth();
      if (w === 0) return 0;
      const maxIdx = Math.max(0, weekStarts.length - 1);
      return Math.min(Math.max(Math.round(el.scrollLeft / w), 0), maxIdx);
    };

    /** Force exact page alignment — CSS snap alone often stalls mid-page on trackpads. */
    const snapToNearest = () => {
      if (skipScrollNotify.current) return;
      const w = pageWidth();
      if (w === 0) return;
      const idx = nearestIndex();
      const target = idx * w;
      if (Math.abs(el.scrollLeft - target) > 1) {
        skipScrollNotify.current = true;
        el.scrollLeft = target;
        requestAnimationFrame(() => {
          skipScrollNotify.current = false;
        });
      }
      const sun = weekStarts[idx];
      if (!sun) return;
      setLabelSunday(sun);
      if (sun !== focusSundayRef.current) onFocusWeek(sun);
    };

    const onScroll = () => {
      if (skipScrollNotify.current || pageWidth() === 0) return;
      const sun = weekStarts[nearestIndex()];
      if (sun) setLabelSunday(sun);
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(snapToNearest, 80);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('scrollend', snapToNearest);
    return () => {
      window.clearTimeout(settleTimer);
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('scrollend', snapToNearest);
    };
  }, [weekStarts, onFocusWeek]);

  return (
    <div className={`week-view-wrap${loading ? ' is-loading' : ''}${ready ? '' : ' is-placing'}`}>
      {loading ? (
        <div className="strip-loading" role="status" aria-live="polite">
          <div className="spinner" />
          <span>Fetching worklogs from Jira…</span>
        </div>
      ) : null}

      <div className="week-label" aria-live="polite">
        {weekLabel(labelSunday)}
      </div>

      <div
        ref={scrollerRef}
        className="week-carousel"
        role="list"
        aria-label="Week view"
      >
        {weekStarts.map((sun) => {
          const { dates } = weekContaining(sun);
          return (
            <div key={sun} className="week-page" role="listitem">
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
  onSelect: (iso: string) => void;
};

export function MonthView({
  monthIso,
  rangeFrom,
  rangeTo,
  days,
  selected,
  loading,
  onSelect,
}: MonthProps) {
  const anchor = parseLocal(monthIso);
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);

  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - sundayIndex(gridStart));
  const gridEnd = new Date(monthEnd);
  gridEnd.setDate(gridEnd.getDate() + (6 - sundayIndex(gridEnd)));

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

  const rows: typeof cells[] = [];
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
        <div className="card-row month-weekday-row">
          {WEEKDAYS.map((d) => (
            <div key={d} className="month-weekday">
              {d}
            </div>
          ))}
        </div>
        {rows.map((row) => (
          <div className="card-row" key={row[0].iso} role="row">
            {row.map((cell) => {
              if (!cell.inMonth) {
                return <div key={cell.iso} className="card-cell empty" role="gridcell" />;
              }
              const outOfRange = cell.iso < rangeFrom || cell.iso > rangeTo;
              return (
                <div key={cell.iso} className="card-cell" role="gridcell">
                  <DayChip
                    iso={cell.iso}
                    bucket={days[cell.iso]}
                    selected={selected === cell.iso}
                    outOfRange={outOfRange}
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
