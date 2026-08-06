import { useEffect, useRef, useState } from 'react';
import type { Me } from '../api';
import { ThemePillToggle } from './ThemePillToggle';

type Props = {
  me: Me;
  onLogout: () => void;
};

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserMenu({ me, onLogout }: Props) {
  const [open, setOpen] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setImgFailed(false);
  }, [me.avatarUrl]);

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

  const showImage = Boolean(me.avatarUrl) && !imgFailed;
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
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="user-avatar-initials" aria-hidden>
            {initials}
          </span>
        )}
      </button>

      {open ? (
        <div className="user-menu-popover" role="menu">
          <div className="user-menu-header">
            <div className="user-menu-avatar" aria-hidden>
              {showImage ? (
                <img
                  className="user-avatar-img"
                  src={me.avatarUrl!}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
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
          <div className="user-menu-divider" />
          <div className="user-menu-theme-row" role="none">
            <span className="user-menu-theme-label">Theme</span>
            <ThemePillToggle />
          </div>
          <button
            type="button"
            className="user-menu-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
