import { useSettings } from '../SettingsContext';
import {
  AUDIT_HOURS_MAX,
  AUDIT_HOURS_MIN,
  CALENDAR_SPACING_OPTIONS,
  DATE_FORMAT_OPTIONS,
  DEFAULT_LAYOUT_OPTIONS,
  DURATION_FORMAT_OPTIONS,
  ISSUE_LINK_OPTIONS,
  REDUCED_MOTION_OPTIONS,
  STARTUP_RANGE_OPTIONS,
  TIME_FORMAT_OPTIONS,
  type DateFormat,
  type DefaultLayout,
  type DrawerGroupBy,
  type DurationFormat,
  type IssueLinkTarget,
  type ReducedMotion,
  type StartupRange,
  type TimeFormat,
  type WeekStart,
} from '../settings';
import { ThemePreferenceControl } from './ThemePillToggle';
import { Button } from './ui/Button';
import { NumberField } from './ui/NumberField';
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
        <SettingsRow label="Duration format" description="How logged time appears across the app.">
          <SegmentedControl
            value={settings.durationFormat}
            options={DURATION_FORMAT_OPTIONS}
            aria-label="Duration format"
            size="sm"
            onChange={(durationFormat: DurationFormat) => updateSettings({ durationFormat })}
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
        <SettingsRow
          label="Default layout"
          description="Which calendar layout to open on each visit. Remember keeps your last choice for the session."
        >
          <SegmentedControl
            value={settings.defaultLayout}
            options={DEFAULT_LAYOUT_OPTIONS}
            aria-label="Default layout"
            size="sm"
            onChange={(defaultLayout: DefaultLayout) => updateSettings({ defaultLayout })}
          />
        </SettingsRow>
        <SettingsRow
          label="Startup range"
          description="Date range when the app loads or when you press Today."
        >
          <SegmentedControl
            value={settings.startupRange}
            options={STARTUP_RANGE_OPTIONS}
            aria-label="Startup range"
            size="sm"
            onChange={(startupRange: StartupRange) => updateSettings({ startupRange })}
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
        <SettingsRow label="Month swipe" description="Swipe or drag to change months in month view.">
          <Switch
            checked={settings.monthSwipeEnabled}
            aria-label="Enable month swipe"
            onChange={(monthSwipeEnabled) => updateSettings({ monthSwipeEnabled })}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Audit">
        <SettingsRow
          label="Target hours"
          description="Minimum and maximum daily hours for the green band."
        >
          <div className={styles.auditHours}>
            <NumberField
              value={settings.auditMinHours}
              min={AUDIT_HOURS_MIN}
              max={AUDIT_HOURS_MAX}
              aria-label="Minimum audit hours"
              onChange={(auditMinHours) => updateSettings({ auditMinHours })}
            />
            <span className={styles.auditHoursSep} aria-hidden>
              to
            </span>
            <NumberField
              value={settings.auditMaxHours}
              min={AUDIT_HOURS_MIN}
              max={AUDIT_HOURS_MAX}
              aria-label="Maximum audit hours"
              onChange={(auditMaxHours) => updateSettings({ auditMaxHours })}
            />
          </div>
        </SettingsRow>
        <SettingsRow
          label="Audit weekends"
          description="Apply hour bands to Saturday and Sunday. Off keeps weekends neutral."
        >
          <Switch
            checked={settings.auditWeekends}
            aria-label="Audit weekends"
            onChange={(auditWeekends) => updateSettings({ auditWeekends })}
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
        <SettingsRow label="Comments" description="Show worklog comment text in the drawer.">
          <Switch
            checked={settings.drawerShowComments}
            aria-label="Show worklog comments"
            onChange={(drawerShowComments) => updateSettings({ drawerShowComments })}
          />
        </SettingsRow>
        <SettingsRow label="Issue summary" description="Show issue title in grouped view.">
          <Switch
            checked={settings.drawerShowSummary}
            aria-label="Show issue summary"
            onChange={(drawerShowSummary) => updateSettings({ drawerShowSummary })}
          />
        </SettingsRow>
        <SettingsRow label="Open issues in">
          <SegmentedControl
            value={settings.issueLinkTarget}
            options={ISSUE_LINK_OPTIONS}
            aria-label="Open Jira issues in"
            size="sm"
            onChange={(issueLinkTarget: IssueLinkTarget) => updateSettings({ issueLinkTarget })}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Appearance">
        <SettingsRow label="Theme">
          <ThemePreferenceControl />
        </SettingsRow>
        <SettingsRow
          label="Reduced motion"
          description="Carousel and Today animations. System follows your OS preference."
        >
          <SegmentedControl
            value={settings.reducedMotion}
            options={REDUCED_MOTION_OPTIONS}
            aria-label="Reduced motion"
            size="sm"
            onChange={(reducedMotion: ReducedMotion) => updateSettings({ reducedMotion })}
          />
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
