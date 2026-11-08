import { useEffect, type RefObject } from 'react';
import { useLocation } from 'react-router';

/**
 * focus-on-route-change: arriving from another screen, focus starts at the screen's heading, so a
 * screen reader reads where you are. A fresh load (no earlier screen) leaves focus alone.
 * The heading needs tabIndex={-1}.
 */
export function useArrivalFocus(ref: RefObject<HTMLElement | null>): void {
  const { key } = useLocation();
  useEffect(() => {
    if (key !== 'default') ref.current?.focus({ preventScroll: true });
  }, [key, ref]);
}
