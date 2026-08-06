import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  currentMonthRange,
  defaultRange,
  fetchMe,
  fetchWorklogs,
  formatDuration,
  logout,
  monthRange,
  toIsoDate,
  type Me,
  type WorklogsResponse,
} from './api';
import { Header } from './components/Header';
import { RangeBar } from './components/RangeBar';
import { LayoutSwitcher } from './components/LayoutSwitcher';
import { MonthView, WeekView } from './components/CalendarViews';
import { DayDrawer } from './components/DayDrawer';
import {
  LAYOUT_STORAGE_KEY,
  isCurrentWeek,
  monthStartForWeek,
  parseLocal,
  readStoredLayout,
  weekContaining,
  weekWindowForFocus,
  type CalendarLayout,
} from './components/DayChip';

export function App() {
  const initial = useMemo(() => defaultRange(), []);
  const [me, setMe] = useState<Me | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [data, setData] = useState<WorklogsResponse | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [layout, setLayout] = useState<CalendarLayout>(() => readStoredLayout());
  const [weekFocus, setWeekFocus] = useState(() => weekContaining(toIsoDate(new Date())).from);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('authError');
    if (authError) {
      setError(authError);
      window.history.replaceState({}, '', '/');
    }

    fetchMe()
      .then((profile) => setMe(profile))
      .catch(() => setMe(null))
      .finally(() => setAuthChecked(true));
  }, []);

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

  const goToToday = useCallback(() => {
    if (layout === 'week') {
      const today = toIsoDate(new Date());
      const focus = weekContaining(today).from;
      setWeekFocus(focus);
      const win = weekWindowForFocus(focus);
      void load(win.from, win.to);
      return;
    }
    const range = currentMonthRange();
    void load(range.from, range.to);
  }, [layout, load]);

  useEffect(() => {
    if (!me) return;
    if (layout === 'week') {
      const focus = weekContaining(toIsoDate(new Date())).from;
      setWeekFocus(focus);
      const win = weekWindowForFocus(focus);
      void load(win.from, win.to);
    } else {
      void load(from, to);
    }
    // Initial load when session becomes available
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, load]);

  const displayTotalSeconds = useMemo(() => {
    if (!data) return 0;
    if (layout === 'month') return data.totalSeconds;
    const { dates } = weekContaining(weekFocus);
    return dates.reduce((sum, iso) => sum + (data.days[iso]?.totalSeconds ?? 0), 0);
  }, [data, layout, weekFocus]);

  const onLogout = async () => {
    await logout();
    setMe(null);
    setData(null);
    setSelected(null);
    setDrawerOpen(false);
  };

  const openDay = (iso: string) => {
    setSelected(iso);
    setDrawerOpen(true);
  };

  const changeLayout = (next: CalendarLayout) => {
    if (next === layout) return;
    setLayout(next);
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, next);
    } catch {
      // ignore
    }

    if (next === 'week') {
      const today = toIsoDate(new Date());
      // Prefer today when it’s in the viewed month; else first week of that month.
      const focus =
        today >= from && today <= to
          ? weekContaining(today).from
          : weekContaining(from).from;
      setWeekFocus(focus);
      const win = weekWindowForFocus(focus);
      // Keep focus clamped inside the loaded window (avoids oldest-week flash at index 0).
      const clamped =
        win.weekStarts.includes(focus)
          ? focus
          : win.weekStarts[win.weekStarts.length - 1] ?? focus;
      setWeekFocus(clamped);
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
              Connect your Jira Cloud account to review time logged across any date range —
              calmly, in a calendar view.
            </p>
            {error ? <p className="error">{error}</p> : null}
            <a className="btn btn-primary" href="/auth/jira">
              Connect to Jira
            </a>
          </div>
        </div>
      </div>
    );
  }

  const rangeFrom = data?.from ?? from;
  const rangeTo = data?.to ?? to;

  return (
    <div className="app-shell">
      <Header
        me={me}
        onLogout={onLogout}
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
          <div className="legend">
            <span className="legend-item">
              <i className="swatch weekend" /> Weekend (ignored)
            </span>
            <span className="legend-item">
              <i className="swatch ok" /> 6h–8h
            </span>
            <span className="legend-item">
              <i className="swatch bad" /> Under 6h
            </span>
            <span className="legend-item">
              <i className="swatch over" /> Over 8h
            </span>
            <span className="legend-item legend-total">
              {loading ? (
                'Loading…'
              ) : data ? (
                <>
                  Total <strong>{formatDuration(displayTotalSeconds)}</strong>
                </>
              ) : null}
            </span>
          </div>
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
            onSelect={openDay}
          />
        ) : (
          <WeekView
            focusSunday={weekFocus}
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            days={data?.days ?? {}}
            selected={selected}
            loading={loading}
            onSelect={openDay}
            onFocusWeek={setWeekFocus}
            onGoToday={() => goToToday()}
            isOnCurrentWeek={isCurrentWeek(weekFocus)}
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
