import type { ReactNode } from 'react';
import styles from './SettingsSection.module.css';

type Props = {
  title: string;
  children: ReactNode;
};

export function SettingsSection({ title, children }: Props) {
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.card}>{children}</div>
    </section>
  );
}
