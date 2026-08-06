import type { CalendarLayout } from './DayChip';
import { SegmentedControl } from './ui/SegmentedControl';

type Props = {
  layout: CalendarLayout;
  onChange: (layout: CalendarLayout) => void;
};

const OPTIONS = [
  { value: 'week' as CalendarLayout, label: 'Week' },
  { value: 'month' as CalendarLayout, label: 'Month' },
];

export function LayoutSwitcher({ layout, onChange }: Props) {
  return (
    <SegmentedControl
      value={layout}
      options={OPTIONS}
      aria-label="Calendar layout"
      onChange={onChange}
    />
  );
}
