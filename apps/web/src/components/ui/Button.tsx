import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'ghost' | 'secondary' | 'icon';
export type ButtonSize = 'sm' | 'md';

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps | 'children'> & {
    as?: 'button';
  };

type ButtonAsAnchor = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps | 'children'> & {
    as: 'a';
    href: string;
    variant?: Exclude<ButtonVariant, 'icon'>;
  };

export type ButtonProps = ButtonAsButton | ButtonAsAnchor;

function joinClass(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

function sizeClass(variant: ButtonVariant, size: ButtonSize): string {
  if (variant === 'icon') return size === 'md' ? styles.iconMd : styles.iconSm;
  return styles[size];
}

/** Shared button for pills (primary/ghost/secondary) and circular icon nav controls. */
export function Button(props: ButtonProps) {
  const { variant = 'primary', size = 'md', className, children, as = 'button', ...rest } = props;

  const isIcon = variant === 'icon';
  const cls = joinClass(
    styles.base,
    isIcon ? styles.icon : styles[variant],
    sizeClass(variant, size),
    className,
  );

  if (as === 'a') {
    const anchorProps = rest as Omit<ButtonAsAnchor, keyof CommonProps | 'as' | 'children'>;
    return (
      <a className={cls} {...anchorProps}>
        {children}
      </a>
    );
  }

  const buttonProps = rest as Omit<ButtonAsButton, keyof CommonProps | 'as' | 'children'>;
  const { type = 'button', ...buttonRest } = buttonProps;
  return (
    <button type={type} className={cls} {...buttonRest}>
      {children}
    </button>
  );
}

export { styles as buttonStyles };
