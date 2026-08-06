export type Theme = 'light' | 'dark';

export const THEME_CHANGE_EVENT = 'ja-theme-change';

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: theme }));
}

export function subscribeTheme(onChange: (theme: Theme) => void): () => void {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<Theme>).detail;
    if (detail === 'light' || detail === 'dark') onChange(detail);
  };
  window.addEventListener(THEME_CHANGE_EVENT, handler);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, handler);
}
