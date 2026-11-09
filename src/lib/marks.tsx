// Simple formatting by marks (round 1 plan §7, D75): a new line is a line break, **text** is bold
// (an unclosed ** stays as typed, nothing nests), and lines that start with exactly "- " make one
// bulleted list. No toolbar. The text is only ever turned into React elements, never into HTML, so
// anything typed (even "<script>") stays text. Pure.
import { createElement, Fragment, type ReactNode } from 'react';

type Piece = { bold: boolean; text: string };
type Block = { kind: 'lines'; lines: string[] } | { kind: 'list'; items: string[] };

const LIST = /^- /;

/** The one line under Back on Add card and in the edit sheet. The asterisks are shown as typed. */
export const FORMAT_HINT = 'Use **bold**, or start a line with - for a list.';

/** A line's bold parts: each ** with a later ** on the same line makes a pair; the rest is literal. */
export function boldPieces(line: string): Piece[] {
  const out: Piece[] = [];
  let rest = line;
  let plain = '';
  for (;;) {
    const open = rest.indexOf('**');
    if (open === -1) break;
    const close = rest.indexOf('**', open + 2);
    if (close === -1) break;
    const inner = rest.slice(open + 2, close);
    if (inner.length === 0) {
      // "****" has nothing to make bold: keep the marks and look further on.
      plain += rest.slice(0, open + 4);
      rest = rest.slice(open + 4);
      continue;
    }
    plain += rest.slice(0, open);
    if (plain) out.push({ bold: false, text: plain });
    plain = '';
    out.push({ bold: true, text: inner });
    rest = rest.slice(close + 2);
  }
  plain += rest;
  if (plain) out.push({ bold: false, text: plain });
  return out;
}

function blocksOf(text: string): Block[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  for (const line of lines) {
    const last = blocks[blocks.length - 1];
    if (LIST.test(line)) {
      const item = line.slice(2);
      if (last?.kind === 'list') last.items.push(item);
      else blocks.push({ kind: 'list', items: [item] });
    } else if (last?.kind === 'lines') last.lines.push(line);
    else blocks.push({ kind: 'lines', lines: [line] });
  }
  return blocks;
}

function inline(line: string, key: string): ReactNode[] {
  return boldPieces(line).map((p, i) => (p.bold ? createElement('strong', { key: `${key}b${i}` }, p.text) : createElement(Fragment, { key: `${key}t${i}` }, p.text)));
}

function linesOf(lines: string[], key: string): ReactNode[] {
  const out: ReactNode[] = [];
  lines.forEach((line, i) => {
    if (i > 0) out.push(createElement('br', { key: `${key}br${i}` }));
    out.push(...inline(line, `${key}l${i}`));
  });
  return out;
}

/**
 * The card's text as React elements. 'block' (the answer, inside a <div>): <p> runs and <ul>/<li>.
 * 'inline' (the question, inside its <h1>, which may only hold phrasing content): the same layout
 * drawn with spans, the list keeping its list and listitem roles.
 */
export function renderMarks(text: string, mode: 'block' | 'inline' = 'block'): ReactNode[] {
  return blocksOf(text).map((b, i) => {
    const key = `m${i}`;
    if (b.kind === 'lines') return createElement(mode === 'block' ? 'p' : 'span', { key, className: 'm-p' }, ...linesOf(b.lines, key));
    if (mode === 'block') return createElement('ul', { key, className: 'm-ul' }, ...b.items.map((it, j) => createElement('li', { key: `${key}i${j}` }, ...inline(it, `${key}i${j}`))));
    return createElement(
      'span',
      { key, className: 'm-ul', role: 'list' },
      ...b.items.map((it, j) => createElement('span', { key: `${key}i${j}`, className: 'm-li', role: 'listitem' }, ...inline(it, `${key}i${j}`))),
    );
  });
}

/** One line of plain text, for clamped rows: ** pairs removed, a leading "- " dropped, new lines as spaces. */
export function plainMarks(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) =>
      boldPieces(LIST.test(line) ? line.slice(2) : line)
        .map((p) => p.text)
        .join(''),
    )
    .join(' ');
}

/** Plan §8a: a short answer (80 characters or fewer once plain, one line, no list) reads larger. */
export function isShortAnswer(text: string): boolean {
  const t = text.replace(/\r\n?/g, '\n');
  if (t.includes('\n') || LIST.test(t)) return false;
  return plainMarks(t).length <= 80;
}
