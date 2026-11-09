// Round 1 plan §7: formatting by marks. renderMarks builds React elements only (never HTML), so the
// markup below is React's own rendering of them; plainMarks is the one-line text for clamped rows.
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { isShortAnswer, plainMarks, renderMarks } from '../src/lib/marks';

const html = (text: string, mode: 'block' | 'inline' = 'block') => renderToStaticMarkup(createElement(Fragment, null, ...renderMarks(text, mode)));

describe('renderMarks', () => {
  it('bold', () => {
    expect(html('The **mitochondria** makes ATP')).toBe('<p class="m-p">The <strong>mitochondria</strong> makes ATP</p>');
    expect(html('**a** and **b**')).toBe('<p class="m-p"><strong>a</strong> and <strong>b</strong></p>');
  });
  it('an unclosed ** stays as typed, and **** makes nothing bold', () => {
    expect(html('2 ** 3 is 8')).toBe('<p class="m-p">2 ** 3 is 8</p>');
    // Pairs are taken left to right; a last ** without a partner stays literal.
    expect(html('**a** b **')).toBe('<p class="m-p"><strong>a</strong> b **</p>');
    expect(html('a **** b')).toBe('<p class="m-p">a **** b</p>');
  });
  it('lines starting with exactly "- " make one list', () => {
    expect(html('Products:\n- 2 ATP\n- 6 NADH\n- **4** CO2')).toBe(
      '<p class="m-p">Products:</p><ul class="m-ul"><li>2 ATP</li><li>6 NADH</li><li><strong>4</strong> CO2</li></ul>',
    );
    expect(html('-not a list\n -nor this')).toBe('<p class="m-p">-not a list<br/> -nor this</p>');
  });
  it('line breaks, and text after a list', () => {
    expect(html('one\ntwo')).toBe('<p class="m-p">one<br/>two</p>');
    expect(html('- a\n- b\nafter')).toBe('<ul class="m-ul"><li>a</li><li>b</li></ul><p class="m-p">after</p>');
    expect(html('a\r\nb')).toBe('<p class="m-p">a<br/>b</p>');
  });
  it('mixed', () => {
    expect(html('**Krebs** cycle\n- 2 ATP\n\n- end')).toBe(
      '<p class="m-p"><strong>Krebs</strong> cycle</p><ul class="m-ul"><li>2 ATP</li></ul><p class="m-p"></p><ul class="m-ul"><li>end</li></ul>',
    );
  });
  it('typed HTML stays text', () => {
    expect(html('<script>alert(1)</script> **<b>x</b>**')).toBe('<p class="m-p">&lt;script&gt;alert(1)&lt;/script&gt; <strong>&lt;b&gt;x&lt;/b&gt;</strong></p>');
    expect(html('- <img src=x onerror=alert(1)>')).toBe('<ul class="m-ul"><li>&lt;img src=x onerror=alert(1)&gt;</li></ul>');
  });
  it('inline mode (inside the question heading) uses spans with list roles', () => {
    expect(html('Q\n- a', 'inline')).toBe('<span class="m-p">Q</span><span class="m-ul" role="list"><span class="m-li" role="listitem">a</span></span>');
  });
});

describe('plainMarks and short answers', () => {
  it('drops the marks for one-line rows', () => {
    expect(plainMarks('The **mitochondria**\n- 2 ATP\n- 6 NADH')).toBe('The mitochondria 2 ATP 6 NADH');
    expect(plainMarks('2 ** 3')).toBe('2 ** 3');
    expect(plainMarks('<script>')).toBe('<script>');
  });
  it('short: 80 characters or fewer once plain, one line, no list', () => {
    expect(isShortAnswer('In the cytoplasm')).toBe(true);
    expect(isShortAnswer(`**${'a'.repeat(80)}**`)).toBe(true);
    expect(isShortAnswer('a'.repeat(81))).toBe(false);
    expect(isShortAnswer('one\ntwo')).toBe(false);
    expect(isShortAnswer('- a')).toBe(false);
  });
});
