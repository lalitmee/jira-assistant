import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { randomBytes } from 'node:crypto';
import { env } from './env.js';
import {
  clearOAuthState,
  clearSession,
  getOAuthState,
  getSession,
  setOAuthState,
  setSession,
} from './session.js';
import { buildAuthorizeUrl, buildSessionAfterOAuth, fetchWorklogsForRange } from './jira.js';
import { assertDateRange } from './dates.js';

const app = new Hono();

app.use(
  '*',
  cors({
    origin: env.webOrigin,
    credentials: true,
  }),
);

app.get('/health', (c) => c.json({ ok: true }));

app.get('/auth/jira', (c) => {
  const state = randomBytes(16).toString('hex');
  setOAuthState(c, state);
  return c.redirect(buildAuthorizeUrl(state), 302);
});

app.get('/auth/callback', async (c) => {
  const error = c.req.query('error');
  if (error) {
    return c.redirect(`${env.webOrigin}/?authError=${encodeURIComponent('Connection cancelled')}`, 302);
  }

  const code = c.req.query('code');
  const state = c.req.query('state');
  const expected = getOAuthState(c);
  clearOAuthState(c);

  if (!code || !state || !expected || state !== expected) {
    return c.redirect(`${env.webOrigin}/?authError=${encodeURIComponent('Login failed — try again')}`, 302);
  }

  try {
    const session = await buildSessionAfterOAuth(code);
    await setSession(c, session);
    console.log(`OAuth OK: ${session.displayName} @ ${session.siteName}`);
    return c.redirect(`${env.webOrigin}/`, 302);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Login failed';
    console.error('OAuth callback failed:', message);
    return c.redirect(`${env.webOrigin}/?authError=${encodeURIComponent(message)}`, 302);
  }
});

app.post('/api/logout', (c) => {
  clearSession(c);
  return c.json({ ok: true });
});

app.get('/api/me', async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);
  return c.json({
    accountId: session.accountId,
    displayName: session.displayName,
    siteName: session.siteName,
    siteUrl: session.siteUrl,
  });
});

const worklogCache = new Map<
  string,
  { expiresAt: number; payload: { from: string; to: string; totalSeconds: number; days: unknown } }
>();
const WORKLOG_CACHE_TTL_MS = 60_000;

app.get('/api/worklogs', async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const from = c.req.query('from') || '';
  const to = c.req.query('to') || '';
  const timeZone =
    c.req.header('x-timezone') ||
    c.req.query('tz') ||
    'UTC';

  try {
    assertDateRange(from, to);
    const cacheKey = `${session.accountId}|${from}|${to}|${timeZone}`;
    const cached = worklogCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return c.json(cached.payload);
    }

    const result = await fetchWorklogsForRange(session, from, to, timeZone);
    if (result.session !== session) await setSession(c, result.session);
    const payload = {
      from: result.from,
      to: result.to,
      totalSeconds: result.totalSeconds,
      days: result.days,
    };
    worklogCache.set(cacheKey, { expiresAt: Date.now() + WORKLOG_CACHE_TTL_MS, payload });
    return c.json(payload);
  } catch (err) {
    const status = (err as { status?: number }).status || 500;
    const message = err instanceof Error ? err.message : 'Failed to load worklogs';
    if (status === 401) clearSession(c);
    return c.json({ error: message }, status as 400 | 401 | 500 | 502);
  }
});

serve({ fetch: app.fetch, port: env.apiPort }, () => {
  console.log(`API listening on http://localhost:${env.apiPort}`);
});
