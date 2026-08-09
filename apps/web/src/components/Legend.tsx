import { formatDuration, type DurationFormat } from '../api';
import {
  formatAuditBandLabel,
  formatOverAuditLabel,
  formatUnderAuditLabel,
} from '../settings';
import { Divider } from './ui/Divider';

type Props = {
  showLegend: boolean;
  loading: boolean;
  totalSeconds: number | null;
  auditMinHours: number;
  auditMaxHours: number;
  durationFormat: DurationFormat;
};

export function Legend({
  showLegend,
  loading,
  totalSeconds,
  auditMinHours,
  auditMaxHours,
  durationFormat,
}: Props) {
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
            <i className="swatch ok" /> {formatAuditBandLabel(auditMinHours, auditMaxHours)}
          </span>
          <span className="legend-item">
            <i className="swatch bad" /> {formatUnderAuditLabel(auditMinHours)}
          </span>
          <span className="legend-item">
            <i className="swatch over" /> {formatOverAuditLabel(auditMaxHours)}
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
            {formatDuration(totalSeconds, durationFormat)}
          </strong>
        ) : null}
      </span>
    </div>
  );
}
