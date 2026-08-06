import type { DayBucket } from '../api';
import { DayChip, eachDateInclusive } from './DayChip';

type Props = {
  from: string;
  to: string;
  days: Record<string, DayBucket>;
  selected: string | null;
  loading?: boolean;
  onSelect: (iso: string) => void;
};

export function DayStrip({ from, to, days, selected, loading, onSelect }: Props) {
  const dates = eachDateInclusive(from, to);

  return (
    <div className={`day-strip-wrap${loading ? ' is-loading' : ''}`}>
      {loading ? (
        <div className="strip-loading" role="status" aria-live="polite">
          <div className="spinner" />
          <span>Fetching worklogs from Jira…</span>
        </div>
      ) : null}
      <div className="day-strip" role="list" aria-label="Days in selected range">
        {dates.map((iso) => (
          <div key={iso} role="listitem">
            <DayChip iso={iso} bucket={days[iso]} selected={selected === iso} onSelect={onSelect} />
          </div>
        ))}
      </div>
    </div>
  );
}
