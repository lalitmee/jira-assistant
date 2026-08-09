import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  fetchWorklogs,
  mergeWorklogsResponses,
  shiftMonthRange,
  canGoNextMonth,
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
  laterWeekPrefetchChunk,
  shouldPrefetchEarlierWeeks,
  shouldPrefetchLaterWeeks,
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

  // Sync prefetch later weeks (trailing edge of selected range)
  useEffect(() => {
    if (layout !== 'week' || !data) return;

    if (!shouldPrefetchLaterWeeks(weekFocus, from, to, weekStart)) return;

    const chunk = laterWeekPrefetchChunk(weekFocus, from, to, weekStart, weekWindowWeeks);
    if (!chunk) return;

    void prefetchRange(chunk.from, chunk.to);
  }, [layout, data, weekFocus, weekStart, weekWindowWeeks, from, to, prefetchRange]);

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
    prefetchRange,
    syncMonthData,
    applyMonthRange,
    applyWeekRange,
    resetToTodayView,
  };
}
