import type { CategoryScore } from '@ats/core';

export function CategoryBars({ categories }: { categories: CategoryScore[] }) {
  return (
    <div className="category-bars">
      {categories.map((c) => {
        // A ratio, not a width. The bar is drawn full and squeezed with a transform, so
        // a score that changes on every keystroke never measures the page again.
        const filled = c.applicable && c.max ? c.score / c.max : 0;
        return (
          <div key={c.name} className={`category${c.applicable ? '' : ' category-off'}`}>
            <span className="category-label">{c.name}</span>
            <span className="category-track">
              <span className="category-fill" style={{ transform: `scaleX(${filled})` }} />
            </span>
            <span className="category-value">{c.applicable ? `${c.score}/${c.max}` : 'n/a'}</span>
          </div>
        );
      })}
    </div>
  );
}
