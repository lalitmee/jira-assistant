# Refactoring Plan: Modulating App.tsx using Custom Hooks

This document contains the analysis, architectural design, refactored code snippets, and next steps for refactoring the main container component of the web app: `apps/web/src/App.tsx`.

---

## 1. Executive Code Health Summary

### Strengths
- **Functional Completeness:** The current file coordinates auth check, date-range manipulation, layout switching, complex segment-based caching, lazy prefetching, and render composition successfully.
- **Optimized Caching:** Segment-based merging prevents redundant network calls during scroll and carousel swipes.
- **Clear UI Separation:** Sub-layout rendering (`MonthView`, `WeekView`, `RangeBar`) is delegated to separate sub-components.

### Primary Areas for Improvement (Code Smells & Anti-patterns)
1. **Massive Component Size (State Bloat):** The `App` component manages over 13 state variables, which creates high cognitive load and makes the code difficult to reason about.
2. **Scattered Side Effects:** The component utilizes 6 separate `useEffect` calls to synchronize navigation changes, settings, and network prefetching. This creates a brittle, reactive structure where changes in one state can trigger cascading side effects.
3. **React State Update Anti-pattern:** Adjusting state variables directly inside the render loop (`if (weekStart !== prevWeekStart) { setWeekFocusAnchor(...) }`) rather than relying on key-based resets or controlled settings synchronization.
4. **Violation of Single Responsibility Principle (SRP):** `App.tsx` functions as a controller, API layer, data caching layer, and UI composition root simultaneously.

---

## 2. Refactored Architectural Design & Code Blocks

We will decouple `App.tsx` by extracting the logic into three custom hooks:
1. **`useAuth`**: Manages current user session, authentication check on mount, and logout.
2. **`useCalendarNavigation`**: Coordinates selected range dates (`from`, `to`), selected date highlights, drawer visibility, and week focus.
3. **`useWorklogs`**: Coordinates network loading, segment-based caches (`loadedSegments`), background prefetching side effects, and calculations of total logged seconds.

Below is the complete set of proposed files for this refactoring.

### Hook 1: [useAuth.ts](file:///Users/lalit.kumar1/Projects/Work/Github/jira-assistant/apps/web/src/hooks/useAuth.ts)

```typescript
import { useState, useEffect, useCallback } from 'react';
import { fetchMe, logout, type Me } from '../api';

export function useAuth() {
  const [me, setMe] = useState<Me | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    // Check url search params on mount for authorization errors
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('authError');
    if (authError) {
      window.history.replaceState({}, '', '/');
      return authError;
    }
    return null;
  });

  useEffect(() => {
    let active = true;
    fetchMe()
      .then((profile) => {
        if (active) setMe(profile);
      })
      .catch(() => {
        if (active) setMe(null);
      })
      .finally(() => {
        if (active) setAuthChecked(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    setMe(null);
  }, []);

  const clearAuth = useCallback((errMessage?: string) => {
    setMe(null);
    if (errMessage) setError(errMessage);
  }, []);

  return {
    me,
    authChecked,
    error,
    setError,
    clearAuth,
    handleLogout,
  };
}
```

---

### Hook 2: [useCalendarNavigation.ts](file:///Users/lalit.kumar1/Projects/Work/Github/jira-assistant/apps/web/src/hooks/useCalendarNavigation.ts)

