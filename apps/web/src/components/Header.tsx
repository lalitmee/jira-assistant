import type { ReactNode } from 'react';
import type { Me } from '../api';
import { Button } from './ui/Button';
import { ArrowLeft } from './ui/icons';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';
import styles from './Header.module.css';

type Props = {
  me: Me | null;
  onLogout: () => void;
  controls?: ReactNode;
  legend?: ReactNode;
  onOpenSettings?: () => void;
  onBack?: () => void;
};

export function Header({ me, onLogout, controls, legend, onOpenSettings, onBack }: Props) {
  return (
    <header className="topbar">
      <div className="brand">
        {onBack ? (
          <Button
            variant="ghost"
            size="sm"
            className={styles.backBtn}
            onClick={onBack}
            aria-label="Go back"
          >
            <ArrowLeft />
            Back
          </Button>
        ) : (
          <>
            <img className="brand-logo" src="/worklog-auditor.png" alt="" width={28} height={28} />
            <h1>Worklog Auditor</h1>
          </>
        )}
      </div>

      {me && !onBack ? <div className="topbar-controls">{controls}</div> : null}

      <div className="user-meta">
        {legend ? <div className="topbar-legend">{legend}</div> : null}
        {me ? (
          <UserMenu me={me} onLogout={onLogout} onOpenSettings={onOpenSettings} />
        ) : (
          <ThemeToggle />
        )}
      </div>
    </header>
  );
}
