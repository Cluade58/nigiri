// Ask the browser to keep the data (spec §3): after the first successful save each launch, while
// persisted() is false, and never inside a transaction (callers run this after theirs commits).
let asked = false;

export async function requestPersistence(): Promise<void> {
  if (asked) return;
  asked = true;
  try {
    const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined;
    if (!storage?.persisted || !storage.persist) return;
    if (await storage.persisted()) return;
    await storage.persist();
  } catch {
    // Not offered here (an old browser, a private window): nothing to do, and nothing was lost.
  }
}

/** Tests only: start a new "launch". */
export function resetPersistenceForTests(): void {
  asked = false;
}
