import type { ReactNode } from 'react';
import type { Me } from '../api';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

type Props = {
  me: Me | null;
  onLogout: () => void;
  controls?: ReactNode;
};

export function Header({ me, onLogout, controls }: Props) {
  return (
    <header className="topbar">
      <div className="brand">
        <img
          className="brand-logo"
          src="/apple-touch-icon.png"
          alt=""
          width={28}
          height={28}
        />
        <h1>Worklog Auditor</h1>
      </div>

      {me ? <div className="topbar-controls">{controls}</div> : null}

      <div className="user-meta">
        {me ? <UserMenu me={me} onLogout={onLogout} /> : <ThemeToggle />}
      </div>
    </header>
  );
}
