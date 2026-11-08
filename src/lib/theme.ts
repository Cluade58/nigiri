// The four themes (D39). Saved on this phone only, outside the database, never exported (D39d).
// index.html applies the saved theme before the first paint; keep its key and colours in step.
// Settings → Theme calls saveTheme(); Restore never touches it.
export const THEMES = ['snow', 'mist', 'cream', 'midnight'] as const;
export type Theme = (typeof THEMES)[number];

/** The user's own names for the four trios (D39), as Settings lists them. */
export const THEME_NAMES: Record<Theme, string> = {
  snow: 'Ink\u00A0+ Cobalt\u00A0+ Snow',
  mist: 'Plum\u00A0+ Berry\u00A0+ Mist',
  cream: 'Espresso\u00A0+ Amber\u00A0+ Cream',
  midnight: 'Midnight\u00A0+ Ice\u00A0+ Sky',
};
export const THEME_KEY = 'nigiri:theme';
export const DEFAULT_THEME: Theme = 'snow';

/** The page colour of each theme, for <meta name="theme-color">. */
export const THEME_PAGE: Record<Theme, string> = {
  snow: '#F5F7FC',
  mist: '#FAF7FB',
  cream: '#FBF8F1',
  midnight: '#141B24',
};

export function isTheme(v: unknown): v is Theme {
  return typeof v === 'string' && (THEMES as readonly string[]).includes(v);
}

/** Missing, unknown or unreadable means Snow. */
export function readTheme(): Theme {
  try {
    const v = globalThis.localStorage?.getItem(THEME_KEY);
    return isTheme(v) ? v : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/**
 * The theme on screen now. In a private window a picked theme applies but can't be saved, so the
 * page, not storage, says which row is checked.
 */
export function currentTheme(): Theme {
  const v = document.documentElement.getAttribute('data-theme');
  return isTheme(v) ? v : readTheme();
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_PAGE[theme]);
}

export function saveTheme(theme: Theme): void {
  applyTheme(theme);
  try {
    globalThis.localStorage?.setItem(THEME_KEY, theme);
  } catch {
    // A private window: the theme applies until the app closes.
  }
}
