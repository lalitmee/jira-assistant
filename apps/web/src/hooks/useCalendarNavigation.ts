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
    drawerOpen,
    weekFocusAnchor,
    setWeekFocusAnchor,
    openDay,
    closeDay,
  };
}
