import { useEffect, useState } from 'react';
import { applyTheme, readStoredTheme, subscribeTheme, type Theme } from '../theme';

function SunIcon() {
  return (
    <svg className="theme-pill-icon-svg" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <path
        fill="currentColor"
        d="M12 3.25a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V4A.75.75 0 0 1 12 3.25zm0 14.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75zM4 12a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 12zm14.5-.75a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1 0-1.5h1.5zM6.34 6.34a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 1 1-1.06 1.06L6.34 7.4a.75.75 0 0 1 0-1.06zm9.2 9.2a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 1 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 0-1.06zM17.66 6.34a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 1 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0zM7.4 16.54a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 0 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0z"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="theme-pill-icon-svg" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21 14.3A9.05 9.05 0 0 1 9.7 3 9.2 9.2 0 1 0 21 14.3z"
      />
    </svg>
  );
}

export function ThemePillToggle() {
  const [theme, setTheme] = useState<Theme>(() => readStoredTheme());

  useEffect(() => subscribeTheme(setTheme), []);

  const isDark = theme === 'dark';

  const toggle = () => {
    const next: Theme = isDark ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
  };

  return (
    <button
      type="button"
      className={`theme-pill${isDark ? ' is-dark' : ''}`}
      onClick={toggle}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light' : 'Switch to dark'}
    >
      <span className="theme-pill-thumb" aria-hidden />
      <span className="theme-pill-icon theme-pill-sun" aria-hidden>
        <SunIcon />
      </span>
      <span className="theme-pill-icon theme-pill-moon" aria-hidden>
        <MoonIcon />
      </span>
    </button>
  );
}
