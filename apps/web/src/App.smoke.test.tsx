import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMe, fetchWorklogs } from './api';
import { App } from './App';
import { SettingsProvider } from './SettingsContext';

vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>();
  return {
    ...actual,
    fetchMe: vi.fn(),
    fetchWorklogs: vi.fn(),
    logout: vi.fn(),
  };
});

const mockedFetchMe = vi.mocked(fetchMe);
const mockedFetchWorklogs = vi.mocked(fetchWorklogs);

function renderApp() {
  return render(
    <SettingsProvider>
      <App />
    </SettingsProvider>,
  );
}

describe('App smoke', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    mockedFetchMe.mockReset();
    mockedFetchWorklogs.mockReset();
    mockedFetchMe.mockResolvedValue(null);
    mockedFetchWorklogs.mockResolvedValue({
      from: '2026-08-01',
      to: '2026-08-09',
      totalSeconds: 0,
      days: {},
    });
  });

  it('shows the connect hero when unauthenticated', async () => {
    mockedFetchMe.mockResolvedValue(null);

    renderApp();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /your worklogs, clearly/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /connect to jira/i })).toHaveAttribute('href', '/auth/jira');
  });

  it('shows the calendar shell when authenticated', async () => {
    mockedFetchMe.mockResolvedValue({
      accountId: 'abc',
      displayName: 'Test User',
      siteName: 'Example',
      siteUrl: 'https://example.atlassian.net',
    });
    mockedFetchWorklogs.mockResolvedValue({
      from: '2026-08-01',
      to: '2026-08-09',
      totalSeconds: 3600,
      days: {
        '2026-08-05': { totalSeconds: 3600, worklogs: [] },
      },
    });

    renderApp();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /account menu/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('group', { name: /calendar layout/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous month/i })).toBeInTheDocument();
  });
});
