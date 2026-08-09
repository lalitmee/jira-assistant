import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { WeekStart } from '../settings';
import { useCalendarNavigation } from './useCalendarNavigation';

describe('useCalendarNavigation', () => {
  it('opens and closes the day drawer', () => {
    const { result } = renderHook(() => useCalendarNavigation('sunday', 1));

    act(() => {
      result.current.openDay('2026-08-05');
    });

    expect(result.current.selected).toBe('2026-08-05');
    expect(result.current.drawerOpen).toBe(true);

    act(() => {
      result.current.closeDay();
    });

    expect(result.current.selected).toBeNull();
    expect(result.current.drawerOpen).toBe(false);
  });

  it('realigns week focus when weekStart setting changes', () => {
    const { result, rerender } = renderHook(
      ({ weekStart }: { weekStart: WeekStart }) => useCalendarNavigation(weekStart, 1),
      { initialProps: { weekStart: 'sunday' as WeekStart } },
    );

    const initialFocus = result.current.weekFocusAnchor;

    rerender({ weekStart: 'monday' });

    expect(result.current.weekFocusAnchor).not.toBe(initialFocus);
  });
});
