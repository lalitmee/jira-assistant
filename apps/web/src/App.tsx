import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  defaultRange,
  fetchMe,
  fetchWorklogs,
  formatDuration,
  logout,
  type Me,
  type WorklogsResponse,
} from './api';
import { Header } from './components/Header';
import { RangeBar } from './components/RangeBar';
import { DayStrip } from './components/DayStrip';
import { DayDrawer } from './components/DayDrawer';

export function App() {
  const initial = useMemo(() => defaultRange(), []);
  const [me, setMe] = useState<Me | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [data, setData] = useState<WorklogsResponse | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('authError');
    if (authError) {
      setError(authError);
      window.history.replaceState({}, '', '/');
    }

    fetchMe()
      .then((profile) => setMe(profile))
      .catch(() => setMe(null))
      .finally(() => setAuthChecked(true));
  }, []);

  const load = useCallback(async (rangeFrom: string, rangeTo: string) => {
    setLoading(true);
    setError(null);
    setFrom(rangeFrom);
    setTo(rangeTo);
    setDrawerOpen(false);
    setSelected(null);
    try {
      const result = await fetchWorklogs(rangeFrom, rangeTo);
      setData(result);
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 401) {
        setMe(null);
        setData(null);
        setError('Session expired. Connect to Jira again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load worklogs');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!me) return;
    void load(from, to);
    // Initial load when session becomes available
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, load]);

  const onLogout = async () => {
    await logout();
    setMe(null);
    setData(null);
    setSelected(null);
    setDrawerOpen(false);
  };

  const openDay = (iso: string) => {
    setSelected(iso);
    setDrawerOpen(true);
  };

  if (!authChecked) {
    return (
      <div className="app-shell">
        <Header me={null} onLogout={() => undefined} />
        <div className="loading">
          <div className="spinner" />
          Loading…
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="app-shell">
        <Header me={null} onLogout={() => undefined} />
        <div className="hero">
          <div className="hero-card">
            <h2>Your worklogs, clearly</h2>
            <p>
              Connect your Jira Cloud account to review time logged across any date range —
              calmly, in a calendar view.
            </p>
            {error ? <p className="error">{error}</p> : null}
            <a className="btn btn-primary" href="http://localhost:8888/auth/jira">
              Connect to Jira
            </a>
          </div>
        </div>
      </div>
    );
  }

  const stripFrom = data?.from ?? from;
  const stripTo = data?.to ?? to;

  return (
    <div className="app-shell">
      <Header
        me={me}
        onLogout={onLogout}
        controls={
          <RangeBar
            from={from}
            to={to}
            totalSeconds={data?.totalSeconds ?? null}
            loading={loading}
            onApply={(f, t) => void load(f, t)}
            formatDuration={formatDuration}
          />
        }
      />
      <main className="main">
        {error ? <p className="error">{error}</p> : null}

        <div className="legend">
          <span className="legend-item">
            <i className="swatch weekend" /> Weekend (ignored)
          </span>
          <span className="legend-item">
            <i className="swatch ok" /> 6h–8h
          </span>
          <span className="legend-item">
            <i className="swatch bad" /> Under 6h or over 8h
          </span>
        </div>

        <DayStrip
          from={stripFrom}
          to={stripTo}
          days={data?.days ?? {}}
          selected={selected}
          loading={loading}
          onSelect={openDay}
        />

        {!loading && data && data.totalSeconds === 0 ? (
          <p className="empty">No worklogs in this range.</p>
        ) : null}
      </main>

      <DayDrawer
        open={drawerOpen}
        date={selected}
        bucket={selected ? data?.days?.[selected] : undefined}
        siteUrl={me.siteUrl}
        onClose={() => {
          setDrawerOpen(false);
          setSelected(null);
        }}
      />
    </div>
  );
}
