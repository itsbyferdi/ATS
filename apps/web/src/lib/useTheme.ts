import { useCallback, useEffect, useRef, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

/**
 * Dark mode is a selected set of tokens, not an automatic inversion. The toggle
 * writes data-theme on <html>, which beats the media query in both directions.
 *
 * `flashing` drives the wash rows.gg plays over a theme change: without it every
 * surface, border and label transitions on its own and the switch reads as noise.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>('system');
  const [flashing, setFlashing] = useState(false);
  const timer = useRef<number>();

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const isDark = theme === 'dark' || (theme === 'system' && prefersDark());

  const toggle = useCallback(() => {
    setTheme(isDark ? 'light' : 'dark');
    setFlashing(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFlashing(false), 340);
  }, [isDark]);

  return { theme, isDark, toggle, flashing };
}
