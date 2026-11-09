// The review card on its pile (plan §1, §7, §8a), shared by Review and the practice round (D77): the
// deck band, the question with its marks, and once revealed the ink rule and the answer. When the
// answer appears it takes focus (so it's read out; Practice turns this off with focusAnswer={false}, keeps
// focus on its one button and announces the answer itself, QA-7 m1), and a long question scrolls the card body (never
// the page) so the rule sits 24px from the top. A body that overflows becomes a named, focusable region.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Card, Deck } from '../lib/db';
import { isShortAnswer, plainMarks, renderMarks } from '../lib/marks';

export function CardPile({
  card,
  deck,
  revealed,
  layers,
  cardKey,
  focusAnswer = true,
}: {
  card: Card;
  deck: Deck | undefined;
  revealed: boolean;
  layers: number;
  cardKey: string;
  /** Move focus to the answer when it appears (Review). Default true. */
  focusAnswer?: boolean;
}) {
  const answerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const ruleRef = useRef<HTMLHRElement>(null);
  const [overflows, setOverflows] = useState(false);
  const phaseKey = `${cardKey}:${revealed}`;

  useLayoutEffect(() => {
    if (!revealed) return;
    if (focusAnswer) answerRef.current?.focus({ preventScroll: true });
    const body = bodyRef.current;
    const rule = ruleRef.current;
    if (body && rule) {
      const ruleTop = rule.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop;
      if (ruleTop > body.scrollTop + body.clientHeight - 24) {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        body.scrollTo({ top: ruleTop - 24, behavior: reduce ? 'auto' : 'smooth' });
      }
    }
  }, [phaseKey, revealed, focusAnswer]);

  useEffect(() => {
    const body = bodyRef.current;
    const content = contentRef.current;
    if (!body || !content || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setOverflows(body.scrollHeight > body.clientHeight + 1));
    ro.observe(body);
    ro.observe(content);
    return () => ro.disconnect();
  }, [phaseKey]);

  return (
    <main className="card-stack">
      <div className="pile">
        <span className={layers >= 2 ? 'layer l2' : 'layer l2 is-gone'} aria-hidden="true" />
        <span className={layers >= 1 ? 'layer l1' : 'layer l1 is-gone'} aria-hidden="true" />
        <article className="rcard" key={cardKey}>
          <div className="rcard-band">
            <span>{deck?.name}</span>
          </div>
          <div className="rcard-body" ref={bodyRef} tabIndex={overflows ? 0 : undefined} role={overflows ? 'region' : undefined} aria-label={overflows ? 'Card' : undefined}>
            <div ref={contentRef}>
              <h1 className={plainMarks(card.front).trim().length > 140 ? 't-card is-long marks' : 't-card marks'}>{renderMarks(card.front, 'inline')}</h1>
              {revealed && (
                <>
                  <hr className="ink-rule" ref={ruleRef} />
                  <div className={isShortAnswer(card.back) ? 'answer marks is-short' : 'answer marks'} tabIndex={focusAnswer ? -1 : undefined} ref={answerRef}>
                    {renderMarks(card.back)}
                  </div>
                </>
              )}
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
