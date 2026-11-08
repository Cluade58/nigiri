import { useEffect, useState, useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { loadSnapshot, type Snapshot } from '../lib/snapshot';
import { useApp } from './context';

/**
 * The clock for counts. Live queries rerun when data changes, not when time passes, so counts are
 * redone once a minute and whenever the app comes back on screen (spec §7, "Counts follow the clock").
 */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = window.setInterval(tick, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [intervalMs]);
  return now;
}

/** Everything Today and the deck page count, live: it reruns when the data or the clock changes. */
export function useSnapshot(now: Date): Snapshot | undefined {
  const { db } = useApp();
  const t = now.getTime();
  return useLiveQuery(() => loadSnapshot(db, new Date(t)), [db, t]);
}

/** A CSS media query as state. From 48em, Today's Add card moves from the phone bar into Study (UI-BENTO-1). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const WIDE = '(min-width: 48em)';
