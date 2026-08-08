import styles from './RangeTrigger.module.css';

type Props = {
  label: string;
  open: boolean;
  labelledBy?: string;
  onClick: () => void;
  /** Tighter typography for the header range bar. */
  compact?: boolean;
  /** Stacked year + range for compact header display. */
  parts?: { year: string; range: string };
};

export function RangeTrigger({ label, open, labelledBy, onClick, compact = false, parts }: Props) {
  return (
    <button
      type="button"
      className={compact ? styles.headerTrigger : styles.trigger}
      onClick={onClick}
      aria-expanded={open}
      aria-labelledby={labelledBy}
      aria-label={parts ? `${parts.range}, ${parts.year}` : undefined}
    >
      {compact && parts ? (
        <span className="week-nav-label-stack">
          <span className="week-nav-year">{parts.year}</span>
          <span className="week-nav-range">{parts.range}</span>
        </span>
      ) : (
        <span className={compact ? styles.headerValue : styles.value}>{label}</span>
      )}
      <svg className={styles.chevron} viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M7.4 9.4a1.2 1.2 0 0 1 1.7 0L12 12.3l2.9-2.9a1.2 1.2 0 1 1 1.7 1.7l-3.75 3.75a1.2 1.2 0 0 1-1.7 0L7.4 11.1a1.2 1.2 0 0 1 0-1.7z"
        />
      </svg>
    </button>
  );
}
