import type { ReactNode } from 'react';
import styles from './SettingsRow.module.css';

type Props = {
  label: string;
  description?: string;
  children: ReactNode;
};

export function SettingsRow({ label, description, children }: Props) {
  return (
    <div className={styles.row}>
      <div className={styles.text}>
        <span className={styles.label}>{label}</span>
        {description ? <span className={styles.description}>{description}</span> : null}
      </div>
      <div className={styles.control}>{children}</div>
    </div>
  );
}
