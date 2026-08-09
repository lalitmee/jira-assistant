import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWorklogs, type DayBucket, type WorklogsResponse } from '../api';
import { useWorklogs } from './useWorklogs';

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api')>();
  return {
    ...actual,
    fetchWorklogs: vi.fn(),
  };
});

const mockedFetchWorklogs = vi.mocked(fetchWorklogs);

function makeWorklogs(from: string, to: string, secondsByDay: Record<string, number>): WorklogsResponse {
  const days: Record<string, DayBucket> = {};
  let totalSeconds = 0;

  for (const [iso, total] of Object.entries(secondsByDay)) {
    days[iso] = { totalSeconds: total, worklogs: [] };
    totalSeconds += total;
  }

  return { from, to, totalSeconds, days };
}

function renderWorklogsHook(overrides: Partial<Parameters<typeof useWorklogs>[0]> = {}) {
  const setFrom = vi.fn();
  const setTo = vi.fn();
  const setWeekFocusAnchor = vi.fn();
  const clearAuth = vi.fn();

  const props = {
    from: '2026-08-01',
    to: '2026-08-31',
    setFrom,
    setTo,
    weekFocus: '2026-08-03',
    setWeekFocusAnchor,
    layout: 'month' as const,
    weekStart: 'sunday' as const,
    weekWindowWeeks: 1 as const,
    authChecked: true,
    meExists: true,
    clearAuth,
    ...overrides,
  };

  const hook = renderHook(() => useWorklogs(props));

  return { ...hook, setFrom, setTo, setWeekFocusAnchor, clearAuth, props };
}

describe('useWorklogs', () => {
  beforeEach(() => {
    mockedFetchWorklogs.mockReset();
  });

  it('loads worklogs when auth is ready', async () => {
    mockedFetchWorklogs.mockResolvedValue(
      makeWorklogs('2026-08-01', '2026-08-31', { '2026-08-05': 3600 }),
    );

    const { result, props } = renderWorklogsHook();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockedFetchWorklogs).toHaveBeenCalledWith(props.from, props.to);
    expect(result.current.data?.days['2026-08-05']?.totalSeconds).toBe(3600);
  });

  it('skips prefetch when the requested range is already covered', async () => {
    mockedFetchWorklogs.mockResolvedValue(
      makeWorklogs('2026-08-01', '2026-08-31', { '2026-08-05': 3600 }),
    );

    const { result } = renderWorklogsHook();

    await waitFor(() => expect(result.current.data).not.toBeNull());

    mockedFetchWorklogs.mockClear();

    await act(async () => {
      await result.current.prefetchRange('2026-08-05', '2026-08-10');
    });

    expect(mockedFetchWorklogs).not.toHaveBeenCalled();
  });

  it('reuses cached data for applyMonthRange without a full reload', async () => {
    mockedFetchWorklogs.mockResolvedValue(
      makeWorklogs('2026-08-01', '2026-08-31', {
        '2026-08-05': 3600,
        '2026-08-06': 1800,
      }),
    );

    const { result, setFrom, setTo } = renderWorklogsHook();

    await waitFor(() => expect(result.current.data).not.toBeNull());

    mockedFetchWorklogs.mockClear();

    act(() => {
      result.current.applyMonthRange('2026-08-05', '2026-08-10');
    });

    expect(setFrom).toHaveBeenCalledWith('2026-08-05');
    expect(setTo).toHaveBeenCalledWith('2026-08-10');
    expect(mockedFetchWorklogs).not.toHaveBeenCalled();
    expect(result.current.data?.days['2026-08-05']?.totalSeconds).toBe(3600);
  });

  it('calls clearAuth when load receives a 401', async () => {
    mockedFetchWorklogs.mockRejectedValue(Object.assign(new Error('Unauthorized'), { status: 401 }));

    const { result, clearAuth } = renderWorklogsHook();

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(clearAuth).toHaveBeenCalledWith('Session expired. Connect to Jira again.');
    expect(result.current.data).toBeNull();
  });

  it('sums displayTotalSeconds for the visible month range', async () => {
    mockedFetchWorklogs.mockResolvedValue(
      makeWorklogs('2026-08-01', '2026-08-31', {
        '2026-08-05': 3600,
        '2026-08-06': 1800,
        '2026-08-20': 900,
      }),
    );

    const { result } = renderWorklogsHook({
      from: '2026-08-05',
      to: '2026-08-06',
    });

    await waitFor(() => expect(result.current.data).not.toBeNull());

    expect(result.current.displayTotalSeconds).toBe(5400);
  });
});
