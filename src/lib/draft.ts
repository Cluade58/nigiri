// One half-typed card, kept on this phone outside the database and tied to its deck (D24).
// It's never a card: never counted and never exported. Every read and write survives storage
// that's missing or blocked (a private window): then there's simply no draft.
export const DRAFT_KEY = 'nigiri:draft';

export interface Draft {
  deckId: string;
  front: string;
  back: string;
}

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readDraft(): Draft | null {
  try {
    const raw = storage()?.getItem(DRAFT_KEY);
    if (!raw) return null;
    const v: unknown = JSON.parse(raw);
    if (typeof v !== 'object' || v === null) return null;
    const { deckId, front, back } = v as Record<string, unknown>;
    if (typeof deckId !== 'string' || typeof front !== 'string' || typeof back !== 'string') return null;
    return { deckId, front, back };
  } catch {
    return null;
  }
}

export function draftFor(deckId: string): Draft | null {
  const d = readDraft();
  return d && d.deckId === deckId ? d : null;
}

/** Saves what's typed. Two empty sides clear the draft for that deck. */
export function writeDraft(draft: Draft): void {
  try {
    if (!draft.front && !draft.back) {
      clearDraft(draft.deckId);
      return;
    }
    storage()?.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Storage full or blocked: the typing stays on screen; only the draft is lost.
  }
}

/** A successful save or Close clears the draft, but only that deck's: another deck's draft waits. */
export function clearDraft(deckId: string): void {
  try {
    if (readDraft()?.deckId === deckId) storage()?.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to clear.
  }
}
