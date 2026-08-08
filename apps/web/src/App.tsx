import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  currentMonthRange,
  defaultRange,
  fetchMe,
  fetchWorklogs,
  logout,
  mergeWorklogsResponses,
  monthRange,
  toIsoDate,
  type Me,
  type WorklogsResponse,
} from './api';
import { Header } from './components/Header';
import { Legend } from './components/Legend';
import { RangeBar } from './components/RangeBar';
import { LayoutSwitcher } from './components/LayoutSwitcher';
import { MonthView, WeekView } from './components/CalendarViews';
import { DayDrawer } from './components/DayDrawer';
import { SettingsPage } from './components/SettingsPage';
import { Button } from './components/ui/Button';
import {
  addDaysIso,
  earlierWeekPrefetchChunk,
  isCurrentWeek,
  monthStartForWeek,
  parseLocal,
  shiftWeekAnchor,
  weekContaining,
  weekWindowForFocus,
  shouldPrefetchEarlierWeeks,
  WEEK_PREFETCH_WEEKS,
  type CalendarLayout,
} from './components/DayChip';
import { useSettings } from './SettingsContext';

type AppView = 'calendar' | 'settings';

export function App() {
  const { settings, updateSettings } = useSettings();
  const layout = settings.layout;
  const { weekStart, showLegend, showFutureDays, weekSwipeEnabled } = settings;

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
  const [weekFocusAnchor, setWeekFocusAnchor] = useState(
    () => weekContaining(toIsoDate(new Date()), weekStart).from,
  );
  const [prevWeekStart, setPrevWeekStart] = useState(weekStart);

  if (weekStart !== prevWeekStart) {
    setPrevWeekStart(weekStart);
    setWeekFocusAnchor((prev) => weekContaining(prev, weekStart).from);
  }

  const weekFocus = weekFocusAnchor;

  const dataRef = useRef(data);
  dataRef.current = data;
  const prefetchInFlight = useRef(new Set<string>());

  const mergeIntoCache = useCallback((result: WorklogsResponse) => {
    setData((prev) => (prev ? mergeWorklogsResponses([prev, result]) : result));
  }, []);

  const prefetchRange = useCallback(
    async (rangeFrom: string, rangeTo: string) => {
      if (rangeFrom > rangeTo) return;

      const cached = dataRef.current;
      if (cached && cached.from <= rangeFrom && cached.to >= rangeTo) return;

      const key = `${rangeFrom}|${rangeTo}`;
      if (prefetchInFlight.current.has(key)) return;
      prefetchInFlight.current.add(key);

      try {
        const result = await fetchWorklogs(rangeFrom, rangeTo);
        mergeIntoCache(result);
      } catch (err) {
        const status = (err as { status?: number }).status;
        if (status === 401) {
          setMe(null);
          setData(null);
          setError('Session expired. Connect to Jira again.');
        }
      } finally {
        prefetchInFlight.current.delete(key);
      }
    },
    [mergeIntoCache],
  );

  const load = useCallback(async (rangeFrom: string, rangeTo: string) => {
    setLoading(true);
    setError(null);
    setFrom(rangeFrom);
    setTo(rangeTo);
    setDrawerOpen(false);
    setSelected(null);
    try {
      const result = await fetchWorklogs(rangeFrom, rangeTo);
      setData(result);
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 401) {
        setMe(null);
        setData(null);
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
          const focus = weekContaining(toIsoDate(new Date()), weekStart).from;
          setWeekFocusAnchor(focus);
          const win = weekWindowForFocus(focus, weekStart);
          void load(win.from, win.to);
          return;
        }
        void load(from, to);
      })
      .catch(() => setMe(null))
      .finally(() => setAuthChecked(true));
    // Initial auth check and first worklog load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToToday = useCallback(() => {
    if (layout === 'week') {
      const today = toIsoDate(new Date());
      const focus = weekContaining(today, weekStart).from;
      setWeekFocusAnchor(focus);
      const win = weekWindowForFocus(focus, weekStart);
      void load(win.from, win.to);
      return;
    }
    const range = currentMonthRange();
    void load(range.from, range.to);
  }, [layout, load, weekStart]);

  const focusWeek = useCallback(
    (sun: string) => {
      const focusStart = weekContaining(sun, weekStart).from;
      setWeekFocusAnchor(focusStart);

      const displayWeekStart = weekContaining(from, weekStart).from;
      if (focusStart < displayWeekStart) {
        setFrom(shiftWeekAnchor(displayWeekStart, -WEEK_PREFETCH_WEEKS));
      }
    },
    [from, weekStart],
  );

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

  const displayTotalSeconds = useMemo(() => {
    if (!data) return 0;
    if (layout === 'month') return data.totalSeconds;
    const { dates } = weekContaining(weekFocus, weekStart);
    return dates.reduce((sum, iso) => sum + (data.days[iso]?.totalSeconds ?? 0), 0);
  }, [data, layout, weekFocus, weekStart]);

  const onLogout = async () => {
    await logout();
    setMe(null);
    setData(null);
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

    if (next === 'week') {
      const today = toIsoDate(new Date());
      const focus =
        today >= from && today <= to
          ? weekContaining(today, weekStart).from
          : weekContaining(from, weekStart).from;
      const win = weekWindowForFocus(focus, weekStart);
      const clamped = win.weekStarts.includes(focus)
        ? focus
        : (win.weekStarts[win.weekStarts.length - 1] ?? focus);
      setWeekFocusAnchor(clamped);
      setFrom(win.from);
      setTo(win.to);

      const cached = data;
      if (cached && cached.from <= win.to && cached.to >= win.from) {
        if (win.from < cached.from) {
          void prefetchRange(win.from, addDaysIso(cached.from, -1));
        }
        if (win.to > cached.to) {
          void prefetchRange(addDaysIso(cached.to, 1), win.to);
        }
        return;
      }

      void load(win.from, win.to);
      return;
    }

    const monthStart = monthStartForWeek(weekFocus);
    const d = parseLocal(monthStart);
    const range = monthRange(d.getFullYear(), d.getMonth());
    void load(range.from, range.to);
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

  const legend = (
    <Legend
      showLegend={showLegend}
      loading={loading}
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
          layout === 'month' ? (
            <RangeBar
              from={from}
              to={to}
              loading={loading}
              onApply={(f, t) => void load(f, t)}
              onGoToday={() => goToToday()}
            />
          ) : null
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
            monthIso={rangeFrom}
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            days={data?.days ?? {}}
            selected={selected}
            loading={loading}
            weekStart={weekStart}
            showFutureDays={showFutureDays}
            onSelect={openDay}
          />
        ) : (
          <WeekView
            focusSunday={weekFocus}
            rangeFrom={weekDisplayFrom}
            rangeTo={weekDisplayTo}
            days={data?.days ?? {}}
            selected={selected}
            loading={weekBlockingLoad}
            weekStart={weekStart}
            showFutureDays={showFutureDays}
            weekSwipeEnabled={weekSwipeEnabled}
            onSelect={openDay}
            onFocusWeek={focusWeek}
            onGoToday={() => goToToday()}
            isOnCurrentWeek={isCurrentWeek(weekFocus, weekStart)}
          />
        )}

        {!loading && data && data.totalSeconds === 0 ? (
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
