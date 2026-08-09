import { useSettings } from '../SettingsContext';
import { THEME_PREFERENCE_OPTIONS } from '../settings';
import { SegmentedControl } from './ui/SegmentedControl';

export function ThemePreferenceControl() {
  const { settings, updateSettings } = useSettings();

  return (
    <SegmentedControl
      value={settings.theme}
      options={THEME_PREFERENCE_OPTIONS}
      aria-label="Theme"
      size="sm"
      onChange={(theme) => updateSettings({ theme })}
    />
  );
}

/** @deprecated Use ThemePreferenceControl */
export { ThemePreferenceControl as ThemePillToggle };
