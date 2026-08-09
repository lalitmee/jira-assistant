import { useCallback, useRef, useState } from 'react';
import { Header } from './components/Header';
import { Legend } from './components/Legend';
import { RangeBar } from './components/RangeBar';
import { LayoutSwitcher } from './components/LayoutSwitcher';
import { MonthView, WeekView, type MonthViewHandle, type WeekViewHandle } from './components/CalendarViews';
import { DayDrawer } from './components/DayDrawer';
import { SettingsPage } from './components/SettingsPage';
import { Button } from './components/ui/Button';
import { useSettings } from './SettingsContext';
import { auditConfigFromSettings } from './settings';
import { useAuth } from './hooks/useAuth';
import { useCalendarNavigation } from './hooks/useCalendarNavigation';
import { useWorklogs } from './hooks/useWorklogs';
import {
  canGoNextMonth,
  monthRange,
} from './api';
import {
  isRangeCoveredBySegments,
  shiftWeekWindow,
  visibleWeekBounds,
  weekContaining,
  weekWindowStartForFocus,
  type CalendarLayout,
} from './components/DayChip';

type AppView = 'calendar' | 'settings';

export function App() {
  const { settings, updateSettings } = useSettings();
  const layout = settings.layout;
  const {
    weekStart,
    weekWindowWeeks,
    showLegend,
    showFutureDays,
    weekSwipeEnabled,
    monthSwipeEnabled,
    durationFormat,
  } = settings;
  const audit = auditConfigFromSettings(settings);

  const [view, setView] = useState<AppView>('calendar');
  const [todayAnimating, setTodayAnimating] = useState(false);
  const monthViewRef = useRef<MonthViewHandle>(null);
  const weekViewRef = useRef<WeekViewHandle>(null);

  // 1. Session state hook
  const {
    me,
    authChecked,
    error: authError,
    clearAuth,
    handleLogout,
  } = useAuth();

  // 2. Navigation coordinates hook
  const {
    from,
    to,
    setFrom,
    setTo,
    selected,
    drawerOpen,
    weekFocusAnchor,
    setWeekFocusAnchor,
    openDay,
    closeDay,
  } = useCalendarNavigation(weekStart, weekWindowWeeks);

  // 3. Worklog cache manager hook
  const {
    data,
    loading,
    error: worklogError,
    loadedSegments,
    setLoadedSegments,
    setData,
    displayTotalSeconds,
    prefetchRange,
    syncMonthData,
    applyMonthRange,
    applyWeekRange,
    resetToTodayView,
  } = useWorklogs({
    from,
    to,
    setFrom,
    setTo,
    weekFocus: weekFocusAnchor,
    setWeekFocusAnchor,
    layout,
    weekStart,
    weekWindowWeeks,
    startupRange: settings.startupRange,
    showFutureDays,
    authChecked,
    meExists: me !== null,
    clearAuth,
  });

  const error = authError || worklogError;

  const onLogout = async () => {
    await handleLogout();
    setData(null);
    setLoadedSegments([]);
    closeDay();
    setView('calendar');
  };

  const focusWeek = useCallback(
    (windowStartIso: string) => {
      const windowStart = weekContaining(windowStartIso, weekStart).from;
      const { from: weekFrom, to: weekTo } = visibleWeekBounds(
        windowStart,
        weekStart,
        weekWindowWeeks,
      );

      let newFrom = from;
      let newTo = to;

      const displayWeekStart = weekContaining(from, weekStart).from;
      if (windowStart < displayWeekStart) {
        newFrom = weekWindowStartForFocus(windowStart, weekStart, weekWindowWeeks);
      }
      if (weekFrom < newFrom) newFrom = weekFrom;
      if (weekTo > newTo) newTo = weekTo;

      setWeekFocusAnchor(windowStart);
      if (newFrom !== from) setFrom(newFrom);
      if (newTo !== to) setTo(newTo);

      if (!isRangeCoveredBySegments(loadedSegments, weekFrom, weekTo)) {
        void prefetchRange(weekFrom, weekTo);
      }
    },
    [from, to, weekStart, weekWindowWeeks, loadedSegments, prefetchRange, setFrom, setTo, setWeekFocusAnchor],
  );

  const changeLayout = (next: CalendarLayout) => {
    if (next === layout) return;
    updateSettings({ layout: next });
    resetToTodayView(next);
  };

  const goToday = useCallback(() => {
    resetToTodayView(layout);
  }, [layout, resetToTodayView]);

  const handleGoToday = useCallback(() => {
    if (todayAnimating) return;
    setTodayAnimating(true);
    const onDone = () => setTodayAnimating(false);
    if (layout === 'week') {
      if (weekViewRef.current) weekViewRef.current.goToToday(onDone);
      else {
        goToday();
        onDone();
      }
      return;
    }
    if (monthViewRef.current) monthViewRef.current.goToToday(onDone);
    else {
      goToday();
      onDone();
    }
  }, [goToday, layout, todayAnimating]);

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

  // Segment caching and load/spinner indicators configuration
  const weekBlockingLoad = loading && !data;
  const weekVisibleBounds = visibleWeekBounds(weekFocusAnchor, weekStart, weekWindowWeeks);
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
      auditMinHours={audit.minHours}
      auditMaxHours={audit.maxHours}
      durationFormat={durationFormat}
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
              onGoToday={handleGoToday}
              todayAnimating={todayAnimating}
              weekFocus={weekFocusAnchor}
              weekStart={weekStart}
              weekWindowWeeks={weekWindowWeeks}
              onPrevWeek={() => focusWeek(shiftWeekWindow(weekFocusAnchor, weekStart, -1, weekWindowWeeks))}
              onNextWeek={() => focusWeek(shiftWeekWindow(weekFocusAnchor, weekStart, 1, weekWindowWeeks))}
            />
          ) : (
            <RangeBar
              navMode="month"
              from={from}
              to={to}
              loading={monthFetching}
              navLoading={monthBlockingLoad}
              onApply={applyMonthRange}
              onGoToday={handleGoToday}
              todayAnimating={todayAnimating}
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
            monthSwipeEnabled={monthSwipeEnabled}
            audit={audit}
            durationFormat={durationFormat}
            canGoNext={canGoNextMonth(from)}
            onSelect={openDay}
            onFocusMonth={(anchorIso) => {
              const d = new Date(`${anchorIso}T00:00:00`);
              syncMonthData(monthRange(d.getFullYear(), d.getMonth()));
            }}
            onResetToToday={goToday}
          />
        ) : (
          <WeekView
            ref={weekViewRef}
            focusSunday={weekFocusAnchor}
            rangeFrom={from}
            rangeTo={to}
            days={data?.days ?? {}}
            selected={selected}
            blockingLoad={weekBlockingLoad}
            weekStart={weekStart}
            visibleWeeks={weekWindowWeeks}
            showFutureDays={showFutureDays}
            weekSwipeEnabled={weekSwipeEnabled}
            audit={audit}
            durationFormat={durationFormat}
            onSelect={openDay}
            onFocusWeek={focusWeek}
            onResetToToday={goToday}
          />
        )}

        {!calendarLoading && data && displayTotalSeconds === 0 ? (
          <p className="empty">No worklogs in this range.</p>
        ) : null}
      </main>

      <DayDrawer
        open={drawerOpen}
        date={selected}
        bucket={selected ? data?.days?.[selected] : undefined}
        siteUrl={me.siteUrl}
        onClose={closeDay}
      />
    </div>
  );
}
