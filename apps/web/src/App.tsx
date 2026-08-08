import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  currentMonthRange,
  defaultRange,
  fetchMe,
  fetchWorklogs,
  logout,
  mergeWorklogsResponses,
  canGoNextMonth,
  monthRange,
  shiftMonthRange,
  type Me,
  type WorklogsResponse,
} from './api';
import { Header } from './components/Header';
import { Legend } from './components/Legend';
import { RangeBar } from './components/RangeBar';
import { LayoutSwitcher } from './components/LayoutSwitcher';
import { MonthView, WeekView, type MonthViewHandle } from './components/CalendarViews';
import { DayDrawer } from './components/DayDrawer';
import { SettingsPage } from './components/SettingsPage';
import { Button } from './components/ui/Button';
import {
  addDaysIso,
  clampWeekWindowStart,
  defaultWeekRange,
  defaultWeekWindowStart,
  earlierWeekPrefetchChunk,
  isRangeCoveredBySegments,
  mergeLoadedSegment,
  shiftWeekWindow,
  type LoadedSegment,
  visibleWeekBounds,
  weeksOnWindow,
  weekContaining,
  weekWindowStartForFocus,
  shouldPrefetchEarlierWeeks,
  type CalendarLayout,
} from './components/DayChip';
import { useSettings } from './SettingsContext';

type AppView = 'calendar' | 'settings';

