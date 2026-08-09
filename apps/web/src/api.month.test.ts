import { describe, expect, it } from 'vitest';
import { monthAnchorsSpan, monthAnchor } from './api';

describe('monthAnchorsSpan', () => {
  it('returns a single anchor when from and to are the same month', () => {
    expect(monthAnchorsSpan('2026-05-01', '2026-05-15')).toEqual(['2026-05-01']);
  });

  it('returns inclusive forward month anchors', () => {
    expect(monthAnchorsSpan('2026-05-01', '2026-08-01')).toEqual([
      '2026-05-01',
      '2026-06-01',
      '2026-07-01',
      '2026-08-01',
    ]);
  });

  it('returns inclusive backward month anchors', () => {
    expect(monthAnchorsSpan('2026-08-01', '2026-05-01')).toEqual([
      '2026-08-01',
      '2026-07-01',
      '2026-06-01',
      '2026-05-01',
    ]);
  });

  it('normalizes arbitrary dates to month anchors', () => {
    const today = monthAnchor('2026-08-09');
    expect(monthAnchorsSpan('2026-05-12', today).at(-1)).toBe(today);
  });
});
