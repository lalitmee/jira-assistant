export const MAX_RANGE_DAYS = 93;

/** Jira custom field: Dev Est in Hrs (float hours). */
export const DEV_EST_FIELD = 'customfield_10301';

export type WorklogEntry = {
  id: string;
  issueKey: string;
  issueSummary: string;
  started: string;
  timeSpentSeconds: number;
  comment: string | null;
  /** Dev Est in hours; null when missing or zero. */
  devEstHours: number | null;
  /** Current user's total logged seconds on this issue (all time). */
  myTotalSeconds: number;
};

export type DayBucket = {
  totalSeconds: number;
  worklogs: WorklogEntry[];
};

export type EstimateStatus = 'none' | 'under' | 'exact' | 'over';

export function estimateStatus(
  devEstHours: number | null | undefined,
  myTotalSeconds: number,
): EstimateStatus {
  if (devEstHours == null || !(devEstHours > 0)) return 'none';
  const estSeconds = Math.round(devEstHours * 3600);
  if (myTotalSeconds === estSeconds) return 'exact';
  if (myTotalSeconds > estSeconds) return 'over';
  return 'under';
}

export function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  if (d.toISOString().slice(0, 10) !== value) return null;
  return d;
}

export function assertDateRange(from: string, to: string): { from: string; to: string } {
  const fromDate = parseIsoDate(from);
  const toDate = parseIsoDate(to);
  if (!fromDate || !toDate) {
    throw Object.assign(new Error('from and to must be YYYY-MM-DD'), { status: 400 });
  }
  if (fromDate.getTime() > toDate.getTime()) {
    throw Object.assign(new Error('from must be on or before to'), { status: 400 });
  }
  const spanDays = Math.floor((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1;
  if (spanDays > MAX_RANGE_DAYS) {
    throw Object.assign(
      new Error(`Date range cannot exceed ${MAX_RANGE_DAYS} days`),
      { status: 400 },
    );
  }
  return { from, to };
}

/** Local calendar YYYY-MM-DD for an instant in a given IANA timezone. */
export function localDateKey(isoInstant: string, timeZone: string): string {
  const d = new Date(isoInstant);
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  if (!y || !m || !day) return '';
  return `${y}-${m}-${day}`;
}

/** Sum each author's issue totals onto every entry for that issue. */
export function withIssueTotals(entries: WorklogEntry[]): WorklogEntry[] {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    totals.set(entry.issueKey, (totals.get(entry.issueKey) || 0) + entry.timeSpentSeconds);
  }
  return entries.map((entry) => ({
    ...entry,
    myTotalSeconds: totals.get(entry.issueKey) || 0,
  }));
}

export function groupWorklogsByDay(
  entries: WorklogEntry[],
  from: string,
  to: string,
  timeZone: string,
): { totalSeconds: number; days: Record<string, DayBucket> } {
  const days: Record<string, DayBucket> = {};
  let totalSeconds = 0;

  for (const entry of entries) {
    const key = localDateKey(entry.started, timeZone);
    if (!key || key < from || key > to) continue;
    if (!days[key]) days[key] = { totalSeconds: 0, worklogs: [] };
    days[key].totalSeconds += entry.timeSpentSeconds;
    days[key].worklogs.push(entry);
    totalSeconds += entry.timeSpentSeconds;
  }

  for (const bucket of Object.values(days)) {
    bucket.worklogs.sort((a, b) => a.started.localeCompare(b.started));
  }

  return { totalSeconds, days };
}

export function eachDateInclusive(from: string, to: string): string[] {
  const out: string[] = [];
  const cur = parseIsoDate(from);
  const end = parseIsoDate(to);
  if (!cur || !end) return out;
  while (cur.getTime() <= end.getTime()) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h === 0 && m === 0) return '0h';
  if (m === 0) return `${h}h`;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}
