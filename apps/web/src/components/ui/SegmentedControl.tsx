import { useLayoutEffect, useRef, useState } from 'react';
import styles from './SegmentedControl.module.css';

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  value: T;
  options: Array<SegmentOption<T>>;
  onChange: (value: T) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  'aria-label': string;
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  disabled,
  size = 'md',
  'aria-label': ariaLabel,
}: Props<T>) {
  const groupRef = useRef<HTMLDivElement>(null);
  const [thumbStyle, setThumbStyle] = useState<{ width: number; transform: string }>({
    width: 0,
    transform: 'translateX(0)',
  });

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const idx = options.findIndex((o) => o.value === value);
    const btn = group.querySelectorAll('button')[idx] as HTMLButtonElement | undefined;
    if (!btn) return;
    setThumbStyle({
      width: btn.offsetWidth,
      transform: `translateX(${btn.offsetLeft - 3}px)`,
    });
  }, [value, options]);

  return (
    <div
      ref={groupRef}
      className={`${styles.segmented}${size === 'sm' ? ` ${styles.sm}` : ''}`}
      role="group"
      aria-label={ariaLabel}
    >
      <span
        className={styles.thumb}
        aria-hidden
        style={{ width: thumbStyle.width, transform: thumbStyle.transform }}
      />
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`${styles.option}${opt.value === value ? ` ${styles.isActive}` : ''}`}
          aria-pressed={opt.value === value}
          disabled={disabled}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
