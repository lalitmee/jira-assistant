import { useState, useCallback } from 'react';
import {
  clampWeekWindowStart,
  weekContaining,
} from '../components/DayChip';
import {
  loadSettings,
  rangeForLayout,
  weekFocusForLayout,
  type WeekStart,
  type WeekWindowWeeks,
} from '../settings';

export function useCalendarNavigation(weekStart: WeekStart, weekWindowWeeks: WeekWindowWeeks) {
  const [initial] = useState(() => {
    const settings = loadSettings();
    return {
      range: rangeForLayout(
        settings.layout,
        settings.startupRange,
        weekStart,
        weekWindowWeeks,
        settings.showFutureDays,
      ),
      focus: weekFocusForLayout(weekStart, weekWindowWeeks),
    };
  });

  const [from, setFrom] = useState(initial.range.from);
  const [to, setTo] = useState(initial.range.to);
  const [selected, setSelected] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [weekFocusAnchor, setWeekFocusAnchor] = useState(initial.focus);
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
