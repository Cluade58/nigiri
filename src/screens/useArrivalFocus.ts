import { useEffect, useRef, type RefObject } from 'react';
import { useLocation } from 'react-router';

/**
 * focus-on-route-change: arriving from another screen, focus starts at the screen's heading, so a
 * screen reader reads where you are. A fresh load (no earlier screen) leaves focus alone.
 * The heading needs tabIndex={-1}. A screen that first renders a loading placeholder passes `ready`
 * (false until the heading is in the page), so focus lands once it is (CR-4 m1).
 */
export function useArrivalFocus(ref: RefObject<HTMLElement | null>, ready = true): void {
  const { key } = useLocation();
  // Once per arrival: if `ready` flickers later (data reloading), focus isn't pulled back to the heading.
  const done = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || key === 'default' || done.current === key || !ref.current) return;
    done.current = key;
    ref.current.focus({ preventScroll: true });
  }, [key, ready, ref]);
}
