// Mockups only, no app logic. ?step=1 shows build step 1: Settings and the test line
// wait for steps 2 and 3, and deck rows show their card count instead of a test day.
(function () {
  if (new URLSearchParams(location.search).get('step') !== '1') return;
  document.documentElement.dataset.step = '1';
  document.querySelectorAll('[data-step1-text]').forEach((el) => { el.textContent = el.dataset.step1Text; });
  document.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (!/\.html(\?|$)/.test(href)) return;
    const u = new URL(href, location.href);
    u.searchParams.set('step', '1');
    a.href = u.href;
  });
})();
