import type { DayBucket, WorklogEntry } from '../api';
import { estimateStatus, formatDuration } from '../api';
import { hoursStatus, parseLocal } from './DayChip';

type Props = {
  open: boolean;
  date: string | null;
  bucket: DayBucket | undefined;
  siteUrl: string;
  onClose: () => void;
};

type IssueGroup = {
  issueKey: string;
  issueSummary: string;
  totalSeconds: number;
  worklogs: WorklogEntry[];
  devEstHours: number | null;
  myTotalSeconds: number;
};

function issueUrl(siteUrl: string, key: string): string {
  const base = siteUrl.replace(/\/$/, '');
  return `${base}/browse/${key}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function groupByIssue(worklogs: WorklogEntry[]): IssueGroup[] {
  const map = new Map<string, IssueGroup>();
  for (const wl of worklogs) {
    const existing = map.get(wl.issueKey);
    if (existing) {
      existing.totalSeconds += wl.timeSpentSeconds;
      existing.worklogs.push(wl);
    } else {
      map.set(wl.issueKey, {
        issueKey: wl.issueKey,
        issueSummary: wl.issueSummary,
        totalSeconds: wl.timeSpentSeconds,
        worklogs: [wl],
        devEstHours: wl.devEstHours ?? null,
        myTotalSeconds: wl.myTotalSeconds ?? 0,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.totalSeconds - a.totalSeconds);
}

function drawerStatusClass(date: string | null, bucket: DayBucket | undefined): string {
  if (!date) return '';
  const weekday = parseLocal(date).getDay();
  const isWeekend = weekday === 0 || weekday === 6;
  const status = hoursStatus(bucket?.totalSeconds ?? 0, isWeekend);
  if (status === 'ok') return 'hours-ok';
  if (status === 'under') return 'hours-bad';
  if (status === 'over') return 'hours-over';
  return 'hours-weekend';
}

function estimateClass(group: IssueGroup): string {
  const status = estimateStatus(group.devEstHours, group.myTotalSeconds);
  if (status === 'exact') return 'est-exact';
  if (status === 'over') return 'est-over';
  if (status === 'under') return 'est-under';
  return 'est-none';
}

function formatLoggedVsEst(group: IssueGroup): { logged: string; est: string } {
  const logged = formatDuration(group.myTotalSeconds);
  if (group.devEstHours == null || !(group.devEstHours > 0)) return { logged, est: '—' };
  return { logged, est: formatDuration(Math.round(group.devEstHours * 3600)) };
}

export function DayDrawer({ open, date, bucket, siteUrl, onClose }: Props) {
  const worklogs = bucket?.worklogs ?? [];
  const total = bucket?.totalSeconds ?? 0;
  const groups = groupByIssue(worklogs);
  const statusClass = drawerStatusClass(date, bucket);
  const label = date
    ? new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <>
      <div
        className={`drawer-backdrop${open ? ' open' : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={`drawer${open ? ' open' : ''}${statusClass ? ` ${statusClass}` : ''}`}
        aria-hidden={!open}
        aria-label="Day details"
      >
        <div className="drawer-header">
          <div className="drawer-header-text">
            <p className="drawer-kicker">Day details</p>
            <h3>{label || 'Select a day'}</h3>
            {date ? (
              <div className="drawer-stats">
                <span className="drawer-stat">
                  <strong>{formatDuration(total)}</strong>
                  <span>total</span>
                </span>
                <span className="drawer-stat-sep" aria-hidden>
                  ·
                </span>
                <span className="drawer-stat">
                  <strong>{worklogs.length}</strong>
                  <span>{worklogs.length === 1 ? 'entry' : 'entries'}</span>
                </span>
                <span className="drawer-stat-sep" aria-hidden>
                  ·
                </span>
                <span className="drawer-stat">
                  <strong>{groups.length}</strong>
                  <span>{groups.length === 1 ? 'issue' : 'issues'}</span>
                </span>
              </div>
            ) : null}
          </div>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="drawer-body">
          {!date ? (
            <p className="drawer-empty">Select a day to review worklogs.</p>
          ) : worklogs.length === 0 ? (
            <p className="drawer-empty">No worklogs this day.</p>
          ) : (
            <div className="issue-list">
              {groups.map((group) => {
                const { logged, est } = formatLoggedVsEst(group);
                const hasEst = group.devEstHours != null && group.devEstHours > 0;
                return (
                <article className={`issue-card ${estimateClass(group)}`} key={group.issueKey}>
                  <div className="issue-card-top">
                    <header className="issue-card-header">
                      <a
                        className="issue-key"
                        href={issueUrl(siteUrl, group.issueKey)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {group.issueKey}
                      </a>
                      <span className="issue-total" title={hasEst ? 'Logged / Dev Est' : 'Logged / no Dev Est'}>
                        <span className="issue-total-logged">{logged}</span>
                        <span className="issue-total-sep" aria-hidden>
                          /
                        </span>
                        <span className="issue-total-est">{est}</span>
                      </span>
                    </header>
                    <h4 className="issue-summary">{group.issueSummary}</h4>
                  </div>

                  <ul className="entry-list">
                    {group.worklogs.map((wl) => (
                      <li className="entry-row" key={wl.id}>
                        <div className="entry-time-col">
                          <span className="entry-duration">{formatDuration(wl.timeSpentSeconds)}</span>
                          <span className="entry-clock">{formatTime(wl.started)}</span>
                        </div>
                        <p className="entry-comment">
                          {wl.comment || <span className="entry-comment-empty">No comment</span>}
                        </p>
                      </li>
                    ))}
                  </ul>
                </article>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
