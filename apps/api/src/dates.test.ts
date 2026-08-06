import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertDateRange,
  formatDuration,
  groupWorklogsByDay,
  MAX_RANGE_DAYS,
} from './dates.js';

describe('assertDateRange', () => {
  it('accepts a valid range', () => {
    assert.deepEqual(assertDateRange('2026-08-01', '2026-08-06'), {
      from: '2026-08-01',
      to: '2026-08-06',
    });
  });

  it('rejects inverted range', () => {
    assert.throws(() => assertDateRange('2026-08-10', '2026-08-01'), /from must be/);
  });

  it('rejects overlong range', () => {
    assert.throws(
      () => assertDateRange('2026-01-01', '2026-05-01'),
      new RegExp(String(MAX_RANGE_DAYS)),
    );
  });
});

describe('groupWorklogsByDay', () => {
  it('groups by local date in timezone', () => {
    const result = groupWorklogsByDay(
      [
        {
          id: '1',
          issueKey: 'ABC-1',
          issueSummary: 'Test',
          started: '2026-08-05T18:30:00.000+0530',
          timeSpentSeconds: 3600,
          comment: null,
        },
      ],
      '2026-08-01',
      '2026-08-31',
      'Asia/Kolkata',
    );
    assert.equal(result.totalSeconds, 3600);
    assert.ok(result.days['2026-08-05']);
    assert.equal(result.days['2026-08-05'].totalSeconds, 3600);
  });
});

describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    assert.equal(formatDuration(0), '0h');
    assert.equal(formatDuration(3600), '1h');
    assert.equal(formatDuration(5400), '1h 30m');
    assert.equal(formatDuration(600), '10m');
  });
});
