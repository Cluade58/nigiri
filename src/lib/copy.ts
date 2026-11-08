// Words on screen. Numbers keep their noun with a no-break space (P-RUN-6): "35 cards", "1 minute".
export const NBSP = '\u00A0';

export function plural(n: number, one: string, many: string = `${one}s`): string {
  return `${n}${NBSP}${n === 1 ? one : many}`;
}

export const cards = (n: number) => plural(n, 'card');

/** "Not saved. Tap Save card again." Every failed save names the button to tap (spec §6). */
export function notSaved(button: string): string {
  return `Not saved. Tap ${button} again.`;
}

/** Out of space (QuotaExceededError): the same words as mockups/new-deck.html?full. */
export const OUT_OF_SPACE = 'Not saved. Free up space on your phone, then try again.';
