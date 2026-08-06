import { ATLASSIAN_SCOPES, env } from './env.js';
import type { SessionData } from './session.js';
import {
  assertDateRange,
  DEV_EST_FIELD,
  groupWorklogsByDay,
  withIssueTotals,
  type WorklogEntry,
} from './dates.js';

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
};

type AccessibleResource = {
  id: string;
  url: string;
  name: string;
  scopes: string[];
};

type JiraMyself = {
  accountId: string;
  displayName: string;
  avatarUrls?: {
    '16x16'?: string;
    '24x24'?: string;
    '32x32'?: string;
    '48x48'?: string;
  };
};

export function pickAvatarUrl(myself: JiraMyself): string | undefined {
  const urls = myself.avatarUrls;
  if (!urls) return undefined;
  return urls['48x48'] || urls['32x32'] || urls['24x24'] || urls['16x16'];
}

type JiraIssue = {
  id: string;
  key: string;
  fields?: {
    summary?: string;
    worklog?: {
      startAt: number;
      maxResults: number;
      total: number;
      worklogs: JiraWorklog[];
    };
    customfield_10301?: number | null;
  };
};

type JiraWorklog = {
  id: string;
  started: string;
  timeSpentSeconds: number;
  comment?: unknown;
  author?: { accountId?: string };
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(url: string, init: RequestInit, attempts = 3): Promise<Response> {
  let last: Response | null = null;
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(url, init);
    if (res.status !== 429) return res;
    last = res;
    const retryAfter = Number(res.headers.get('retry-after') || '1');
    await sleep(Math.min(Math.max(retryAfter, 1), 5) * 1000);
  }
  return last!;
}

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    audience: 'api.atlassian.com',
    client_id: env.atlassianClientId,
    scope: ATLASSIAN_SCOPES,
    redirect_uri: env.atlassianRedirectUri,
    state,
    response_type: 'code',
    prompt: 'consent',
  });
  return `https://auth.atlassian.com/authorize?${params.toString()}`;
}

export async function exchangeCode(code: string): Promise<TokenResponse> {
  const res = await fetch('https://auth.atlassian.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: env.atlassianClientId,
      client_secret: env.atlassianClientSecret,
      code,
      redirect_uri: env.atlassianRedirectUri,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw Object.assign(new Error(`Token exchange failed: ${res.status} ${body}`), { status: 502 });
  }
  return res.json() as Promise<TokenResponse>;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch('https://auth.atlassian.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: env.atlassianClientId,
      client_secret: env.atlassianClientSecret,
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    throw Object.assign(new Error('Session expired — reconnect to Jira'), { status: 401 });
  }
  return res.json() as Promise<TokenResponse>;
}

export async function getAccessibleResources(accessToken: string): Promise<AccessibleResource[]> {
  const res = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    throw Object.assign(new Error('Could not list Jira sites'), { status: 502 });
  }
  return res.json() as Promise<AccessibleResource[]>;
}

function jiraBase(cloudId: string): string {
  return `https://api.atlassian.com/ex/jira/${cloudId}`;
}

