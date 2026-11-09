// The practice round (D77): every card in a deck, shuffled once at the start. It reads only; nothing in
// this file or the practice screen writes to storage.

/** A shuffled copy (Fisher–Yates). `random` is Math.random unless a test passes its own. */
export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
