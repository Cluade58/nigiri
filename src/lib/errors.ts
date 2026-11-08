// Dexie wraps IndexedDB errors; the original sits in `inner`. A full disk is a QuotaExceededError.
export function isQuotaError(err: unknown): boolean {
  let e: unknown = err;
  for (let i = 0; i < 4 && e && typeof e === 'object'; i++) {
    const name = (e as { name?: unknown }).name;
    if (name === 'QuotaExceededError') return true;
    e = (e as { inner?: unknown }).inner;
  }
  return false;
}