async function jiraFetch(
  session: SessionData,
  path: string,
  init: RequestInit = {},
): Promise<{ res: Response; session: SessionData }> {
  let current = session;
  const doFetch = (token: string) =>
    fetchWithRetry(`${jiraBase(current.cloudId)}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init.headers || {}),
      },
    });

  let res = await doFetch(current.accessToken);
  if (res.status === 401 && current.refreshToken) {
    const tokens = await refreshAccessToken(current.refreshToken);
    current = {
      ...current,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || current.refreshToken,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    };
    res = await doFetch(current.accessToken);
  }
  return { res, session: current };
}

/** Shared session for parallel Jira calls (serialize token refresh). */
class SessionGate {
  private session: SessionData;
  private refreshPromise: Promise<void> | null = null;

  constructor(session: SessionData) {
    this.session = session;
  }

  get(): SessionData {
    return this.session;
  }

  async fetch(path: string, init: RequestInit = {}): Promise<Response> {
    const run = async (): Promise<Response> => {
      const current = this.session;
      const res = await fetchWithRetry(`${jiraBase(current.cloudId)}${path}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${current.accessToken}`,
          ...(init.headers || {}),
        },
      });
      if (res.status !== 401 || !current.refreshToken) return res;

      if (!this.refreshPromise) {
        this.refreshPromise = (async () => {
          const tokens = await refreshAccessToken(this.session.refreshToken);
          this.session = {
            ...this.session,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token || this.session.refreshToken,
            expiresAt: Date.now() + tokens.expires_in * 1000,
          };
        })().finally(() => {
          this.refreshPromise = null;
        });
      }
      await this.refreshPromise;

      return fetchWithRetry(`${jiraBase(this.session.cloudId)}${path}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.session.accessToken}`,
          ...(init.headers || {}),
        },
      });
    };

    return run();
  }
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function fetchMyself(
  session: SessionData,
): Promise<{ myself: JiraMyself; session: SessionData }> {
  const { res, session: next } = await jiraFetch(session, '/rest/api/3/myself');
  if (!res.ok) {
    throw Object.assign(new Error('Failed to load Jira profile'), {
      status: res.status === 401 ? 401 : 502,
    });
  }
  const myself = (await res.json()) as JiraMyself;
  return { myself, session: next };
}

function extractComment(comment: unknown): string | null {
  if (comment == null) return null;
  if (typeof comment === 'string') return comment.trim() || null;
  // ADF simplified: collect text nodes
  const texts: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const n = node as { type?: string; text?: string; content?: unknown[] };
    if (n.type === 'text' && n.text) texts.push(n.text);
    if (Array.isArray(n.content)) n.content.forEach(walk);
  };
  walk(comment);
  const joined = texts.join('').trim();
  return joined || null;
}

async function searchIssues(
  session: SessionData,
  jql: string,
): Promise<{ issues: JiraIssue[]; session: SessionData }> {
  const issues: JiraIssue[] = [];
  let nextPageToken: string | undefined;
  let current = session;

  // Prefer new search/jql endpoint; fall back to classic search if needed
  for (;;) {
    const body: Record<string, unknown> = {
      jql,
      maxResults: 100,
      fields: ['summary', 'worklog', DEV_EST_FIELD],
    };
    if (nextPageToken) body.nextPageToken = nextPageToken;

    const { res, session: next } = await jiraFetch(current, '/rest/api/3/search/jql', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    current = next;

    if (res.status === 404 || res.status === 410) {
      return searchIssuesClassic(current, jql);
    }
    if (!res.ok) {
      const text = await res.text();
      throw Object.assign(new Error(`Jira search failed: ${res.status} ${text}`), { status: 502 });
    }

    const data = (await res.json()) as {
      issues?: JiraIssue[];
      nextPageToken?: string;
      isLast?: boolean;
    };
    issues.push(...(data.issues || []));
    if (data.isLast || !data.nextPageToken) break;
    nextPageToken = data.nextPageToken;
  }

  return { issues, session: current };
}

async function searchIssuesClassic(
  session: SessionData,
  jql: string,
): Promise<{ issues: JiraIssue[]; session: SessionData }> {
  const issues: JiraIssue[] = [];
  let startAt = 0;
  let current = session;

  for (;;) {
    const { res, session: next } = await jiraFetch(
      current,
      `/rest/api/3/search?jql=${encodeURIComponent(jql)}&startAt=${startAt}&maxResults=100&fields=summary,worklog,${DEV_EST_FIELD}`,
    );
    current = next;
    if (!res.ok) {
      const text = await res.text();
      throw Object.assign(new Error(`Jira search failed: ${res.status} ${text}`), { status: 502 });
    }
    const data = (await res.json()) as {
      issues: JiraIssue[];
      startAt: number;
      maxResults: number;
      total: number;
    };
    issues.push(...data.issues);
    startAt += data.maxResults;
    if (startAt >= data.total || data.issues.length === 0) break;
  }

  return { issues, session: current };
}

async function fetchIssueWorklogsAll(gate: SessionGate, issueKey: string): Promise<JiraWorklog[]> {
  const all: JiraWorklog[] = [];
  let startAt = 0;

  for (;;) {
    const res = await gate.fetch(
      `/rest/api/3/issue/${encodeURIComponent(issueKey)}/worklog?startAt=${startAt}&maxResults=100`,
    );
    if (!res.ok) {
      const text = await res.text();
      throw Object.assign(
        new Error(`Worklog fetch failed for ${issueKey}: ${res.status} ${text}`),
        {
          status: 502,
        },
      );
    }
    const data = (await res.json()) as {
      worklogs: JiraWorklog[];
      startAt: number;
      maxResults: number;
      total: number;
    };
    all.push(...data.worklogs);
    startAt += data.maxResults;
    if (startAt >= data.total || data.worklogs.length === 0) break;
  }

  return all;
}

function embeddedWorklogsComplete(issue: JiraIssue): JiraWorklog[] | null {
  const wl = issue.fields?.worklog;
  if (!wl) return null;
  if (wl.total <= (wl.worklogs?.length || 0)) return wl.worklogs || [];
  return null;
}

function readDevEstHours(issue: JiraIssue): number | null {
  const raw = issue.fields?.[DEV_EST_FIELD];
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) return null;
  return raw;
}

function toEntries(issue: JiraIssue, worklogs: JiraWorklog[], accountId: string): WorklogEntry[] {
  const devEstHours = readDevEstHours(issue);
  const entries: WorklogEntry[] = [];
  for (const wl of worklogs) {
    if (wl.author?.accountId && wl.author.accountId !== accountId) continue;
    entries.push({
      id: wl.id,
      issueKey: issue.key,
      issueSummary: issue.fields?.summary || issue.key,
      started: wl.started,
      timeSpentSeconds: wl.timeSpentSeconds || 0,
      comment: extractComment(wl.comment),
      devEstHours,
      myTotalSeconds: 0,
    });
  }
  return entries;
}

export async function buildSessionAfterOAuth(code: string): Promise<SessionData> {
  const tokens = await exchangeCode(code);
  const resources = await getAccessibleResources(tokens.access_token);

  const summary = resources.map((r) => ({
    name: r.name,
    url: r.url,
    scopes: r.scopes,
  }));
  console.log('OAuth accessible-resources:', JSON.stringify(summary));

  const jiraSites = resources.filter((r) =>
    (r.scopes || []).some((s) => s.toLowerCase().includes('jira')),
  );
  const site = jiraSites[0] || resources[0];
  if (!site) {
    throw Object.assign(
      new Error(
        'No Jira Cloud site was granted. In Atlassian Developer Console → your app → Permissions, add “Jira API” and enable read:jira-work, read:jira-user, then connect again and select your site on the consent screen.',
      ),
      { status: 400 },
    );
  }

  let session: SessionData = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || '',
    expiresAt: Date.now() + tokens.expires_in * 1000,
    cloudId: site.id,
    siteUrl: site.url,
    siteName: site.name,
    accountId: '',
    displayName: '',
  };

  const { myself, session: next } = await fetchMyself(session);
  session = {
    ...next,
    accountId: myself.accountId,
    displayName: myself.displayName,
    avatarUrl: pickAvatarUrl(myself),
  };
  return session;
}

export async function fetchWorklogsForRange(
  session: SessionData,
  from: string,
  to: string,
  timeZone: string,
): Promise<{
  from: string;
  to: string;
  totalSeconds: number;
  days: ReturnType<typeof groupWorklogsByDay>['days'];
  session: SessionData;
}> {
  assertDateRange(from, to);
  const startedAt = Date.now();
  const jql = `worklogAuthor = currentUser() AND worklogDate >= "${from}" AND worklogDate <= "${to}" ORDER BY updated DESC`;
  const { issues, session: afterSearch } = await searchIssues(session, jql);
  const gate = new SessionGate(afterSearch);

  const needsFetch: JiraIssue[] = [];
  const entries: WorklogEntry[] = [];

  for (const issue of issues) {
    const embedded = embeddedWorklogsComplete(issue);
    if (embedded) {
      entries.push(...toEntries(issue, embedded, afterSearch.accountId));
    } else {
      needsFetch.push(issue);
    }
  }

  const fetched = await mapPool(needsFetch, 8, async (issue) => {
    const worklogs = await fetchIssueWorklogsAll(gate, issue.key);
    return toEntries(issue, worklogs, afterSearch.accountId);
  });
  for (const batch of fetched) entries.push(...batch);

  const enriched = withIssueTotals(entries);
  const grouped = groupWorklogsByDay(enriched, from, to, timeZone);
  console.log(
    `worklogs range ${from}..${to}: ${issues.length} issues, ${needsFetch.length} extra fetches, ${entries.length} entries, ${Date.now() - startedAt}ms`,
  );
  return { from, to, ...grouped, session: gate.get() };
}
