import type { CategoryScore } from '@ats/core';

export function CategoryBars({ categories }: { categories: CategoryScore[] }) {
  return (
    <div className="category-bars">
      {categories.map((c) => {
        const pct = c.applicable && c.max ? (c.score / c.max) * 100 : 0;
        return (
          <div key={c.name} className={`category${c.applicable ? '' : ' category-off'}`}>
            <span className="category-label">{c.name}</span>
            <span className="category-track">
              <span className="category-fill" style={{ width: `${pct}%` }} />
            </span>
            <span className="category-value">{c.applicable ? `${c.score}/${c.max}` : 'n/a'}</span>
          </div>
        );
      })}
    </div>
  );
}
