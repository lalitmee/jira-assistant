import type { CalendarLayout } from './DayChip';

type Props = {
  layout: CalendarLayout;
  onChange: (layout: CalendarLayout) => void;
};

const OPTIONS: Array<{ id: CalendarLayout; label: string }> = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
];

export function LayoutSwitcher({ layout, onChange }: Props) {
  return (
    <div className="layout-switcher" role="group" aria-label="Calendar layout">
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          className={`layout-switcher-btn${layout === opt.id ? ' active' : ''}`}
          aria-pressed={layout === opt.id}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
