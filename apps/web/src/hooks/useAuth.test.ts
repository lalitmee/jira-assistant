import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMe } from '../api';
import { useAuth } from './useAuth';

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api')>();
  return {
    ...actual,
    fetchMe: vi.fn(),
    logout: vi.fn(),
  };
});

const mockedFetchMe = vi.mocked(fetchMe);

describe('useAuth', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    mockedFetchMe.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('reads authError from the URL and clears the query string', async () => {
    window.history.replaceState({}, '', '/?authError=OAuth%20failed');

    const { result } = renderHook(() => useAuth());

    expect(result.current.error).toBe('OAuth failed');
    expect(window.location.pathname).toBe('/');
    await waitFor(() => expect(result.current.authChecked).toBe(true));
  });

  it('sets me when fetchMe succeeds', async () => {
    mockedFetchMe.mockResolvedValue({
      accountId: 'abc',
      displayName: 'Test User',
      siteName: 'Example',
      siteUrl: 'https://example.atlassian.net',
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.authChecked).toBe(true);
      expect(result.current.me?.displayName).toBe('Test User');
    });
  });

  it('clears me when fetchMe returns unauthenticated', async () => {
    mockedFetchMe.mockResolvedValue(null);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.authChecked).toBe(true);
      expect(result.current.me).toBeNull();
    });
  });

  it('clearAuth stores a session error message', async () => {
    mockedFetchMe.mockResolvedValue(null);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.authChecked).toBe(true));

    result.current.clearAuth('Session expired. Connect to Jira again.');

    await waitFor(() => {
      expect(result.current.me).toBeNull();
      expect(result.current.error).toBe('Session expired. Connect to Jira again.');
    });
  });
});
