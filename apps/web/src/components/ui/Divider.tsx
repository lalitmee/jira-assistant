import styles from './Divider.module.css';

export type DividerOrientation = 'horizontal' | 'vertical';

type Props = {
  orientation?: DividerOrientation;
  /** Horizontal divider with menu popover inset margins. */
  inset?: boolean;
  /** Vertical divider sized for the legend toolbar. */
  legend?: boolean;
  className?: string;
};

function joinClass(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function Divider({
  orientation = 'horizontal',
  inset = false,
  legend = false,
  className,
}: Props) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={joinClass(
        styles.root,
        orientation === 'vertical' ? styles.vertical : styles.horizontal,
        inset && styles.inset,
        legend && styles.legend,
        className,
      )}
    />
  );
}
