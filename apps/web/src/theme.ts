export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'ja_theme';
export const THEME_CHANGE_EVENT = 'ja-theme-change';

export function readStoredTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: theme }));
}

export function applyStoredTheme(): void {
  applyTheme(readStoredTheme());
}

export function subscribeTheme(onChange: (theme: Theme) => void): () => void {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<Theme>).detail;
    if (detail === 'light' || detail === 'dark') onChange(detail);
  };
  window.addEventListener(THEME_CHANGE_EVENT, handler);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, handler);
}
