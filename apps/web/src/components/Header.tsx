import type { ReactNode } from 'react';
import type { Me } from '../api';
import { Button } from './ui/Button';
import { ArrowLeft } from './ui/icons';
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
            <ArrowLeft />
          </Button>
        ) : (
          <>
            <img className="brand-logo" src="/jira-assistant.png" alt="" width={32} height={32} />
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
