import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ROLLING_RANGE_7_DAYS,
  ROLLING_RANGE_30_DAYS,
  currentMonthRange,
  isSameRange,
  lastMonthRange,
  lastNDaysRange,
} from './api';
import { laterWeekPrefetchChunk, shouldPrefetchLaterWeeks } from './lib/calendarDates';

describe('lastNDaysRange', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-09T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns an inclusive window ending today', () => {
    expect(lastNDaysRange(ROLLING_RANGE_7_DAYS)).toEqual({
      from: '2026-08-03',
      to: '2026-08-09',
    });
    expect(lastNDaysRange(ROLLING_RANGE_30_DAYS)).toEqual({
      from: '2026-07-11',
      to: '2026-08-09',
    });
  });
});

describe('shouldPrefetchLaterWeeks', () => {
  const rangeFrom = '2026-07-11';
  const rangeTo = '2026-08-09';

  it('returns true when focus is within the trailing edge of the range', () => {
    expect(shouldPrefetchLaterWeeks('2026-08-02', rangeFrom, rangeTo, 'sunday')).toBe(true);
    expect(shouldPrefetchLaterWeeks('2026-07-26', rangeFrom, rangeTo, 'sunday')).toBe(true);
  });

  it('returns false when focus is far from the range end', () => {
    expect(shouldPrefetchLaterWeeks('2026-07-12', rangeFrom, rangeTo, 'sunday')).toBe(false);
  });
});

describe('laterWeekPrefetchChunk', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-09T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('prefetches from the day after the visible window through the range end', () => {
    expect(
      laterWeekPrefetchChunk('2026-08-02', '2026-07-11', '2026-08-09', 'sunday', 1),
    ).toEqual({ from: '2026-08-09', to: '2026-08-09' });
  });

  it('returns null when the visible window already reaches the range end', () => {
    expect(
      laterWeekPrefetchChunk('2026-08-09', '2026-07-11', '2026-08-09', 'sunday', 1),
    ).toBeNull();
  });
});

describe('isSameRange', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-09T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('matches preset ranges exactly', () => {
    const month = currentMonthRange();
    expect(isSameRange(month.from, month.to, month)).toBe(true);
    expect(isSameRange('2026-08-01', '2026-08-08', month)).toBe(false);

    const lastMonth = lastMonthRange();
    expect(isSameRange(lastMonth.from, lastMonth.to, lastMonth)).toBe(true);
  });
});
