import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type TransitionEvent,
} from 'react';

/** Fraction of page width required to commit a swipe to the neighbor page. */
const SWIPE_THRESHOLD = 0.4;
/** Horizontal velocity (px/ms) that commits a fling even below the distance threshold. */
const FLING_VELOCITY_PX_MS = 0.5;
/** Ignore tiny moves so day-chip clicks still register. */
const DRAG_DEADZONE_PX = 8;
/** Page slide duration when committing via buttons or swipe release. */
export const PAGE_TRANSITION_MS = 320;

export function focusIndex(pageKeys: string[], focusKey: string): number {
  const idx = pageKeys.indexOf(focusKey);
  if (idx >= 0) return idx;
  return Math.max(0, pageKeys.length - 1);
}

export function clampIndex(idx: number, length: number): number {
  return Math.min(Math.max(idx, 0), Math.max(0, length - 1));
}

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startT: number;
  offset: number;
  dragging: boolean;
  suppressClick: boolean;
};

type Options = {
  pageKeys: string[];
  focusKey: string;
  swipeEnabled?: boolean;
  loading?: boolean;
  canGoNext?: boolean;
  onFocusPage?: (key: string) => void;
  onFocusEarlier?: () => void;
  /** When true, `onFocusPage` runs after the slide transition ends. */
  deferFocusNotify?: boolean;
  /** Snap back to this index after a deferred transition (e.g. three-page month window). */
  resetIndexOnTransitionEnd?: number;
};

