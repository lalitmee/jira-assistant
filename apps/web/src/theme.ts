export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_CHANGE_EVENT = 'ja-theme-change';

/** @deprecated Use ThemePreference */
export type Theme = ResolvedTheme;
