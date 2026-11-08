import { createContext, useContext } from 'react';
import type { NigiriDb } from '../lib/db';
import type { Scheduler } from '../lib/scheduler';

export interface AppServices {
  db: NigiriDb;
  scheduler: Scheduler;
}

export const AppContext = createContext<AppServices | null>(null);

/** The open database and the one scheduler. Only rendered once both are ready. */
export function useApp(): AppServices {
  const v = useContext(AppContext);
  if (!v) throw new Error('useApp outside the app');
  return v;
}
