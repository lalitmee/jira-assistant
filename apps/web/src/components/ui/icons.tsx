import type { SVGAttributes } from 'react';

type IconProps = SVGAttributes<SVGSVGElement>;

export function ChevronLeft(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M15.4 4.6a1.2 1.2 0 0 1 0 1.7L10.7 11l4.7 4.7a1.2 1.2 0 1 1-1.7 1.7l-5.5-5.5a1.2 1.2 0 0 1 0-1.7l5.5-5.5a1.2 1.2 0 0 1 1.7 0z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ChevronRight(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M8.6 4.6a1.2 1.2 0 0 1 1.7 0l5.5 5.5a1.2 1.2 0 0 1 0 1.7l-5.5 5.5a1.2 1.2 0 1 1-1.7-1.7l4.7-4.7-4.7-4.7a1.2 1.2 0 0 1 0-1.7z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Material-style back arrow (shaft + head), not a chevron. */
export function ArrowLeft(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor" />
    </svg>
  );
}
