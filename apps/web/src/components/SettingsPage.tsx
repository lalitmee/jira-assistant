import { useSettings } from '../SettingsContext';
import {
  CALENDAR_SPACING_OPTIONS,
  DATE_FORMAT_OPTIONS,
  TIME_FORMAT_OPTIONS,
  type DateFormat,
  type DrawerGroupBy,
  type TimeFormat,
  type WeekStart,
} from '../settings';
import { ThemePillToggle } from './ThemePillToggle';
import { Button } from './ui/Button';
import { SegmentedControl } from './ui/SegmentedControl';
import { SelectField } from './ui/SelectField';
import { SettingsRow } from './ui/SettingsRow';
import { SettingsSection } from './ui/SettingsSection';
import { Switch } from './ui/Switch';
import styles from './SettingsPage.module.css';

const WEEK_START_OPTIONS = [
  { value: 'sunday' as WeekStart, label: 'Sunday' },
  { value: 'monday' as WeekStart, label: 'Monday' },
];

const GROUP_BY_OPTIONS = [
  { value: 'issue' as DrawerGroupBy, label: 'By issue' },
  { value: 'chronological' as DrawerGroupBy, label: 'Chronological' },
];

const WEEK_WINDOW_SEGMENT_OPTIONS = [
  { value: '1', label: '1 week' },
  { value: '2', label: '2 weeks' },
] as const;

export function SettingsPage() {
  const { settings, updateSettings, resetToDefaults } = useSettings();

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Settings</h1>

      <SettingsSection title="Display">
        <SettingsRow
          label="Show legend"
          description="Color key for day totals. Range total stays visible when off."
        >
          <Switch
            checked={settings.showLegend}
            aria-label="Show legend swatches"
            onChange={(showLegend) => updateSettings({ showLegend })}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Calendar">
        <SettingsRow
          label="Grid layout"
          description="Grid lines around spaced day cards. Off uses floating cards with gaps."
        >
          <Switch
            checked={settings.calendarGrid}
            aria-label="Show calendar grid"
            onChange={(calendarGrid) => updateSettings({ calendarGrid })}
          />
        </SettingsRow>
        <SettingsRow
          label="Spacing"
          description={
            settings.calendarGrid
              ? 'Padding inside each grid cell.'
              : 'Gap between day cards in each row.'
          }
        >
          <SegmentedControl
            value={settings.calendarSpacing}
            options={CALENDAR_SPACING_OPTIONS}
            aria-label="Calendar spacing"
            size="sm"
            onChange={(calendarSpacing) => updateSettings({ calendarSpacing })}
          />
        </SettingsRow>
        <SettingsRow label="Week starts on">
          <SegmentedControl
            value={settings.weekStart}
            options={WEEK_START_OPTIONS}
            aria-label="Week starts on"
            size="sm"
            onChange={(weekStart) => updateSettings({ weekStart })}
          />
        </SettingsRow>
        <SettingsRow
          label="Week window"
          description="In week view, show one week per screen or two consecutive weeks that move together."
        >
          <SegmentedControl
            value={settings.weekWindowWeeks === 2 ? '2' : '1'}
            options={[...WEEK_WINDOW_SEGMENT_OPTIONS]}
            aria-label="Week window"
            size="sm"
            onChange={(v) => updateSettings({ weekWindowWeeks: v === '2' ? 2 : 1 })}
          />
        </SettingsRow>
        <SettingsRow label="Future days" description="Show upcoming days on the calendar.">
          <Switch
            checked={settings.showFutureDays}
            aria-label="Show future days"
            onChange={(showFutureDays) => updateSettings({ showFutureDays })}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Navigation">
        <SettingsRow label="Week swipe" description="Swipe or drag to change weeks in week view.">
          <Switch
            checked={settings.weekSwipeEnabled}
            aria-label="Enable week swipe"
            onChange={(weekSwipeEnabled) => updateSettings({ weekSwipeEnabled })}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Regional">
        <SettingsRow label="Time format">
          <SelectField
            value={settings.timeFormat}
            options={TIME_FORMAT_OPTIONS}
            aria-label="Time format"
            onChange={(timeFormat: TimeFormat) => updateSettings({ timeFormat })}
          />
        </SettingsRow>
        <SettingsRow label="Date format">
          <SelectField
            value={settings.dateFormat}
            options={DATE_FORMAT_OPTIONS}
            aria-label="Date format"
            onChange={(dateFormat: DateFormat) => updateSettings({ dateFormat })}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Day drawer">
        <SettingsRow label="Dev estimates" description="Show logged time vs development estimate.">
          <Switch
            checked={settings.drawerShowEstimates}
            aria-label="Show dev estimates"
            onChange={(drawerShowEstimates) => updateSettings({ drawerShowEstimates })}
          />
        </SettingsRow>
        <SettingsRow label="Group worklogs">
          <SegmentedControl
            value={settings.drawerGroupBy}
            options={GROUP_BY_OPTIONS}
            aria-label="Group worklogs by"
            size="sm"
            onChange={(drawerGroupBy) => updateSettings({ drawerGroupBy })}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Appearance">
        <SettingsRow label="Theme" description="Also available from the account menu.">
          <ThemePillToggle />
        </SettingsRow>
      </SettingsSection>

      <div className={styles.footer}>
        <Button variant="ghost" onClick={resetToDefaults}>
          Reset to defaults
        </Button>
      </div>
    </div>
  );
}
