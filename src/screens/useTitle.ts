import { useEffect } from 'react';

/** The tab and app-switcher name for each screen, as the mockups name them. */
export function useTitle(title: string): void {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
