import { describe, expect, it } from 'vitest';
import { isRangeCoveredBySegments, mergeLoadedSegment } from './DayChip';

describe('mergeLoadedSegment', () => {
  it('merges overlapping and adjacent segments', () => {
    const merged = mergeLoadedSegment(
      [{ from: '2026-08-01', to: '2026-08-07' }],
      '2026-08-05',
      '2026-08-14',
    );

    expect(merged).toEqual([{ from: '2026-08-01', to: '2026-08-14' }]);
  });

  it('keeps non-adjacent segments separate', () => {
    const merged = mergeLoadedSegment(
      [{ from: '2026-08-01', to: '2026-08-07' }],
      '2026-08-10',
      '2026-08-14',
    );

    expect(merged).toEqual([
      { from: '2026-08-01', to: '2026-08-07' },
      { from: '2026-08-10', to: '2026-08-14' },
    ]);
  });

  it('ignores invalid ranges', () => {
    const segments = [{ from: '2026-08-01', to: '2026-08-07' }];
    expect(mergeLoadedSegment(segments, '2026-08-10', '2026-08-05')).toEqual(segments);
  });
});

describe('isRangeCoveredBySegments', () => {
  it('returns true when every day in the range is covered', () => {
    const segments = [
      { from: '2026-08-01', to: '2026-08-07' },
      { from: '2026-08-10', to: '2026-08-14' },
    ];

    expect(isRangeCoveredBySegments(segments, '2026-08-03', '2026-08-05')).toBe(true);
    expect(isRangeCoveredBySegments(segments, '2026-08-10', '2026-08-12')).toBe(true);
  });

  it('returns false when a gap exists in the range', () => {
    const segments = [
      { from: '2026-08-01', to: '2026-08-07' },
      { from: '2026-08-10', to: '2026-08-14' },
    ];

    expect(isRangeCoveredBySegments(segments, '2026-08-01', '2026-08-10')).toBe(false);
  });

  it('returns false for empty segment lists', () => {
    expect(isRangeCoveredBySegments([], '2026-08-01', '2026-08-07')).toBe(false);
  });

  it('returns true for inverted ranges', () => {
    expect(isRangeCoveredBySegments([], '2026-08-10', '2026-08-01')).toBe(true);
  });
});