```typescript
import { useState, useCallback } from 'react';
import { defaultRange } from '../api';
import {
  defaultWeekWindowStart,
  clampWeekWindowStart,
  weekContaining,
} from '../components/DayChip';
import type { WeekStart, WeekWindowWeeks } from '../settings';

export function useCalendarNavigation(weekStart: WeekStart, weekWindowWeeks: WeekWindowWeeks) {
  const initial = defaultRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [selected, setSelected] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [weekFocusAnchor, setWeekFocusAnchor] = useState(() =>
    defaultWeekWindowStart(weekStart, weekWindowWeeks),
  );
  const [prevWeekStart, setPrevWeekStart] = useState(weekStart);

  // Directly adjust state during render when weekStart settings change (prevents extra update frame)
  if (weekStart !== prevWeekStart) {
    setPrevWeekStart(weekStart);
    setWeekFocusAnchor((prev) =>
      weekWindowWeeks === 2
        ? clampWeekWindowStart(prev, from, to, weekStart, 2)
        : weekContaining(prev, weekStart).from,
    );
  }

  const openDay = useCallback((iso: string) => {
    setSelected(iso);
    setDrawerOpen(true);
  }, []);

  const closeDay = useCallback(() => {
    setDrawerOpen(false);
    setSelected(null);
  }, []);

  return {
    from,
    to,
    setFrom,
    setTo,
    selected,
    setSelected,
    drawerOpen,
    setDrawerOpen,
    weekFocusAnchor,
    setWeekFocusAnchor,
    openDay,
    closeDay,
  };
}
```

---

### Hook 3: [useWorklogs.ts](file:///Users/lalit.kumar1/Projects/Work/Github/jira-assistant/apps/web/src/hooks/useWorklogs.ts)

