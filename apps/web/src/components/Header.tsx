import type { ReactNode } from 'react';
import type { Me } from '../api';
import { Button } from './ui/Button';
import { ChevronLeft } from './ui/icons';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

type Props = {
  me: Me | null;
  onLogout: () => void;
  controls?: ReactNode;
  onOpenSettings?: () => void;
  onBack?: () => void;
};

export function Header({ me, onLogout, controls, onOpenSettings, onBack }: Props) {
  return (
    <header className="topbar">
      <div className="brand">
        {onBack ? (
          <Button variant="icon" size="sm" onClick={onBack} aria-label="Back to calendar">
            <ChevronLeft />
          </Button>
        ) : (
          <>
            <img className="brand-logo" src="/worklog-auditor.png" alt="" width={28} height={28} />
            <h1>Worklog Auditor</h1>
          </>
        )}
      </div>

      <div className="topbar-controls">{me && !onBack ? controls : null}</div>

      <div className="user-meta">
        {me ? (
          <UserMenu me={me} onLogout={onLogout} onOpenSettings={onOpenSettings} />
        ) : (
          <ThemeToggle />
        )}
      </div>
    </header>
  );
}