export function useHorizontalCarousel({
  pageKeys,
  focusKey,
  swipeEnabled = false,
  loading = false,
  canGoNext = true,
  onFocusPage,
  onFocusEarlier,
  deferFocusNotify = false,
  resetIndexOnTransitionEnd,
}: Options) {
  const viewportRef = useRef<HTMLDivElement>(null!);
  const indexRef = useRef(0);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);
  const internalNavRef = useRef(false);
  const pendingFocusRef = useRef<string | null>(null);

  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState(() => focusIndex(pageKeys, focusKey));
  const [pageWidth, setPageWidth] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [prevFocusKey, setPrevFocusKey] = useState(focusKey);
  const [prevPageKeysKey, setPrevPageKeysKey] = useState(() => pageKeys.join('|'));

  const pageKeysKey = pageKeys.join('|');
  if (focusKey !== prevFocusKey || pageKeysKey !== prevPageKeysKey) {
    const idx = focusIndex(pageKeys, focusKey);
    const prevIdx = indexRef.current;

    if (internalNavRef.current) {
      setPrevFocusKey(focusKey);
      setPrevPageKeysKey(pageKeysKey);
    } else {
      const focusChanged = focusKey !== prevFocusKey;
      const rangeChanged = pageKeysKey !== prevPageKeysKey;
      const adjacent = focusChanged && !rangeChanged && Math.abs(idx - prevIdx) === 1;

      setPrevFocusKey(focusKey);
      setPrevPageKeysKey(pageKeysKey);

      if (idx !== prevIdx) {
        setIndex(idx);
        setDragOffset(0);
        if (adjacent) setAnimating(true);
      } else if (rangeChanged) {
        setDragOffset(0);
      }
    }
  }

  useLayoutEffect(() => {
    indexRef.current = index;
  }, [index]);

  const maxIndex = Math.max(0, pageKeys.length - 1);
  const canPrev = index > 0;
  const canNext = canGoNext && index < maxIndex;

  const commitPage = useCallback(
    (nextIndex: number) => {
      const clamped = clampIndex(nextIndex, pageKeys.length);
      const key = pageKeys[clamped];
      if (!key) return;
      internalNavRef.current = true;
      setIndex(clamped);
      setDragOffset(0);
      setAnimating(true);
      if (key === focusKey) return;
      if (deferFocusNotify) {
        pendingFocusRef.current = key;
        return;
      }
      onFocusPage?.(key);
    },
    [deferFocusNotify, focusKey, onFocusPage, pageKeys],
  );

  const bounceHome = useCallback(() => {
    setDragOffset(0);
    setAnimating(true);
  }, []);

  const goToPage = useCallback(
    (nextIndex: number) => {
      if (dragRef.current?.dragging) return;
      if (nextIndex < 0) {
        onFocusEarlier?.();
        return;
      }
      if (nextIndex > maxIndex) return;
      commitPage(nextIndex);
    },
    [commitPage, maxIndex, onFocusEarlier],
  );

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    let placed = false;

    const place = (): boolean => {
      const w = el.clientWidth;
      if (w === 0) return false;
      setPageWidth(w);
      if (!placed) {
        const idx = focusIndex(pageKeys, focusKey);
        setIndex(idx);
        setDragOffset(0);
        setAnimating(false);
        setReady(true);
        placed = true;
      }
      return true;
    };

    place();

    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w === 0) return;
      if (!placed) {
        place();
        return;
      }
      setPageWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [pageKeys, focusKey, loading]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!swipeEnabled || e.button !== 0 || loading) return;
    const target = e.target as Element | null;
    if (target?.closest('button, a, input, textarea, select, [role="button"]')) return;

    const el = viewportRef.current;
    if (!el) return;
    suppressClickRef.current = false;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startT: e.timeStamp,
      offset: 0,
      dragging: false,
      suppressClick: false,
    };
    setAnimating(false);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const el = viewportRef.current;
    if (!el) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (!drag.dragging) {
      if (Math.abs(dx) < DRAG_DEADZONE_PX) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        dragRef.current = null;
        return;
      }
      drag.dragging = true;
      drag.suppressClick = true;
      suppressClickRef.current = true;
      el.setPointerCapture(e.pointerId);
    }

    let offset = dx;
    const atStart = indexRef.current <= 0 && offset > 0;
    const atEnd = indexRef.current >= maxIndex && offset < 0;
    if (atStart || atEnd) offset *= 0.35;

    drag.offset = offset;
    setDragOffset(offset);
  };

  const finishPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const el = viewportRef.current;
    if (el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    dragRef.current = null;

    if (!drag.dragging) {
      setDragOffset(0);
      return;
    }

    const width = el?.clientWidth || pageWidth;
    const offset = drag.offset;
    const elapsed = Math.max(1, e.timeStamp - drag.startT);
    const velocity = offset / elapsed;
    const threshold = width * SWIPE_THRESHOLD;

    let delta = 0;
    if (width > 0 && (offset <= -threshold || velocity <= -FLING_VELOCITY_PX_MS)) {
      delta = 1;
    } else if (width > 0 && (offset >= threshold || velocity >= FLING_VELOCITY_PX_MS)) {
      delta = -1;
    }

    if (delta !== 0) {
      const next = indexRef.current + delta;
      if (next < 0) {
        setDragOffset(0);
        setAnimating(true);
        onFocusEarlier?.();
        return;
      }
      const clamped = clampIndex(next, pageKeys.length);
      if (clamped !== indexRef.current) {
        commitPage(clamped);
        return;
      }
    }
    bounceHome();
  };

  const onClickCapture = (e: ReactMouseEvent) => {
    if (!suppressClickRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    suppressClickRef.current = false;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft' && canPrev) {
      e.preventDefault();
      goToPage(index - 1);
    } else if (e.key === 'ArrowRight' && canNext) {
      e.preventDefault();
      goToPage(index + 1);
    }
  };

  const trackStyle: CSSProperties = {
    transform: `translate3d(${-index * pageWidth + dragOffset}px, 0, 0)`,
    width: pageWidth > 0 ? pageWidth * pageKeys.length : undefined,
    ['--week-page-transition-ms' as string]: `${PAGE_TRANSITION_MS}ms`,
  };

  const onTrackTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== 'transform') return;

    const pendingFocus = pendingFocusRef.current;
    if (pendingFocus) {
      pendingFocusRef.current = null;
      onFocusPage?.(pendingFocus);
      if (resetIndexOnTransitionEnd != null) {
        setIndex(resetIndexOnTransitionEnd);
        setDragOffset(0);
      }
    }

    internalNavRef.current = false;
    setAnimating(false);
  };

  return {
    viewportRef,
    ready,
    pageWidth,
    index,
    animating,
    trackStyle,
    onTrackTransitionEnd,
    onPointerDown,
    onPointerMove,
    onPointerUp: finishPointer,
    onPointerCancel: finishPointer,
    onClickCapture,
    onKeyDown,
    goToPage,
  };
}
