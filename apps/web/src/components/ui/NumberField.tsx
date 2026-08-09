import styles from './NumberField.module.css';

type Props = {
  value: number;
  min: number;
  max: number;
  step?: number;
  'aria-label': string;
  onChange: (value: number) => void;
};

export function NumberField({ value, min, max, step = 1, 'aria-label': ariaLabel, onChange }: Props) {
  return (
    <input
      type="number"
      className={styles.input}
      value={value}
      min={min}
      max={max}
      step={step}
      aria-label={ariaLabel}
      onChange={(e) => {
        const parsed = Number(e.target.value);
        if (Number.isNaN(parsed)) return;
        onChange(parsed);
      }}
    />
  );
}
