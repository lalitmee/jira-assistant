import {
  forwardRef,
  memo,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import type { DayBucket } from '../api';
import {
  monthAnchor,
  monthAnchorsSpan,
  monthDelta,
  monthRange,
  monthWindowPages,
  toIsoDate,
} from '../api';
import {
  DayChip,
  defaultWeekWindowStart,
  parseLocal,
  shiftWeekAnchor,
  toIso,
  twoWeekWindowStartsInRange,
  weekCarouselPageDelta,
  weeksOnWindow,
  weekContaining,
  weekStartOffset,
  weekStartsInRange,
  weekdayLabels,
} from './DayChip';
import { useHorizontalCarousel } from './useHorizontalCarousel';

import type { AuditConfig, DurationFormat, WeekStart, WeekWindowWeeks } from '../settings';

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

type CarouselShellProps = {
  wrapClassName: string;
  weekStart: WeekStart;
  loading?: boolean;
  ready: boolean;
  ariaLabel: string;
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  viewportRef: React.RefObject<HTMLDivElement>;
  animating: boolean;
  trackStyle: CSSProperties;
  onTrackTransitionEnd: (e: React.TransitionEvent<HTMLDivElement>) => void;
  swipeEnabled: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
  onClickCapture: (e: React.MouseEvent) => void;
  listAriaLabel: string;
  children: ReactNode;
};

function CalendarCarouselShell({
  wrapClassName,
  weekStart,
  loading,
  ready,
  ariaLabel,
  onKeyDown,
  viewportRef,
  animating,
  trackStyle,
  onTrackTransitionEnd,
  swipeEnabled,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onClickCapture,
  listAriaLabel,
  children,
}: CarouselShellProps) {
  return (
    <div
      className={`${wrapClassName}${loading ? ' is-loading' : ''}${ready ? '' : ' is-placing'}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label={ariaLabel}
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
          className={`week-carousel${swipeEnabled ? '' : ' week-carousel--nav-only'}`}
          role="list"
          aria-label={listAriaLabel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onClickCapture={onClickCapture}
        >
          <div
            className={`week-track${animating ? ' is-animating' : ''}`}
            style={trackStyle}
            onTransitionEnd={onTrackTransitionEnd}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

type CalendarDisplayProps = {
  audit: AuditConfig;
  durationFormat: DurationFormat;
};

type WeekProps = CalendarDisplayProps & {
  focusSunday: string;
  rangeFrom: string;
  rangeTo: string;
  days: Record<string, DayBucket>;
  selected: string | null;
  /** Blocks carousel interaction for the initial load only — not background prefetch. */
  blockingLoad?: boolean;
  weekStart: WeekStart;
  visibleWeeks?: WeekWindowWeeks;
  showFutureDays: boolean;
  weekSwipeEnabled: boolean;
  onSelect: (iso: string) => void;
  onFocusWeek: (sundayIso: string) => void;
  onResetToToday: () => void;
};

export type WeekViewHandle = {
  goToToday: (onDone?: () => void) => void;
};

function WeekRow({
  sun,
  rangeFrom,
  rangeTo,
  days,
  selected,
  weekStart,
  showFutureDays,
  audit,
  durationFormat,
  onSelect,
}: {
  sun: string;
  rangeFrom: string;
  rangeTo: string;
  days: Record<string, DayBucket>;
  selected: string | null;
  weekStart: WeekStart;
  showFutureDays: boolean;
  audit: AuditConfig;
  durationFormat: DurationFormat;
  onSelect: (iso: string) => void;
}) {
  const { dates } = weekContaining(sun, weekStart);
  return (
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
              audit={audit}
              durationFormat={durationFormat}
              onSelect={onSelect}
            />
          </div>
        );
      })}
    </div>
  );
}

function WeekPage({
  windowStart,
  visibleWeeks,
  rangeFrom,
  rangeTo,
  days,
  selected,
  weekStart,
  showFutureDays,
  audit,
  durationFormat,
  onSelect,
}: {
  windowStart: string;
  visibleWeeks: WeekWindowWeeks;
  rangeFrom: string;
  rangeTo: string;
  days: Record<string, DayBucket>;
  selected: string | null;
  weekStart: WeekStart;
  showFutureDays: boolean;
  audit: AuditConfig;
  durationFormat: DurationFormat;
  onSelect: (iso: string) => void;
}) {
  const weekAnchors = weeksOnWindow(windowStart, weekStart, visibleWeeks);

  if (visibleWeeks === 1) {
    return (
      <WeekRow
        sun={windowStart}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        days={days}
        selected={selected}
        weekStart={weekStart}
        showFutureDays={showFutureDays}
        audit={audit}
        durationFormat={durationFormat}
        onSelect={onSelect}
      />
    );
  }

  return (
    <div className="week-stack">
      {weekAnchors.map((sun) => (
        <WeekRow
          key={sun}
          sun={sun}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
          days={days}
          selected={selected}
          weekStart={weekStart}
          showFutureDays={showFutureDays}
          audit={audit}
          durationFormat={durationFormat}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export const WeekView = forwardRef<WeekViewHandle, WeekProps>(function WeekView(
  {
    focusSunday,
    rangeFrom,
    rangeTo,
    days,
    selected,
    blockingLoad,
    weekStart,
    visibleWeeks = 1,
    showFutureDays,
    weekSwipeEnabled,
    audit,
    durationFormat,
    onSelect,
    onFocusWeek,
    onResetToToday,
  },
  ref,
) {
  const weekStarts = useMemo(
    () =>
      visibleWeeks === 2
        ? twoWeekWindowStartsInRange(rangeFrom, rangeTo, weekStart)
        : weekStartsInRange(rangeFrom, rangeTo, weekStart),
    [rangeFrom, rangeTo, weekStart, visibleWeeks],
  );

  const focusEarlierWeek = () => {
    const first = weekStarts[0];
    if (!first) return;
    onFocusWeek(shiftWeekAnchor(first, -1));
  };

  const carousel = useHorizontalCarousel({
    pageKeys: weekStarts,
    focusKey: weekContaining(focusSunday, weekStart).from,
    swipeEnabled: weekSwipeEnabled,
    loading: blockingLoad,
    onFocusPage: onFocusWeek,
    onFocusEarlier: focusEarlierWeek,
  });

  useImperativeHandle(
    ref,
    () => ({
      goToToday: (onDone) => {
        const todayWindow = defaultWeekWindowStart(weekStart, visibleWeeks);
        const targetIdx = weekStarts.indexOf(todayWindow);
        if (targetIdx >= 0) {
          if (targetIdx === carousel.index) {
            onDone?.();
            return;
          }
          carousel.flyToIndex(targetIdx, {
            onComplete: () => {
              onFocusWeek(todayWindow);
              onDone?.();
            },
          });
          return;
        }
        const currentFocus = weekContaining(focusSunday, weekStart).from;
        const delta = weekCarouselPageDelta(currentFocus, todayWindow, weekStart, visibleWeeks);
        carousel.flyByPages(delta, {
          onComplete: () => {
            onResetToToday();
            onDone?.();
          },
        });
      },
    }),
    [
      carousel.flyByPages,
      carousel.flyToIndex,
      carousel.index,
      focusSunday,
      onFocusWeek,
      onResetToToday,
      visibleWeeks,
      weekStart,
      weekStarts,
    ],
  );

  const wrapClassName = `week-view-wrap${visibleWeeks === 2 ? ' week-view-wrap--dual' : ''}`;

  return (
    <CalendarCarouselShell
      wrapClassName={wrapClassName}
      weekStart={weekStart}
      loading={blockingLoad}
      ready={carousel.ready}
      ariaLabel="Week view"
      listAriaLabel="Week pages"
      swipeEnabled={weekSwipeEnabled}
      viewportRef={carousel.viewportRef}
      animating={carousel.animating}
      trackStyle={carousel.trackStyle}
      onTrackTransitionEnd={carousel.onTrackTransitionEnd}
      onKeyDown={carousel.onKeyDown}
      onPointerDown={carousel.onPointerDown}
      onPointerMove={carousel.onPointerMove}
      onPointerUp={carousel.onPointerUp}
      onPointerCancel={carousel.onPointerCancel}
      onClickCapture={carousel.onClickCapture}
    >
      {weekStarts.map((sun) => (
        <div
          key={sun}
          className="week-page"
          role="listitem"
          style={carousel.pageWidth > 0 ? { width: carousel.pageWidth } : undefined}
        >
          <WeekPage
            windowStart={sun}
            visibleWeeks={visibleWeeks}
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            days={days}
            selected={selected}
            weekStart={weekStart}
            showFutureDays={showFutureDays}
            audit={audit}
            durationFormat={durationFormat}
            onSelect={onSelect}
          />
        </div>
      ))}
    </CalendarCarouselShell>
  );
});

function MonthGrid({
  monthIso,
  rangeFrom,
  rangeTo,
  days,
  selected,
  weekStart,
  showFutureDays,
  audit,
  durationFormat,
  onSelect,
}: {
  monthIso: string;
  rangeFrom: string;
  rangeTo: string;
  days: Record<string, DayBucket>;
  selected: string | null;
  weekStart: WeekStart;
  showFutureDays: boolean;
  audit: AuditConfig;
  durationFormat: DurationFormat;
  onSelect: (iso: string) => void;
}) {
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
    <div className="month-view" role="grid" aria-label="Month calendar">
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
                  audit={audit}
                  durationFormat={durationFormat}
                  onSelect={onSelect}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function monthGridSignature(
  monthIso: string,
  weekStart: WeekStart,
  days: Record<string, DayBucket>,
): string {
  const anchor = parseLocal(monthIso);
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - weekStartOffset(gridStart, weekStart));
  const gridEnd = new Date(monthEnd);
  gridEnd.setDate(gridEnd.getDate() + (6 - weekStartOffset(gridEnd, weekStart)));

  const parts: string[] = [];
  const cur = new Date(gridStart);
  while (cur.getTime() <= gridEnd.getTime()) {
    const iso = toIso(cur);
    parts.push(`${iso}:${days[iso]?.totalSeconds ?? 0}`);
    cur.setDate(cur.getDate() + 1);
  }
  return parts.join('|');
}

const MonthGridMemo = memo(MonthGrid, (prev, next) => {
  return (
    prev.monthIso === next.monthIso &&
    prev.rangeFrom === next.rangeFrom &&
    prev.rangeTo === next.rangeTo &&
    prev.selected === next.selected &&
    prev.weekStart === next.weekStart &&
    prev.showFutureDays === next.showFutureDays &&
    prev.audit.minHours === next.audit.minHours &&
    prev.audit.maxHours === next.audit.maxHours &&
    prev.audit.auditWeekends === next.audit.auditWeekends &&
    prev.durationFormat === next.durationFormat &&
    prev.onSelect === next.onSelect &&
    monthGridSignature(prev.monthIso, prev.weekStart, prev.days) ===
      monthGridSignature(next.monthIso, next.weekStart, next.days)
  );
});

export type MonthViewHandle = {
  goPrev: () => void;
  goNext: () => void;
  goToToday: (onDone?: () => void) => void;
};

type MonthProps = CalendarDisplayProps & {
  /** Any ISO date in the month to display (typically range `from`). */
  monthIso: string;
  days: Record<string, DayBucket>;
  selected: string | null;
  /** Blocks interaction for the initial load only — not background prefetch. */
  blockingLoad?: boolean;
  weekStart: WeekStart;
  showFutureDays: boolean;
  monthSwipeEnabled: boolean;
  canGoNext?: boolean;
  onSelect: (iso: string) => void;
  onFocusMonth: (monthAnchorIso: string) => void;
  onResetToToday: () => void;
};

export const MonthView = forwardRef<MonthViewHandle, MonthProps>(function MonthView(
  {
    monthIso,
    days,
    selected,
    blockingLoad,
    weekStart,
    showFutureDays,
    monthSwipeEnabled,
    audit,
    durationFormat,
    canGoNext = true,
    onSelect,
    onFocusMonth,
  },
  ref,
) {
  const focusKey = monthAnchor(monthIso);
  const [flySpanPages, setFlySpanPages] = useState<string[] | null>(null);
  const flySpanPendingRef = useRef<{ todayAnchor: string; onDone?: () => void } | null>(null);
  const flyToIndexRef = useRef<
    (targetIndex: number, options?: { onComplete?: () => void }) => void
  >(() => undefined);

  const monthPages = useMemo(
    () => flySpanPages ?? monthWindowPages(focusKey),
    [flySpanPages, focusKey],
  );

  const carousel = useHorizontalCarousel({
    pageKeys: monthPages,
    focusKey,
    swipeEnabled: monthSwipeEnabled,
    loading: blockingLoad,
    canGoNext,
    deferFocusNotify: true,
    resetIndexOnTransitionEnd: 1,
    onFocusPage: onFocusMonth,
  });

  flyToIndexRef.current = carousel.flyToIndex;

  useLayoutEffect(() => {
    const pending = flySpanPendingRef.current;
    if (!pending || !flySpanPages) return;
    flySpanPendingRef.current = null;

    const targetIdx = flySpanPages.indexOf(pending.todayAnchor);
    if (targetIdx < 0) {
      setFlySpanPages(null);
      pending.onDone?.();
      return;
    }

    flyToIndexRef.current(targetIdx, {
      onComplete: () => {
        setFlySpanPages(null);
        onFocusMonth(pending.todayAnchor);
        pending.onDone?.();
      },
    });
  }, [flySpanPages, onFocusMonth]);

  useImperativeHandle(
    ref,
    () => ({
      goPrev: () => carousel.goToPage(carousel.index - 1),
      goNext: () => carousel.goToPage(carousel.index + 1),
      goToToday: (onDone) => {
        const todayAnchor = monthAnchor(toIsoDate(new Date()));
        const delta = monthDelta(focusKey, todayAnchor);
        if (delta === 0) {
          onDone?.();
          return;
        }

        const targetIdx = monthPages.indexOf(todayAnchor);
        if (targetIdx >= 0) {
          if (targetIdx === carousel.index) {
            onDone?.();
            return;
          }
          carousel.flyToIndex(targetIdx, {
            onComplete: () => {
              onFocusMonth(todayAnchor);
              onDone?.();
            },
          });
          return;
        }

        flySpanPendingRef.current = { todayAnchor, onDone };
        setFlySpanPages(monthAnchorsSpan(focusKey, todayAnchor));
      },
    }),
    [
      carousel.flyToIndex,
      carousel.index,
      focusKey,
      monthPages,
      onFocusMonth,
    ],
  );

  return (
    <CalendarCarouselShell
      wrapClassName="month-view-wrap"
      weekStart={weekStart}
      loading={blockingLoad}
      ready={carousel.ready}
      ariaLabel="Month view"
      listAriaLabel="Month pages"
      swipeEnabled={monthSwipeEnabled}
      viewportRef={carousel.viewportRef}
      animating={carousel.animating}
      trackStyle={carousel.trackStyle}
      onTrackTransitionEnd={carousel.onTrackTransitionEnd}
      onKeyDown={carousel.onKeyDown}
      onPointerDown={carousel.onPointerDown}
      onPointerMove={carousel.onPointerMove}
      onPointerUp={carousel.onPointerUp}
      onPointerCancel={carousel.onPointerCancel}
      onClickCapture={carousel.onClickCapture}
    >
      {monthPages.map((anchorIso) => {
        const pageRange = monthRange(
          parseLocal(anchorIso).getFullYear(),
          parseLocal(anchorIso).getMonth(),
        );
        return (
          <div
            key={anchorIso}
            className="week-page"
            role="listitem"
            style={carousel.pageWidth > 0 ? { width: carousel.pageWidth } : undefined}
          >
            <MonthGridMemo
              monthIso={anchorIso}
              rangeFrom={pageRange.from}
              rangeTo={pageRange.to}
              days={days}
              selected={selected}
              weekStart={weekStart}
              showFutureDays={showFutureDays}
              audit={audit}
              durationFormat={durationFormat}
              onSelect={onSelect}
            />
          </div>
        );
      })}
    </CalendarCarouselShell>
  );
});
