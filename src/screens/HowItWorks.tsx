// "How Nigiri picks your cards" (D43; mockups/how-it-works.html): the one optional explainer, from a
// row in Settings. The only screen that may name FSRS. "With a test date" ships now, with Test mode.
// UK spelling stays ("maths"), as everywhere else in Nigiri. Numbers keep their noun (no-break spaces).
import { useRef } from 'react';
import { Link } from 'react-router';
import { BackIcon } from '../components/Icons';
import { useArrivalFocus } from './useArrivalFocus';
import { useTitle } from './useTitle';

export function HowItWorks() {
  useTitle('How Nigiri picks your cards');
  const heading = useRef<HTMLHeadingElement>(null);
  useArrivalFocus(heading);
  return (
    <main className="screen explain is-column">
      <header className="form-bar">
        <Link className="btn-text back-link" to="/settings">
          <BackIcon />
          Settings
        </Link>
        <span />
        <span />
      </header>

      <h1 className="t-section" ref={heading} tabIndex={-1}>
        How Nigiri picks your cards
      </h1>

      <section aria-labelledby="ratings">
        <h2 className="t-title" id="ratings">
          The four ratings
        </h2>
        <dl className="ratings">
          <div>
            <dt>Again</dt>
            <dd>you forgot.</dd>
          </div>
          <div>
            <dt>Hard</dt>
            <dd>right, but slow or unsure. It still counts as remembered.</dd>
          </div>
          <div>
            <dt>Good</dt>
            <dd>right, with some effort.</dd>
          </div>
          <div>
            <dt>Easy</dt>
            <dd>right, with no effort.</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="comes-back">
        <h2 className="t-title" id="comes-back">
          When a card comes back
        </h2>
        <p>Tap Again and the card comes back after 1{'\u00A0'}minute. Hard on a card you're still learning waits 90{'\u00A0'}seconds.</p>
        <p>
          Every other wait is at least a{'\u00A0'}day. Nigiri works it out from how you've answered that card before, aiming for you to remember about 9
          {'\u00A0'}in{'\u00A0'}10 cards when they come back.
        </p>
        <p>
          Easy aims a little higher, about 19{'\u00A0'}in{'\u00A0'}20. So an Easy card still waits longer than Good would, just not as long as it could.
        </p>
        <p>There's no daily limit. Review as much as you like.</p>
        <p className="t-secondary">The maths is called FSRS, if you're curious.</p>
      </section>

      <section aria-labelledby="with-test">
        <h2 className="t-title" id="with-test">
          With a test date
        </h2>
        {/* LS-1 C1: "at least a day early" was false with the test today. D63: the share is a pace, not a limit. */}
        <p>
          Cards not studied yet are spread over the days before the test, so they've all come up by the day before. With the test today, they all come up
          today.
        </p>
        <p>It's a pace, not a limit: the deck's page lets you study the rest early.</p>
        <p>Take a day off, and the rest spread out over the days left.</p>
        <p>Move the date, and only that plan changes. Cards you've studied keep their schedule: a test never moves them.</p>
      </section>
    </main>
  );
}
