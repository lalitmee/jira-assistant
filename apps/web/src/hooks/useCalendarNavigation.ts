import { useState, useCallback } from 'react';
import {
  clampWeekWindowStart,
  weekContaining,
} from '../components/DayChip';
import {
  rangeForStartup,
  weekFocusForStartup,
  type WeekStart,
  type WeekWindowWeeks,
} from '../settings';

export function useCalendarNavigation(weekStart: WeekStart, weekWindowWeeks: WeekWindowWeeks) {
  const initial = rangeForStartup('month-to-date', weekStart, weekWindowWeeks, true);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [selected, setSelected] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [weekFocusAnchor, setWeekFocusAnchor] = useState(() =>
    weekFocusForStartup('month-to-date', weekStart, weekWindowWeeks),
  );
  const [prevWeekStart, setPrevWeekStart] = useState(weekStart);

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

  const applyStartupRange = useCallback(
    (
      startupRange: Parameters<typeof rangeForStartup>[0],
      showFutureDays: boolean,
    ) => {
      const range = rangeForStartup(startupRange, weekStart, weekWindowWeeks, showFutureDays);
      setFrom(range.from);
      setTo(range.to);
      setWeekFocusAnchor(weekFocusForStartup(startupRange, weekStart, weekWindowWeeks));
    },
    [weekStart, weekWindowWeeks],
  );

  return {
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
    applyStartupRange,
  };
}
