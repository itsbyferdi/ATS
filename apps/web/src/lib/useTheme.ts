import { useCallback, useEffect, useRef, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

/**
 * Dark mode is a selected set of tokens, not an automatic inversion. The toggle
 * writes data-theme on <html>, which beats the media query in both directions.
 *
 * A theme change moves the colour, the background, the border and the shadow of nearly
 * every element at the same moment. If each of those transitions runs, they all run at
 * once and at different speeds, and the change smears. Thus the switch turns every
 * transition off for one frame, changes the tokens, and turns the transitions back on.
 * The colour then snaps.
 *
 * `flashing` drives the wash from rows.gg over the top of that snap. The wash is what
 * makes the change read as one event. The two work together: the snap removes the
 * smear, the wash gives the change a shape.
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
    const style = document.createElement('style');
    style.append(
      document.createTextNode('*,*::before,*::after{transition:none !important}'),
    );
    document.head.appendChild(style);

    setTheme(isDark ? 'light' : 'dark');
    setFlashing(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFlashing(false), 340);

    // Read a layout value to force the browser to apply the rule above before the
    // tokens change. Without the read the browser can batch both and the rule does
    // nothing. Two frames later the tokens are painted and the rule can go.
    void document.body.offsetHeight;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => style.remove());
    });
  }, [isDark]);

  return { theme, isDark, toggle, flashing };
}
