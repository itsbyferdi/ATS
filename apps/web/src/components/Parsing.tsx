export type StageId = 'read' | 'engines' | 'compare' | 'score';

export const STAGES: { id: StageId; label: string }[] = [
  { id: 'read', label: 'Opening the file' },
  { id: 'engines', label: 'Reading it two different ways' },
  { id: 'compare', label: 'Comparing what each reader got' },
  { id: 'score', label: 'Scoring' },
];

/**
 * A spinner says "wait". This says what it is doing, which is more honest and happens
 * to teach the point of the tool: the file is read twice, by two different engines, and
 * the disagreement between them is the finding.
 */
export function Parsing({ filename, stage }: { filename: string; stage: StageId }) {
  const current = STAGES.findIndex((s) => s.id === stage);

  return (
    <div className="parsing">
      <div className="parsing-bar" role="progressbar" aria-label={`Reading ${filename}`}>
        <i />
      </div>
      <ol className="stages">
        {STAGES.map((s, i) => {
          const state = i < current ? 'done' : i === current ? 'active' : 'waiting';
          return (
            <li key={s.id} className={`stage stage-${state}`}>
              <span className="stage-dot" aria-hidden>
                {state === 'done' ? '✓' : ''}
              </span>
              <span>
                {s.label}
                {state === 'active' && <span className="visually-hidden"> — in progress</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