```typescript
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  fetchWorklogs,
  mergeWorklogsResponses,
  shiftMonthRange,
  canGoNextMonth,
  monthRange,
  currentMonthRange,
  type WorklogsResponse,
} from '../api';
import {
  addDaysIso,
  isRangeCoveredBySegments,
  mergeLoadedSegment,
  visibleWeekBounds,
  weekContaining,
  earlierWeekPrefetchChunk,
  shouldPrefetchEarlierWeeks,
  clampWeekWindowStart,
  weeksOnWindow,
  defaultWeekRange,
  defaultWeekWindowStart,
  type CalendarLayout,
  type LoadedSegment,
} from '../components/DayChip';
import type { WeekStart, WeekWindowWeeks } from '../settings';

type UseWorklogsProps = {
  from: string;
  to: string;
  setFrom: (f: string) => void;
  setTo: (t: string) => void;
  weekFocus: string;
  setWeekFocusAnchor: (w: string) => void;
  layout: CalendarLayout;
  weekStart: WeekStart;
  weekWindowWeeks: WeekWindowWeeks;
  authChecked: boolean;
  meExists: boolean;
  clearAuth: (msg: string) => void;
};

export function useWorklogs({
  from,
  to,
  setFrom,
  setTo,
  weekFocus,
  setWeekFocusAnchor,
  layout,
  weekStart,
  weekWindowWeeks,
  authChecked,
  meExists,
  clearAuth,
}: UseWorklogsProps) {
  const [data, setData] = useState<WorklogsResponse | null>(null);
  const [loadedSegments, setLoadedSegments] = useState<LoadedSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dataRef = useRef(data);
  dataRef.current = data;
  const loadedSegmentsRef = useRef(loadedSegments);
  loadedSegmentsRef.current = loadedSegments;
  const prefetchInFlight = useRef(new Set<string>());
  const loadGenerationRef = useRef(0);
  const prevWeekWindowWeeksRef = useRef(weekWindowWeeks);
  const hasInitializedRef = useRef(false);

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
          setData(null);
          setLoadedSegments([]);
          clearAuth('Session expired. Connect to Jira again.');
        }
      } finally {
        prefetchInFlight.current.delete(key);
      }
    },
    [mergeIntoCache, recordLoadedRange, clearAuth],
  );

  const load = useCallback(async (rangeFrom: string, rangeTo: string) => {
    const generation = ++loadGenerationRef.current;
    setLoading(true);
    setError(null);
    setFrom(rangeFrom);
    setTo(rangeTo);
    try {
      const result = await fetchWorklogs(rangeFrom, rangeTo);
      if (generation !== loadGenerationRef.current) return;
      setLoadedSegments([{ from: rangeFrom, to: rangeTo }]);
      setData(result);
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 401) {
        setData(null);
        setLoadedSegments([]);
        clearAuth('Session expired. Connect to Jira again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load worklogs');
      }
    } finally {
      if (generation === loadGenerationRef.current) {
        setLoading(false);
      }
    }
  }, [setFrom, setTo, clearAuth]);

  // Initial load effect
  useEffect(() => {
    if (!authChecked || !meExists || hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    if (layout === 'week') {
      const range = defaultWeekRange(weekStart, weekWindowWeeks);
      const windowStart = defaultWeekWindowStart(weekStart, weekWindowWeeks);
      setWeekFocusAnchor(windowStart);
      void load(range.from, range.to);
    } else {
      void load(from, to);
    }
  }, [authChecked, meExists, layout, weekStart, weekWindowWeeks, load, from, to, setWeekFocusAnchor]);

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
    [load, prefetchAdjacentMonths, prefetchRange, setFrom, setTo],
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
    [load, prefetchRange, setFrom, setTo],
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
    [weekFocus, weekStart, weekWindowWeeks, load, prefetchRange, setFrom, setTo, setWeekFocusAnchor],
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
    [load, weekStart, weekWindowWeeks, setWeekFocusAnchor],
  );

  // Sync settings/layout changes for week view
  useEffect(() => {
    if (layout !== 'week' || !authChecked || !meExists) return;
    if (prevWeekWindowWeeksRef.current === weekWindowWeeks) return;
    prevWeekWindowWeeksRef.current = weekWindowWeeks;
    const range = defaultWeekRange(weekStart, weekWindowWeeks);
    const windowStart = defaultWeekWindowStart(weekStart, weekWindowWeeks);
    setWeekFocusAnchor(windowStart);
    void load(range.from, range.to);
  }, [layout, authChecked, meExists, weekStart, weekWindowWeeks, load, setWeekFocusAnchor]);

  // Sync week focus prefetch
  useEffect(() => {
    if (layout !== 'week' || !data) return;

    const visible = visibleWeekBounds(weekFocus, weekStart, weekWindowWeeks);
    if (isRangeCoveredBySegments(loadedSegments, visible.from, visible.to)) return;
    void prefetchRange(visible.from, visible.to);
  }, [layout, data, weekFocus, weekStart, weekWindowWeeks, prefetchRange, loadedSegments]);

  // Sync prefetch earlier weeks
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
  }, [layout, data, weekFocus, weekStart, from, prefetchRange, setFrom]);

  // Sync month view prefetch
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
    if (layout === 'month') {
      let sum = 0;
      let cur = from;
      while (cur <= to) {
        sum += data.days[cur]?.totalSeconds ?? 0;
        cur = addDaysIso(cur, 1);
      }
      return sum;
    }
    const dates = weeksOnWindow(weekFocus, weekStart, weekWindowWeeks).flatMap((sun) =>
      weekContaining(sun, weekStart).dates,
    );
    return dates.reduce((sum, iso) => sum + (data.days[iso]?.totalSeconds ?? 0), 0);
  }, [data, layout, from, to, weekFocus, weekStart, weekWindowWeeks]);

  return {
    data,
    loading,
    error,
    loadedSegments,
    setLoadedSegments,
    setData,
    displayTotalSeconds,
    load,
    prefetchRange,
    syncMonthData,
    applyMonthRange,
    applyWeekRange,
    resetToTodayView,
  };
}
```

---

### Refactored Component: [App.tsx](file:///Users/lalit.kumar1/Projects/Work/Github/jira-assistant/apps/web/src/App.tsx)

