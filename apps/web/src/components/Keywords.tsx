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
      title={kw.muted ? 'Removed from the score' : 'Click to remove this term from the score'}
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
          There is no job advert, thus Job Match does not apply. The four groups that do apply carry {outOf}{' '}
          points between them, and your score is that result as a percentage. Add an advert and the score
          includes the 25 points of Job Match. A score with an advert and a score without one measure
          different things: do not compare them.
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
        Missing: {missing.length}. The advert uses these words. Your CV does not use them.
      </p>
      <div className="chips">
        {missing.length ? (
          missing.map((k) => <Chip key={k.term} kw={k} onToggle={onToggle} />)
        ) : (
          <span className="muted-text">None. Full coverage.</span>
        )}
      </div>

      <p className="muted-text" style={{ marginTop: 14 }}>
        Matched: {matched.length}.
      </p>
      <div className="chips">
        {matched.length ? (
          matched.map((k) => <Chip key={k.term} kw={k} onToggle={onToggle} />)
        ) : (
          <span className="muted-text">None.</span>
        )}
      </div>

      <p className="legend">
        Click a word to remove it from the score. Do this if the tool selected a filler word and not a
        requirement of the job.
      </p>
    </section>
  );
}
