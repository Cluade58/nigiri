// Storage that never answers (CR-1 hypothesis, R1.10): after 10 seconds it counts as storage that won't
// open, so D25's screen shows instead of a blank page. Fake timers, so the test doesn't wait.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OPEN_TIMEOUT_MS, OpenTimeoutError, withTimeout } from '../src/app/startup';

afterEach(() => {
  vi.useRealTimers();
});

describe('opening storage', () => {
  it('gives up after 10 seconds when the open never settles', async () => {
    vi.useFakeTimers();
    expect(OPEN_TIMEOUT_MS).toBe(10_000);
    let settled = false;
    const p = withTimeout(new Promise<never>(() => {}), OPEN_TIMEOUT_MS).finally(() => {
      settled = true;
    });
    const result = expect(p).rejects.toBeInstanceOf(OpenTimeoutError);
    await vi.advanceTimersByTimeAsync(OPEN_TIMEOUT_MS - 1);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await result;
  });

  it('passes an open that finishes in time, or its own error, straight through', async () => {
    await expect(withTimeout(Promise.resolve('open'), OPEN_TIMEOUT_MS)).resolves.toBe('open');
    const blocked = new Error('blocked');
    await expect(withTimeout(Promise.reject(blocked), OPEN_TIMEOUT_MS)).rejects.toBe(blocked);
  });
});
