import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertDateRange,
  estimateStatus,
  formatDuration,
  groupWorklogsByDay,
  MAX_RANGE_DAYS,
  withIssueTotals,
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
          devEstHours: null,
          myTotalSeconds: 3600,
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

describe('estimateStatus', () => {
  it('classifies against Dev Est', () => {
    assert.equal(estimateStatus(null, 3600), 'none');
    assert.equal(estimateStatus(0, 3600), 'none');
    assert.equal(estimateStatus(2, 7200), 'exact');
    assert.equal(estimateStatus(2, 7300), 'over');
    assert.equal(estimateStatus(2, 7000), 'under');
  });
});

describe('withIssueTotals', () => {
  it('sums all entries per issue', () => {
    const enriched = withIssueTotals([
      {
        id: '1',
        issueKey: 'A-1',
        issueSummary: 'A',
        started: '2026-08-05T10:00:00.000+0530',
        timeSpentSeconds: 3600,
        comment: null,
        devEstHours: 3,
        myTotalSeconds: 0,
      },
      {
        id: '2',
        issueKey: 'A-1',
        issueSummary: 'A',
        started: '2026-08-06T10:00:00.000+0530',
        timeSpentSeconds: 1800,
        comment: null,
        devEstHours: 3,
        myTotalSeconds: 0,
      },
    ]);
    assert.equal(enriched[0].myTotalSeconds, 5400);
    assert.equal(enriched[1].myTotalSeconds, 5400);
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
