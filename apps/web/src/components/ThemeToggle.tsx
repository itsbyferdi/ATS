/**
 * Sun and moon share one 16px box and cross-fade with a slight rotation, using the
 * springy curve from rows.gg. The icon shows the theme you will get, and the label
 * says so too — the picture never carries the meaning alone.
 */
export function ThemeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-pressed={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden focusable="false">
        <g
          className="icon-sun"
          style={{ opacity: isDark ? 0 : 1, transform: isDark ? 'rotate(-70deg) scale(0.5)' : 'none', transformOrigin: 'center' }}
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        >
          <circle cx="8" cy="8" r="3.1" />
          <path d="M8 .9v1.7M8 13.4v1.7M15.1 8h-1.7M2.6 8H.9M13 3l-1.2 1.2M4.2 11.8L3 13M13 13l-1.2-1.2M4.2 4.2L3 3" />
        </g>
        <g
          className="icon-moon"
          style={{ opacity: isDark ? 1 : 0, transform: isDark ? 'none' : 'rotate(70deg) scale(0.5)', transformOrigin: 'center' }}
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M13.6 9.4A5.8 5.8 0 0 1 6.1 2.2a5.9 5.9 0 1 0 7.5 7.2Z" />
        </g>
      </svg>
    </button>
  );
}
