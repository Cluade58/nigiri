// Opening storage and creating the one scheduler, once per launch (spec §7: await it before the first review).
import { createDb, type NigiriDb } from '../lib/db';
import { createScheduler } from '../lib/scheduler';
import type { AppServices } from './context';

/**
 * Which part failed decides the screen (D61(2)): storage that won't open gets D25's screen; a
 * scheduler that won't load gets the crash screen, because the cards themselves are fine.
 */
export class StartupError extends Error {
  constructor(
    readonly part: 'storage' | 'scheduler',
    readonly cause: unknown,
  ) {
    super(`Nigiri couldn't start: ${part}`);
  }
}

let starting: Promise<AppServices> | null = null;

/**
 * Storage that never answers counts as storage that won't open (CR-1 hypothesis): after 10 seconds
 * D25's screen shows, and Try again starts over. A blocked or stuck IndexedDB can leave `open()`
 * pending for good, which would leave the page blank with no way out.
 */
export const OPEN_TIMEOUT_MS = 10_000;

export class OpenTimeoutError extends Error {
  constructor() {
    super('Storage did not open in time.');
  }
}

/** Resolves or rejects with `p`, or rejects with OpenTimeoutError after `ms`, whichever comes first. */
export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new OpenTimeoutError()), ms);
    p.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(id);
        reject(e);
      },
    );
  });
}

/** Dev-only fixtures (?fail=...): the branch is dropped from the build with the rest of import.meta.env.DEV. */
function devFail(): string | null {
  return import.meta.env.DEV ? new URLSearchParams(location.search).get('fail') : null;
}

/** Dev only (?fail=writes): every save fails, for screenshots of the "Not saved" lines. Reads still work. */
function failWrites(db: NigiriDb): void {
  const original = db.transaction.bind(db) as (...args: unknown[]) => Promise<unknown>;
  (db as unknown as { transaction: (...args: unknown[]) => Promise<unknown> }).transaction = (...args: unknown[]) =>
    typeof args[0] === 'string' && args[0].startsWith('rw') ? Promise.reject(new Error('dev: writes made to fail')) : original(...args);
}

/** Dev only (?fail=slow-writes): every save waits 1.5 s first, to check what typing during a save does (QA-1 F2). */
function slowWrites(db: NigiriDb): void {
  const original = db.transaction.bind(db) as (...args: unknown[]) => Promise<unknown>;
  (db as unknown as { transaction: (...args: unknown[]) => Promise<unknown> }).transaction = (...args: unknown[]) =>
    typeof args[0] === 'string' && args[0].startsWith('rw')
      ? new Promise((r) => setTimeout(r, 1500)).then(() => original(...args))
      : original(...args);
}

async function start(): Promise<AppServices> {
  const fail = devFail();
  if (fail === 'storage') throw new StartupError('storage', new Error('dev: storage made to fail'));
  const db = createDb();
  try {
    // Dev only (?fail=open-hang): an open that never settles, to check the timeout.
    const opening = import.meta.env.DEV && fail === 'open-hang' ? new Promise<never>(() => {}) : db.open();
    await withTimeout(opening, OPEN_TIMEOUT_MS);
  } catch (e) {
    db.close();
    throw new StartupError('storage', e);
  }
  let scheduler;
  try {
    if (fail === 'scheduler') throw new Error('dev: scheduler made to fail');
    scheduler = await createScheduler();
  } catch (e) {
    db.close();
    throw new StartupError('scheduler', e);
  }
  if (import.meta.env.DEV) {
    // Dev-only fixtures for screenshots (?seed=...). This branch and its module are left out of the build.
    const { seedFromUrl, themeFromUrl } = await import('../dev/seed');
    themeFromUrl();
    await seedFromUrl(db, scheduler);
    if (fail === 'writes') failWrites(db);
    if (fail === 'slow-writes') slowWrites(db);
  }
  return { db, scheduler };
}

/** Starts once; after a failure, the next call (Try again) starts over. */
export function startServices(): Promise<AppServices> {
  starting ??= start().catch((e: unknown) => {
    starting = null;
    throw e;
  });
  return starting;
}
