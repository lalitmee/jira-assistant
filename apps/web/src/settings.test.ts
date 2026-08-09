import { describe, expect, it } from 'vitest';
import { hoursStatus } from './components/DayChip';
import { formatDuration } from './api';
import {
  auditConfigFromSettings,
  clampAuditHours,
  DEFAULT_SETTINGS,
  formatAuditBandLabel,
  formatOverAuditLabel,
  formatUnderAuditLabel,
  rangeForStartup,
  resolveReducedMotion,
  resolveTheme,
} from './settings';

describe('settings v3 helpers', () => {
  it('clamps audit hours and swaps when min exceeds max', () => {
    expect(clampAuditHours(9, 7)).toEqual({ minHours: 7, maxHours: 9 });
    expect(clampAuditHours(0, 15)).toEqual({ minHours: 1, maxHours: 12 });
  });

  it('builds audit config from settings', () => {
    const audit = auditConfigFromSettings({
      ...DEFAULT_SETTINGS,
      auditMinHours: 7,
      auditMaxHours: 9,
      auditWeekends: true,
    });
    expect(audit).toEqual({ minHours: 7, maxHours: 9, auditWeekends: true });
  });

  it('formats audit legend labels from hours', () => {
    expect(formatAuditBandLabel(7, 9)).toBe('7h–9h');
    expect(formatUnderAuditLabel(7)).toBe('Under 7h');
    expect(formatOverAuditLabel(9)).toBe('Over 9h');
  });

  it('resolves theme preference', () => {
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('dark')).toBe('dark');
  });

  it('resolves reduced motion preference', () => {
    expect(resolveReducedMotion('reduce')).toBe(true);
    expect(resolveReducedMotion('no-preference')).toBe(false);
  });

  it('computes startup range for current week', () => {
    const range = rangeForStartup('current-week', 'sunday', 1, true);
    expect(range.from <= range.to).toBe(true);
  });
});

describe('hoursStatus with audit config', () => {
  const audit = { minHours: 7, maxHours: 9, auditWeekends: false };

  it('marks in-band weekday hours as ok', () => {
    expect(hoursStatus(7.5 * 3600, false, audit)).toBe('ok');
  });

  it('skips weekends when auditWeekends is false', () => {
    expect(hoursStatus(8 * 3600, true, audit)).toBe('skip');
  });

  it('audits weekends when enabled', () => {
    expect(hoursStatus(8 * 3600, true, { ...audit, auditWeekends: true })).toBe('ok');
  });
});

describe('formatDuration', () => {
  it('formats decimal hours', () => {
    expect(formatDuration(7.5 * 3600, 'decimal')).toBe('7.5h');
    expect(formatDuration(0, 'decimal')).toBe('0h');
  });

  it('formats hm style by default', () => {
    expect(formatDuration(7.5 * 3600)).toBe('7h 30m');
  });
});
