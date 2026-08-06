import type { ReactNode } from 'react';
import type { Me } from '../api';

type Props = {
  me: Me | null;
  onLogout: () => void;
  controls?: ReactNode;
};

export function Header({ me, onLogout, controls }: Props) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark" aria-hidden>
          W
        </div>
        <h1>Worklog Auditor</h1>
      </div>

      {me && controls ? <div className="topbar-controls">{controls}</div> : null}

      {me ? (
        <div className="user-meta">
          <span className="user-meta-text">
            {me.displayName}
            <span aria-hidden> · </span>
            {me.siteName}
          </span>
          <button type="button" className="btn btn-ghost" onClick={onLogout}>
            Sign out
          </button>
        </div>
      ) : null}
    </header>
  );
}
