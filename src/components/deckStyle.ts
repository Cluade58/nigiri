import type { CSSProperties } from 'react';
import type { DeckColour } from '../lib/db';

/** A deck's highlighter and pen, as the mockups set them: style="--hl: var(--hl-green); --pen: var(--pen-green)". */
export function deckStyle(colour: DeckColour | undefined): CSSProperties | undefined {
  if (!colour) return undefined;
  return { '--hl': `var(--hl-${colour})`, '--pen': `var(--pen-${colour})` } as CSSProperties;
}
