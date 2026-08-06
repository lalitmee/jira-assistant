import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, unlinkSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';

export type SessionData = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  cloudId: string;
  siteUrl: string;
  siteName: string;
  accountId: string;
  displayName: string;
};

const COOKIE = 'ja_sid';
const STATE_COOKIE = 'ja_oauth_state';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const storeDir = path.join(rootDir, '.data', 'sessions');

function ensureStore(): void {
  mkdirSync(storeDir, { recursive: true });
}

function sessionPath(id: string): string {
  // only allow hex ids
  if (!/^[a-f0-9]{32,64}$/.test(id)) {
    throw new Error('Invalid session id');
  }
  return path.join(storeDir, `${id}.json`);
}

function writeSession(id: string, data: SessionData): void {
  ensureStore();
  writeFileSync(sessionPath(id), JSON.stringify(data), { mode: 0o600 });
}

function readSession(id: string): SessionData | null {
  try {
    const file = sessionPath(id);
    if (!existsSync(file)) return null;
    return JSON.parse(readFileSync(file, 'utf8')) as SessionData;
  } catch {
    return null;
  }
}

function deleteSessionFile(id: string): void {
  try {
    const file = sessionPath(id);
    if (existsSync(file)) unlinkSync(file);
  } catch {
    // ignore
  }
}

export async function getSession(c: Context): Promise<SessionData | null> {
  const id = getCookie(c, COOKIE);
  if (!id) return null;
  return readSession(id);
}

export async function setSession(c: Context, data: SessionData): Promise<void> {
  const existing = getCookie(c, COOKIE);
  const id =
    existing && /^[a-f0-9]{32,64}$/.test(existing) ? existing : randomBytes(24).toString('hex');
  writeSession(id, data);
  setCookie(c, COOKIE, id, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSession(c: Context): void {
  const id = getCookie(c, COOKIE);
  if (id) deleteSessionFile(id);
  deleteCookie(c, COOKIE, { path: '/' });
  deleteCookie(c, STATE_COOKIE, { path: '/' });
}

export function setOAuthState(c: Context, state: string): void {
  setCookie(c, STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 600,
  });
}

export function getOAuthState(c: Context): string | undefined {
  return getCookie(c, STATE_COOKIE);
}

export function clearOAuthState(c: Context): void {
  deleteCookie(c, STATE_COOKIE, { path: '/' });
}
