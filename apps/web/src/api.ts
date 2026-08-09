import { toIso } from './lib/calendarDates';

export type Me = {
  accountId: string;
  displayName: string;
  siteName: string;
  siteUrl: string;
  avatarUrl?: string | null;
};

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

export type DayBucket = {
  totalSeconds: number;
  worklogs: WorklogEntry[];
};

export type WorklogsResponse = {
  from: string;
  to: string;
  totalSeconds: number;
  days: Record<string, DayBucket>;
};

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as { error?: string }).error || res.statusText || 'Request failed';
    throw Object.assign(new Error(message), { status: res.status });
  }
  return data as T;
}

export async function fetchMe(): Promise<Me | null> {
  const res = await fetch('/api/me', { credentials: 'include' });
  if (res.status === 401) return null;
  return parseJson<Me>(res);
}

export async function logout(): Promise<void> {
  await fetch('/api/logout', { method: 'POST', credentials: 'include' });
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h === 0 && m === 0) return '0h';
  if (m === 0) return `${h}h`;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function toIsoDate(d: Date): string {
  return toIso(d);
}

export function defaultRange(): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: toIsoDate(start), to: toIsoDate(now) };
}

/** Full calendar month for (year, monthIndex). Caps "to" at today for the current month. */
export function monthRange(year: number, monthIndex: number): { from: string; to: string } {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const toDate =
    year === today.getFullYear() && monthIndex === today.getMonth() && end > today ? today : end;
  return { from: toIsoDate(start), to: toIsoDate(toDate) };
}

/** Shift relative to the month of `fromIso` by `delta` months (-1 / +1). */
export function shiftMonthRange(fromIso: string, delta: number): { from: string; to: string } {
  const d = new Date(`${fromIso}T00:00:00`);
  return monthRange(d.getFullYear(), d.getMonth() + delta);
}

export function canGoNextMonth(fromIso: string): boolean {
  const d = new Date(`${fromIso}T00:00:00`);
  const today = new Date();
  return !(d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth());
}

export function isCurrentMonth(fromIso: string): boolean {
  const d = new Date(`${fromIso}T00:00:00`);
  const today = new Date();
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
}

/** ISO date of the 1st of the calendar month containing `fromIso`. */
export function monthAnchor(fromIso: string): string {
  const d = new Date(`${fromIso}T00:00:00`);
  return toIsoDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

/** Month anchors for a three-page window: previous, focus, next. */
export function monthWindowPages(focusAnchorIso: string): string[] {
  const anchor = monthAnchor(focusAnchorIso);
  return [
    shiftMonthRange(anchor, -1).from,
    anchor,
    shiftMonthRange(anchor, 1).from,
  ];
}

/** Signed month count from `fromAnchorIso` to `toAnchorIso`. */
export function monthDelta(fromAnchorIso: string, toAnchorIso: string): number {
  const from = new Date(`${monthAnchor(fromAnchorIso)}T00:00:00`);
  const to = new Date(`${monthAnchor(toAnchorIso)}T00:00:00`);
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

/** Inclusive month anchors from `fromAnchorIso` through `toAnchorIso`. */
export function monthAnchorsSpan(fromAnchorIso: string, toAnchorIso: string): string[] {
  const from = monthAnchor(fromAnchorIso);
  const to = monthAnchor(toAnchorIso);
  const delta = monthDelta(from, to);
  if (delta === 0) return [from];
  const step = delta > 0 ? 1 : -1;
  const anchors: string[] = [];
  for (let i = 0; i <= Math.abs(delta); i++) {
    anchors.push(shiftMonthRange(from, step * i).from);
  }
  return anchors;
}

/** Current calendar month, capped at today. */
export function currentMonthRange(): { from: string; to: string } {
  const today = new Date();
  return monthRange(today.getFullYear(), today.getMonth());
}

/** Full previous calendar month. */
export function lastMonthRange(): { from: string; to: string } {
  const today = new Date();
  return monthRange(today.getFullYear(), today.getMonth() - 1);
}

export const ROLLING_RANGE_7_DAYS = 7;
export const ROLLING_RANGE_30_DAYS = 30;

/** Inclusive rolling window ending today (e.g. 7 → today and the prior 6 days). */
export function lastNDaysRange(days: number): { from: string; to: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = new Date(today);
  from.setDate(from.getDate() - (days - 1));
  return { from: toIsoDate(from), to: toIsoDate(today) };
}

export function isSameRange(
  from: string,
  to: string,
  range: { from: string; to: string },
): boolean {
  return from === range.from && to === range.to;
}

export function spanDays(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000) + 1;
}

export function rangeLabelParts(from: string, to: string): { year: string; range: string } {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  const year =
    a.getFullYear() === b.getFullYear()
      ? String(a.getFullYear())
      : `${a.getFullYear()} – ${b.getFullYear()}`;
  const day = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (from === to) return { year, range: day(a) };
  return { year, range: `${day(a)} – ${day(b)}` };
}

export const MAX_RANGE_DAYS = 93;

function addDays(from: string, days: number): string {
  const d = new Date(`${from}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

/** Split an inclusive range into API-sized chunks (max 93 days each). */
export function splitDateRange(
  from: string,
  to: string,
  maxDays = MAX_RANGE_DAYS,
): Array<{ from: string; to: string }> {
  if (spanDays(from, to) <= maxDays) return [{ from, to }];

  const chunks: Array<{ from: string; to: string }> = [];
  let curFrom = from;
  while (curFrom <= to) {
    const chunkTo = addDays(curFrom, maxDays - 1);
    const boundedTo = chunkTo > to ? to : chunkTo;
    chunks.push({ from: curFrom, to: boundedTo });
    curFrom = addDays(boundedTo, 1);
  }
  return chunks;
}

export function mergeWorklogsResponses(responses: WorklogsResponse[]): WorklogsResponse {
  if (responses.length === 0) {
    return { from: '', to: '', totalSeconds: 0, days: {} };
  }
  if (responses.length === 1) return responses[0];

  let from = responses[0].from;
  let to = responses[0].to;
  const days: Record<string, DayBucket> = {};

  for (const response of responses) {
    if (response.from < from) from = response.from;
    if (response.to > to) to = response.to;
    for (const [iso, bucket] of Object.entries(response.days)) {
      days[iso] = bucket;
    }
  }

  let totalSeconds = 0;
  for (const bucket of Object.values(days)) {
    totalSeconds += bucket.totalSeconds;
  }

  return { from, to, totalSeconds, days };
}

async function fetchWorklogsSingle(from: string, to: string): Promise<WorklogsResponse> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const params = new URLSearchParams({ from, to, tz });
  const res = await fetch(`/api/worklogs?${params}`, {
    credentials: 'include',
    headers: { 'X-Timezone': tz },
  });
  return parseJson<WorklogsResponse>(res);
}

export async function fetchWorklogs(from: string, to: string): Promise<WorklogsResponse> {
  const chunks = splitDateRange(from, to);
  if (chunks.length === 1) return fetchWorklogsSingle(chunks[0].from, chunks[0].to);
  const results = await Promise.all(
    chunks.map((chunk) => fetchWorklogsSingle(chunk.from, chunk.to)),
  );
  return mergeWorklogsResponses(results);
}
