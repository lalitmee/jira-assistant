import styles from './SelectField.module.css';

export type SelectOption<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  value: T;
  options: Array<SelectOption<T>>;
  onChange: (value: T) => void;
  disabled?: boolean;
  'aria-label': string;
};

export function SelectField<T extends string>({
  value,
  options,
  onChange,
  disabled,
  'aria-label': ariaLabel,
}: Props<T>) {
  return (
    <select
      className={styles.select}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