export function App() {
  const { settings, updateSettings } = useSettings();
  const layout = settings.layout;
  const { weekStart, weekWindowWeeks, showLegend, showFutureDays, weekSwipeEnabled } = settings;

  const initial = useMemo(() => defaultRange(), []);
  const [view, setView] = useState<AppView>('calendar');
  const [me, setMe] = useState<Me | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [data, setData] = useState<WorklogsResponse | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('authError');
    if (authError) {
      window.history.replaceState({}, '', '/');
      return authError;
    }
    return null;
  });
  const [weekFocusAnchor, setWeekFocusAnchor] = useState(() =>
    defaultWeekWindowStart(weekStart, weekWindowWeeks),
  );
  const [loadedSegments, setLoadedSegments] = useState<LoadedSegment[]>([]);
  const [prevWeekStart, setPrevWeekStart] = useState(weekStart);

  if (weekStart !== prevWeekStart) {
    setPrevWeekStart(weekStart);
    setWeekFocusAnchor((prev) =>
      weekWindowWeeks === 2
        ? clampWeekWindowStart(prev, from, to, weekStart, 2)
        : weekContaining(prev, weekStart).from,
    );
  }

  const weekFocus = weekFocusAnchor;

  const dataRef = useRef(data);
  dataRef.current = data;
  const loadedSegmentsRef = useRef(loadedSegments);
  loadedSegmentsRef.current = loadedSegments;
  const prefetchInFlight = useRef(new Set<string>());
  const loadGenerationRef = useRef(0);
  const prevWeekWindowWeeksRef = useRef(weekWindowWeeks);
  const monthViewRef = useRef<MonthViewHandle>(null);

  const recordLoadedRange = useCallback((rangeFrom: string, rangeTo: string) => {
    setLoadedSegments((prev) => mergeLoadedSegment(prev, rangeFrom, rangeTo));
  }, []);

  const mergeIntoCache = useCallback((result: WorklogsResponse) => {
    setData((prev) => (prev ? mergeWorklogsResponses([prev, result]) : result));
  }, []);

  const prefetchRange = useCallback(
    async (rangeFrom: string, rangeTo: string) => {
      if (rangeFrom > rangeTo) return;
      if (isRangeCoveredBySegments(loadedSegmentsRef.current, rangeFrom, rangeTo)) return;

      const key = `${rangeFrom}|${rangeTo}`;
      if (prefetchInFlight.current.has(key)) return;
      prefetchInFlight.current.add(key);

      const generation = loadGenerationRef.current;

      try {
        const result = await fetchWorklogs(rangeFrom, rangeTo);
        if (generation !== loadGenerationRef.current) return;
        recordLoadedRange(rangeFrom, rangeTo);
        mergeIntoCache(result);
      } catch (err) {
        const status = (err as { status?: number }).status;
        if (status === 401) {
          setMe(null);
          setData(null);
          setLoadedSegments([]);
          setError('Session expired. Connect to Jira again.');
        }
      } finally {
        prefetchInFlight.current.delete(key);
      }
    },
    [mergeIntoCache, recordLoadedRange],
  );

  const load = useCallback(async (rangeFrom: string, rangeTo: string) => {
    const generation = ++loadGenerationRef.current;
    setLoading(true);
    setError(null);
    setFrom(rangeFrom);
    setTo(rangeTo);
    setDrawerOpen(false);
    setSelected(null);
    try {
      const result = await fetchWorklogs(rangeFrom, rangeTo);
      if (generation !== loadGenerationRef.current) return;
      setLoadedSegments([{ from: rangeFrom, to: rangeTo }]);
      setData(result);
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 401) {
        setMe(null);
        setData(null);
        setLoadedSegments([]);
        setError('Session expired. Connect to Jira again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load worklogs');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe()
      .then((profile) => {
        setMe(profile);
        if (!profile) return;
        if (layout === 'week') {
          const range = defaultWeekRange(weekStart, weekWindowWeeks);
          const windowStart = defaultWeekWindowStart(weekStart, weekWindowWeeks);
          setWeekFocusAnchor(windowStart);
          void load(range.from, range.to);
          return;
        }
        void load(from, to);
      })
      .catch(() => setMe(null))
      .finally(() => setAuthChecked(true));
    // Initial auth check and first worklog load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const focusWeek = useCallback(
    (windowStartIso: string) => {
      const windowStart = weekContaining(windowStartIso, weekStart).from;
      const { from: weekFrom, to: weekTo } = visibleWeekBounds(
        windowStart,
        weekStart,
        weekWindowWeeks,
      );

      setWeekFocusAnchor(windowStart);

      let newFrom = from;
      let newTo = to;

      const displayWeekStart = weekContaining(from, weekStart).from;
      if (windowStart < displayWeekStart) {
        newFrom = weekWindowStartForFocus(windowStart, weekStart, weekWindowWeeks);
      }
      if (weekFrom < newFrom) newFrom = weekFrom;
      if (weekTo > newTo) newTo = weekTo;

      if (newFrom !== from) setFrom(newFrom);
      if (newTo !== to) setTo(newTo);

      if (!isRangeCoveredBySegments(loadedSegmentsRef.current, weekFrom, weekTo)) {
        void prefetchRange(weekFrom, weekTo);
      }
    },
    [from, to, weekStart, weekWindowWeeks, prefetchRange],
  );

  const prefetchAdjacentMonths = useCallback(
    (rangeFrom: string) => {
      const prev = shiftMonthRange(rangeFrom, -1);
      void prefetchRange(prev.from, prev.to);
      if (canGoNextMonth(rangeFrom)) {
        const next = shiftMonthRange(rangeFrom, 1);
        void prefetchRange(next.from, next.to);
      }
    },
    [prefetchRange],
  );

  const syncMonthData = useCallback(
    (range: { from: string; to: string }) => {
      setFrom(range.from);
      setTo(range.to);

      if (!dataRef.current) {
        void load(range.from, range.to);
        return;
      }

      void prefetchRange(range.from, range.to);
      prefetchAdjacentMonths(range.from);
    },
    [load, prefetchAdjacentMonths, prefetchRange],
  );

  const applyMonthRange = useCallback(
    (newFrom: string, newTo: string) => {
      const cached = dataRef.current;
      if (cached && cached.from <= newTo && cached.to >= newFrom) {
        setFrom(newFrom);
        setTo(newTo);
        void prefetchRange(newFrom, newTo);
        return;
      }
      void load(newFrom, newTo);
    },
    [load, prefetchRange],
  );

  const applyWeekRange = useCallback(
    (newFrom: string, newTo: string, focusOverride?: string) => {
      const nextWindow = clampWeekWindowStart(
        focusOverride ?? weekFocus,
        newFrom,
        newTo,
        weekStart,
        weekWindowWeeks,
      );
      setWeekFocusAnchor(nextWindow);

      const cached = dataRef.current;
      if (cached && cached.from <= newTo && cached.to >= newFrom) {
        setFrom(newFrom);
        setTo(newTo);
        const visible = visibleWeekBounds(nextWindow, weekStart, weekWindowWeeks);
        void prefetchRange(visible.from, visible.to);
        if (newFrom < cached.from) {
          void prefetchRange(newFrom, addDaysIso(cached.from, -1));
        }
        if (newTo > cached.to) {
          void prefetchRange(addDaysIso(cached.to, 1), newTo);
        }
        return;
      }

      void load(newFrom, newTo);
    },
    [weekFocus, weekStart, weekWindowWeeks, load, prefetchRange],
  );

  const resetToTodayView = useCallback(
    (targetLayout: CalendarLayout) => {
      if (targetLayout === 'week') {
        const range = defaultWeekRange(weekStart, weekWindowWeeks);
        const windowStart = defaultWeekWindowStart(weekStart, weekWindowWeeks);
        setWeekFocusAnchor(windowStart);
        void load(range.from, range.to);
        return;
      }
      const range = currentMonthRange();
      void load(range.from, range.to);
    },
    [load, weekStart, weekWindowWeeks],
  );

  const goToToday = useCallback(() => {
    resetToTodayView(layout);
  }, [layout, resetToTodayView]);

  useEffect(() => {
    if (layout !== 'week' || !authChecked || !me) return;
    if (prevWeekWindowWeeksRef.current === weekWindowWeeks) return;
    prevWeekWindowWeeksRef.current = weekWindowWeeks;
    const range = defaultWeekRange(weekStart, weekWindowWeeks);
    const windowStart = defaultWeekWindowStart(weekStart, weekWindowWeeks);
    setWeekFocusAnchor(windowStart);
    void load(range.from, range.to);
  }, [layout, authChecked, me, weekStart, weekWindowWeeks, load]);

  useEffect(() => {
    if (layout !== 'week' || !data) return;

    const visible = visibleWeekBounds(weekFocus, weekStart, weekWindowWeeks);
    if (isRangeCoveredBySegments(loadedSegments, visible.from, visible.to)) return;
    void prefetchRange(visible.from, visible.to);
  }, [layout, data, weekFocus, weekStart, weekWindowWeeks, prefetchRange, loadedSegments]);

  useEffect(() => {
    if (layout !== 'week' || !data) return;

    const loadedFrom = data.from;
    const loadedWeekStart = weekContaining(loadedFrom, weekStart).from;
    const chunk = earlierWeekPrefetchChunk(loadedFrom, weekStart);
    if (!chunk) return;

    const approachingEdge = shouldPrefetchEarlierWeeks(
      weekFocus,
      loadedFrom,
      data.to,
      weekStart,
    );
    const focusBeforeLoaded = weekFocus < loadedWeekStart;
    if (!approachingEdge && !focusBeforeLoaded) return;

    if (from > chunk.from) setFrom(chunk.from);
    void prefetchRange(chunk.from, chunk.to);
  }, [layout, data, weekFocus, weekStart, from, prefetchRange]);

  useEffect(() => {
    if (layout !== 'month' || !data) return;
    if (isRangeCoveredBySegments(loadedSegments, from, to)) {
      prefetchAdjacentMonths(from);
      return;
    }
    void prefetchRange(from, to);
  }, [layout, data, from, to, prefetchRange, prefetchAdjacentMonths, loadedSegments]);

  const displayTotalSeconds = useMemo(() => {
    if (!data) return 0;
    if (layout === 'month') return data.totalSeconds;
    const dates = weeksOnWindow(weekFocus, weekStart, weekWindowWeeks).flatMap((sun) =>
      weekContaining(sun, weekStart).dates,
    );
    return dates.reduce((sum, iso) => sum + (data.days[iso]?.totalSeconds ?? 0), 0);
  }, [data, layout, weekFocus, weekStart, weekWindowWeeks]);

  const onLogout = async () => {
    await logout();
    setMe(null);
    setData(null);
    setLoadedSegments([]);
    setSelected(null);
    setDrawerOpen(false);
    setView('calendar');
  };

  const openDay = (iso: string) => {
    setSelected(iso);
    setDrawerOpen(true);
  };

  const changeLayout = (next: CalendarLayout) => {
    if (next === layout) return;
    updateSettings({ layout: next });
    resetToTodayView(next);
  };

  if (!authChecked) {
    return (
      <div className="app-shell">
        <Header me={null} onLogout={() => undefined} />
        <div className="loading">
          <div className="spinner" />
          Loading…
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="app-shell">
        <Header me={null} onLogout={() => undefined} />
        <div className="hero">
          <div className="hero-card">
            <h2>Your worklogs, clearly</h2>
            <p>
              Connect your Jira Cloud account to review time logged across any date range — calmly,
              in a calendar view.
            </p>
            {error ? <p className="error">{error}</p> : null}
            <Button as="a" href="/auth/jira" variant="primary">
              Connect to Jira
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const rangeFrom = data?.from ?? from;
  const rangeTo = data?.to ?? to;
  const weekDisplayFrom = layout === 'week' ? from : rangeFrom;
  const weekDisplayTo = layout === 'week' ? to : rangeTo;
  const weekBlockingLoad = loading && !data;
  const weekVisibleBounds = visibleWeekBounds(weekFocus, weekStart, weekWindowWeeks);
  const weekVisibleLoading =
    layout === 'week' &&
    !weekBlockingLoad &&
    data != null &&
    !isRangeCoveredBySegments(loadedSegments, weekVisibleBounds.from, weekVisibleBounds.to);
  const weekFetching = weekBlockingLoad || weekVisibleLoading;
  const monthBlockingLoad = loading && !data;
  const monthVisibleLoading =
    layout === 'month' &&
    !monthBlockingLoad &&
    data != null &&
    !isRangeCoveredBySegments(loadedSegments, from, to);
  const monthFetching = monthBlockingLoad || monthVisibleLoading;
  const calendarLoading = layout === 'week' ? weekFetching : monthFetching;

  const legend = (
    <Legend
      showLegend={showLegend}
      loading={calendarLoading}
      totalSeconds={data ? displayTotalSeconds : null}
    />
  );

  if (view === 'settings') {
    return (
      <div className="app-shell">
        <Header me={me} onLogout={onLogout} onBack={() => setView('calendar')} />
        <main className="main main-settings">
          <SettingsPage />
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Header
        me={me}
        onLogout={onLogout}
        onOpenSettings={() => setView('settings')}
        controls={
          layout === 'week' ? (
            <RangeBar
              navMode="week"
              from={from}
              to={to}
              loading={weekFetching}
              onApply={applyWeekRange}
              onGoToday={() => goToToday()}
              weekFocus={weekFocus}
              weekStart={weekStart}
              weekWindowWeeks={weekWindowWeeks}
              onPrevWeek={() => focusWeek(shiftWeekWindow(weekFocus, weekStart, -1, weekWindowWeeks))}
              onNextWeek={() => focusWeek(shiftWeekWindow(weekFocus, weekStart, 1, weekWindowWeeks))}
            />
          ) : (
            <RangeBar
              navMode="month"
              from={from}
              to={to}
              loading={monthFetching}
              navLoading={monthBlockingLoad}
              onApply={applyMonthRange}
              onGoToday={() => goToToday()}
              onPrevMonth={() => monthViewRef.current?.goPrev()}
              onNextMonth={() => {
                if (!canGoNextMonth(from)) return;
                monthViewRef.current?.goNext();
              }}
            />
          )
        }
      />
      <main className="main">
        {error ? <p className="error">{error}</p> : null}

        <div className="main-toolbar">
          <div className="toolbar-legend">{legend}</div>
          <LayoutSwitcher layout={layout} onChange={changeLayout} />
        </div>

        {layout === 'month' ? (
          <MonthView
            ref={monthViewRef}
            monthIso={from}
            days={data?.days ?? {}}
            selected={selected}
            blockingLoad={monthBlockingLoad}
            weekStart={weekStart}
            showFutureDays={showFutureDays}
            canGoNext={canGoNextMonth(from)}
            onSelect={openDay}
            onFocusMonth={(anchorIso) => {
              const d = new Date(`${anchorIso}T00:00:00`);
              syncMonthData(monthRange(d.getFullYear(), d.getMonth()));
            }}
          />
        ) : (
          <WeekView
            focusSunday={weekFocus}
            rangeFrom={weekDisplayFrom}
            rangeTo={weekDisplayTo}
            days={data?.days ?? {}}
            selected={selected}
            loading={weekFetching}
            weekStart={weekStart}
            visibleWeeks={weekWindowWeeks}
            showFutureDays={showFutureDays}
            weekSwipeEnabled={weekSwipeEnabled}
            onSelect={openDay}
            onFocusWeek={focusWeek}
          />
        )}

        {!calendarLoading && data && data.totalSeconds === 0 ? (
          <p className="empty">No worklogs in this range.</p>
        ) : null}
      </main>

      <DayDrawer
        open={drawerOpen}
        date={selected}
        bucket={selected ? data?.days?.[selected] : undefined}
        siteUrl={me.siteUrl}
        onClose={() => {
          setDrawerOpen(false);
          setSelected(null);
        }}
      />
    </div>
  );
}
