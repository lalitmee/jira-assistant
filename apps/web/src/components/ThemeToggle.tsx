import { useSettings } from '../SettingsContext';
import type { ThemePreference } from '../theme';
import { resolveTheme } from '../settings';

function SunIcon() {
  return (
    <svg className="theme-toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
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
    <svg className="theme-toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M21 14.3A9.05 9.05 0 0 1 9.7 3 9.2 9.2 0 1 0 21 14.3z" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg className="theme-toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 19h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const CYCLE: ThemePreference[] = ['system', 'light', 'dark'];

function nextTheme(current: ThemePreference): ThemePreference {
  const idx = CYCLE.indexOf(current);
  return CYCLE[(idx + 1) % CYCLE.length];
}

function themeLabel(preference: ThemePreference): string {
  if (preference === 'system') return 'System';
  if (preference === 'light') return 'Light';
  return 'Dark';
}

export function ThemeToggle() {
  const { settings, updateSettings } = useSettings();
  const preference = settings.theme;
  const resolved = resolveTheme(preference);
  const next = nextTheme(preference);

  return (
    <button
      type="button"
      className="theme-toggle-btn"
      onClick={() => updateSettings({ theme: next })}
      aria-label={`Theme: ${themeLabel(preference)}. Switch to ${themeLabel(next)}.`}
      title={`Theme: ${themeLabel(preference)}`}
    >
      {preference === 'system' ? (
        <SystemIcon />
      ) : resolved === 'light' ? (
        <MoonIcon />
      ) : (
        <SunIcon />
      )}
    </button>
  );
}