```typescript
import { useCallback, useRef, useState } from 'react';
import { Header } from './components/Header';
import { Legend } from './components/Legend';
import { RangeBar } from './components/RangeBar';
import { LayoutSwitcher } from './components/LayoutSwitcher';
import { MonthView, WeekView, type MonthViewHandle } from './components/CalendarViews';
import { DayDrawer } from './components/DayDrawer';
import { SettingsPage } from './components/SettingsPage';
import { Button } from './components/ui/Button';
import { useSettings } from './SettingsContext';
import { useAuth } from './hooks/useAuth';
import { useCalendarNavigation } from './hooks/useCalendarNavigation';
import { useWorklogs } from './hooks/useWorklogs';
import {
  canGoNextMonth,
  monthRange,
  parseLocal,
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
  const { weekStart, weekWindowWeeks, showLegend, showFutureDays, weekSwipeEnabled } = settings;

  const [view, setView] = useState<AppView>('calendar');
  const monthViewRef = useRef<MonthViewHandle>(null);

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
              onGoToday={() => resetToTodayView('week')}
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
              onGoToday={() => resetToTodayView('month')}
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
            focusSunday={weekFocusAnchor}
            rangeFrom={layout === 'week' ? from : data?.from ?? from}
            rangeTo={layout === 'week' ? to : data?.to ?? to}
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
```

---

## 3. Key Improvements & Rationale

- **Decoupled Business Logic & State from View:**
  By delegating auth, calendar navigation, and worklog caching/fetching into custom hooks, the `App` component focuses purely on UI orchestration. This dramatically improves file readability and code organization.
- **Single Source of Truth for State:**
  States like `me` (Auth) and `loadedSegments` (Worklogs) no longer live side-by-side in a generic context. Each state now resides in a specialized boundary, making them much easier to trace and debug.
- **Testability:**
  Custom hooks can be tested in isolation (using `@testing-library/react-hooks` or similar tools) without having to mount the entire component tree, layout controllers, drawer elements, or styles.
- **Avoided Render Synchronization Hacks:**
  Component renders no longer execute arbitrary condition-based hooks directly on the rendering thread. The settings changes are handled inside cleaner navigation effects or cleanly within context transitions.
- **Improved Caching Hooks Coordination:**
  The coordination of page prefetching logic (for swipe transitions) is safely wrapped within a memoized caching context inside `useWorklogs`, avoiding stale closures or memory leak races across quick page clicks.

---

## 4. Long-Term Architecture & Future Scaling Considerations

Beyond the custom hooks extraction, the following improvements are recommended for long-term scalability and maintainability of the workspace:

### A. Shared Monorepo Package (`@jira-assistant/shared`)
* **Problem:** There is currently direct duplication of domain logic and types between `apps/api` and `apps/web` (e.g., `WorklogEntry`, `EstimateStatus`, `estimateStatus()`, `formatDuration()`).
* **Solution:** Extract shared types, formatting functions, and validation schemas into a separate package under the monorepo. This guarantees type safety across the backend/frontend network boundaries.

### B. Standardize Date Arithmetic (with `date-fns` or `dayjs`)
* **Problem:** The codebase relies heavily on native JavaScript date manipulations and manual string-split parsers (e.g. `iso.split('-')`), which are timezone-sensitive and error-prone.
* **Solution:** Standardize date operations on a declarative, timezone-safe date helper library like `date-fns` or `dayjs` for week/month calculations.

### C. Migrate to TanStack Query (React Query)
* **Problem:** The manual tracking of segment caching (`loadedSegments`), background pre-fetching sets, and generation refs (`loadGenerationRef`) inside `useWorklogs` requires significant custom logic.
* **Solution:** Replace custom caching hooks with TanStack Query. It manages request deduplication, memory garbage collection, loading/error states, and automated caching query keys natively.

### D. Introduce React Error Boundaries
* **Problem:** A malformed issue detail or date parsing error in calendar child components can crash the entire application viewport.
* **Solution:** Encapsulate calendar view nodes inside React Error Boundaries (`ErrorBoundary`) so that component-level render crashes fail gracefully without showing a blank page.

---

## 5. Next Steps

1. **Unit Testing:**
   Write unit tests for the extracted hooks (especially segment-merging cache checks in `useWorklogs`).
2. **Settings/Theming Context:**
   Verify if the settings/theme logic can also be encapsulated in a dedicated wrapper if configuration expands in the future.
3. **Verify API Limits:**
   Ensure chunking parameters (`MAX_RANGE_DAYS = 93`) remain compliant if Jira API updates its batch worklog size limits.
