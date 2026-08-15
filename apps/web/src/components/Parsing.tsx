export type StageId = 'read' | 'engines' | 'compare' | 'score';

export const STAGES: { id: StageId; label: string }[] = [
  { id: 'read', label: 'Opening the file' },
  { id: 'engines', label: 'Reading it two different ways' },
  { id: 'compare', label: 'Comparing what each reader got' },
  { id: 'score', label: 'Scoring' },
];

/**
 * A spinner tells the user to wait. This component gives the current operation. It is
 * more accurate, and it shows the purpose of the tool: two different readers read the
 * file, and a difference between them is the result.
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
                {state === 'done' && (
                  <svg className="tick" width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                    <path d="M1.5 5.2 3.9 7.6 8.5 2.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span>
                {s.label}
                {state === 'active' && <span className="visually-hidden">, in progress</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
