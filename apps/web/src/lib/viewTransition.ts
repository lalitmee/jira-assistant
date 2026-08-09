import { flushSync } from 'react-dom';

export function runViewTransition(update: () => void, skip = false): void {
  if (skip || typeof document.startViewTransition !== 'function') {
    update();
    return;
  }

  document.startViewTransition(() => {
    flushSync(update);
  });
}
