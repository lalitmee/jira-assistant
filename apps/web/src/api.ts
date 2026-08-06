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

export async function fetchWorklogs(from: string, to: string): Promise<WorklogsResponse> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const params = new URLSearchParams({ from, to, tz });
  const res = await fetch(`/api/worklogs?${params}`, {
    credentials: 'include',
    headers: { 'X-Timezone': tz },
  });
  return parseJson<WorklogsResponse>(res);
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
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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
    year === today.getFullYear() && monthIndex === today.getMonth() && end > today
      ? today
      : end;
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

export function spanDays(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000) + 1;
}

export const MAX_RANGE_DAYS = 93;
