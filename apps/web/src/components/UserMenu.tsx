import { useEffect, useRef, useState } from 'react';
import type { Me } from '../api';
import { LogOut, Settings } from './ui/icons';
import { Divider } from './ui/Divider';

type Props = {
  me: Me;
  onLogout: () => void;
  onOpenSettings?: () => void;
};

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserMenu({ me, onLogout, onOpenSettings }: Props) {
  const [open, setOpen] = useState(false);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const showImage = Boolean(me.avatarUrl) && me.avatarUrl !== failedAvatarUrl;
  const initials = initialsFor(me.displayName);

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        className="user-avatar-btn"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
      >
        {showImage ? (
          <img
            className="user-avatar-img"
            src={me.avatarUrl!}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setFailedAvatarUrl(me.avatarUrl!)}
          />
        ) : (
          <span className="user-avatar-initials" aria-hidden>
            {initials}
          </span>
        )}
      </button>

      <div
        className={`user-menu-popover${open ? ' open' : ''}`}
        role="menu"
        aria-hidden={!open}
      >
        <div className="user-menu-header">
          <div className="user-menu-avatar" aria-hidden>
            {showImage ? (
              <img
                className="user-avatar-img"
                src={me.avatarUrl!}
                alt=""
                referrerPolicy="no-referrer"
                onError={() => setFailedAvatarUrl(me.avatarUrl!)}
              />
            ) : (
              <span className="user-avatar-initials">{initials}</span>
            )}
          </div>
          <div className="user-menu-identity">
            <div className="user-menu-name">{me.displayName}</div>
            <div className="user-menu-site">{me.siteName}</div>
          </div>
        </div>
        <Divider orientation="horizontal" inset />
        {onOpenSettings ? (
          <button
            type="button"
            className="user-menu-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onOpenSettings();
            }}
          >
            <span className="user-menu-item-icon" aria-hidden>
              <Settings />
            </span>
            Settings
          </button>
        ) : null}
        <button
          type="button"
          className="user-menu-item"
          role="menuitem"
          onClick={() => {
            setOpen(false);
            onLogout();
          }}
        >
          <span className="user-menu-item-icon" aria-hidden>
            <LogOut />
          </span>
          Sign out
        </button>
      </div>
    </div>
  );
}
