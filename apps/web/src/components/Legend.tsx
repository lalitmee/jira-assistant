import { formatDuration } from '../api';
import { Divider } from './ui/Divider';

type Props = {
  showLegend: boolean;
  loading: boolean;
  totalSeconds: number | null;
};

export function Legend({ showLegend, loading, totalSeconds }: Props) {
  return (
    <div className="legend">
      {showLegend ? (
        <>
          <span className="legend-item">
            <i className="swatch weekend" /> Weekend
          </span>
          <span className="legend-item">
            <i className="swatch future" /> Future
          </span>
          <span className="legend-item">
            <i className="swatch ok" /> 6h–8h
          </span>
          <span className="legend-item">
            <i className="swatch bad" /> Under 6h
          </span>
          <span className="legend-item">
            <i className="swatch over" /> Over 8h
          </span>
          <Divider orientation="vertical" legend />
        </>
      ) : null}
      <span
        className="legend-item legend-total"
        aria-busy={loading || undefined}
        aria-live="polite"
      >
        Total:{' '}
        {loading && totalSeconds == null ? (
          <span className="legend-total-placeholder" aria-hidden="true">
            —
          </span>
        ) : totalSeconds != null ? (
          <strong className={loading ? 'legend-total-stale' : undefined}>
            {formatDuration(totalSeconds)}
          </strong>
        ) : null}
      </span>
    </div>
  );
}
