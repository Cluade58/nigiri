// Mockups only, no app logic and no saved data.
// ?step=1 shows build step 1: Settings and the test line wait for steps 2 and 3, and deck rows
// show their card count instead of a test day.
// ?theme=mist|cream|midnight previews a theme (D39). Without it, every screen is Ink + Cobalt + Snow,
// the default. Both carry over to the links on the page, so a preview survives a tap.
(function () {
  const params = new URLSearchParams(location.search);
  const THEMES = ['snow', 'mist', 'cream', 'midnight'];
  const theme = params.get('theme');
  if (THEMES.includes(theme) && theme !== 'snow') document.documentElement.dataset.theme = theme;
  const step1 = params.get('step') === '1';
  if (step1) {
    document.documentElement.dataset.step = '1';
    document.querySelectorAll('[data-step1-text]').forEach((el) => { el.textContent = el.dataset.step1Text; });
  }
  window.mockupCarry = function () {
    const t = document.documentElement.dataset.theme;
    document.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href');
      if (!/\.html(\?|$)/.test(href)) return;
      const u = new URL(href, location.href);
      if (step1) u.searchParams.set('step', '1');
      if (t) u.searchParams.set('theme', t); else u.searchParams.delete('theme');
      a.href = u.href;
    });
  };
  window.mockupCarry();
})();
