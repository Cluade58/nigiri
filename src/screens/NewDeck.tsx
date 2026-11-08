// New deck (mockups/new-deck.html). A name and one of the six colours; nothing is picked for you.
// After Create deck, Add card opens in the new deck. A failed save keeps the name and colour (D17).
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useApp } from '../app/context';
import { CheckColour } from '../components/Icons';
import { deckStyle } from '../components/deckStyle';
import { OUT_OF_SPACE, notSaved } from '../lib/copy';
import { DECK_COLOURS, type DeckColour } from '../lib/db';
import { isQuotaError } from '../lib/errors';
import { createDeck } from '../lib/saves';
import { useTitle } from './useTitle';

const COLOUR_NAMES: Record<DeckColour, string> = {
  green: 'Green',
  blue: 'Blue',
  pink: 'Pink',
  orange: 'Orange',
  yellow: 'Yellow',
  purple: 'Purple',
};

export function NewDeck() {
  useTitle('New deck');
  const { db } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [colour, setColour] = useState<DeckColour | null>(null);
  const [nameError, setNameError] = useState(false);
  const [colourError, setColourError] = useState(false);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  /** Set in the same tick as the tap, so a second submit before the next render makes no second deck (CR-1 M4). */
  const savingRef = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const firstColour = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus({ preventScroll: true });
  }, []);

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (savingRef.current) return;
    setStatus('');
    const noName = !name.trim();
    setNameError(noName);
    setColourError(!colour);
    if (noName) {
      nameRef.current?.focus();
      return;
    }
    if (!colour) {
      firstColour.current?.focus();
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const deck = await createDeck(db, { name, colour }, new Date());
      // The guard stays on: this screen is leaving.
      navigate(`/deck/${deck.id}/add`, { replace: true });
    } catch (err) {
      setStatus(isQuotaError(err) ? OUT_OF_SPACE : notSaved('Create deck'));
      savingRef.current = false;
      setSaving(false);
    }
  }

  // The keyboard's next key goes on to the colours while none is picked, instead of showing an error.
  function onNameKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
    e.preventDefault();
    if (name.trim() && !colour) firstColour.current?.focus();
    else void submit();
  }

  return (
    <div className="screen page-flow is-form">
      <header className="form-bar">
        <Link className="btn-text" to="/">
          Cancel
        </Link>
        <h1>New deck</h1>
        <span />
      </header>

      <form className="form grow" id="new-deck-form" noValidate onSubmit={submit}>
        <div className="field">
          <label htmlFor="deck-name">Deck name</label>
          <input
            ref={nameRef}
            className="input"
            id="deck-name"
            type="text"
            autoComplete="off"
            enterKeyHint="next"
            placeholder="For example, Chem unit 3"
            value={name}
            aria-invalid={nameError || undefined}
            aria-describedby={nameError ? 'name-error' : undefined}
            onKeyDown={onNameKey}
            onChange={(e) => {
              setName(e.target.value);
              if (e.target.value.trim()) setNameError(false);
            }}
          />
          {nameError && (
            <p className="field-error" id="name-error">
              Write a name for the deck.
            </p>
          )}
        </div>

        <fieldset className="field" aria-describedby={colourError ? 'colour-error' : undefined}>
          <legend>Colour</legend>
          <div className="colours" aria-invalid={colourError || undefined}>
            {DECK_COLOURS.map((c, i) => (
              <label className="colour" key={c} style={deckStyle(c)}>
                <input
                  ref={i === 0 ? firstColour : undefined}
                  type="radio"
                  name="colour"
                  value={c}
                  aria-label={COLOUR_NAMES[c]}
                  checked={colour === c}
                  onChange={() => {
                    setColour(c);
                    setColourError(false);
                  }}
                />
                <span className="fill" />
                <CheckColour />
              </label>
            ))}
          </div>
          {colourError && (
            <p className="field-error" id="colour-error">
              Pick a colour
            </p>
          )}
        </fieldset>
      </form>

      <div className="action-zone">
        <p className={status ? 'status is-error' : 'status'} role="status">
          {status}
        </p>
        <button className="btn btn-primary" type="submit" form="new-deck-form" disabled={saving}>
          Create deck
        </button>
      </div>
    </div>
  );
}
