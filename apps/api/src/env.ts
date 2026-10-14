import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: rootEnv });

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  atlassianClientId: required('ATLASSIAN_CLIENT_ID'),
  atlassianClientSecret: required('ATLASSIAN_CLIENT_SECRET'),
  atlassianRedirectUri: required('ATLASSIAN_REDIRECT_URI'),
  apiPort: Number(process.env.API_PORT ?? '8888'),
  apiHost: process.env.API_HOST?.trim() || '127.0.0.1',
  webOrigin: process.env.WEB_ORIGIN?.trim() || 'http://localhost:5173',
};

export const ATLASSIAN_SCOPES = ['read:jira-work', 'read:jira-user', 'offline_access'].join(' ');
