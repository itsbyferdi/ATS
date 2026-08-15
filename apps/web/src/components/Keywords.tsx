import type { Keyword } from '@ats/core';

interface Props {
  keywords: Keyword[];
  hasJobDescription: boolean;
  outOf: number;
  onToggle: (term: string) => void;
}

function Chip({ kw, onToggle }: { kw: Keyword; onToggle: (t: string) => void }) {
  return (
    <button
      type="button"
      className={`chip ${kw.matched ? 'chip-yes' : 'chip-no'}${kw.muted ? ' chip-muted' : ''}`}
      onClick={() => onToggle(kw.term)}
      aria-pressed={kw.muted}
      title={kw.muted ? 'Struck out — excluded from the score' : 'Click to exclude this term from the score'}
    >
      <span aria-hidden>{kw.matched ? '✓' : '✕'}</span> {kw.term}
    </button>
  );
}

export function Keywords({ keywords, hasJobDescription, outOf, onToggle }: Props) {
  if (!hasJobDescription) {
    return (
      <section className="group">
        <h3>Keywords from the posting</h3>
        <p className="muted-text">
          No job description yet, so Job Match is switched off and your score is worked out of {outOf}. Paste a
          posting in to score the other 25 points.
        </p>
      </section>
    );
  }

  const missing = keywords.filter((k) => !k.matched);
  const matched = keywords.filter((k) => k.matched);

  return (
    <section className="group">
      <h3>Keywords from the posting</h3>

      <p className="muted-text">
        Missing — {missing.length}. These are the words this posting leans on that your CV never says.
      </p>
      <div className="chips">
        {missing.length ? (
          missing.map((k) => <Chip key={k.term} kw={k} onToggle={onToggle} />)
        ) : (
          <span className="muted-text">None. Full coverage.</span>
        )}
      </div>

      <p className="muted-text" style={{ marginTop: 14 }}>
        Matched — {matched.length}.
      </p>
      <div className="chips">
        {matched.length ? (
          matched.map((k) => <Chip key={k.term} kw={k} onToggle={onToggle} />)
        ) : (
          <span className="muted-text">None.</span>
        )}
      </div>

      <p className="legend">
        Click any word to cross it out and drop it from the score. Use that when this tool has picked up filler
        rather than something the job actually asks for.
      </p>
    </section>
  );
}
