export type Step = 'cv' | 'job' | 'results' | 'rebuild';

export const STEPS: { id: Step; label: string }[] = [
  { id: 'cv', label: 'Your CV' },
  { id: 'job', label: 'The job' },
  { id: 'results', label: 'Results' },
  { id: 'rebuild', label: 'Rebuild' },
];

interface Props {
  current: Step;
  hasResume: boolean;
  onGo: (step: Step) => void;
}

/**
 * Three steps, always visible. You can jump back to any step you have already
 * reached, but not forward past one you have not — so the rail is a map, not a
 * set of buttons that fail silently.
 */
export function StepRail({ current, hasResume, onGo }: Props) {
  const index = STEPS.findIndex((s) => s.id === current);

  return (
    <nav className="rail" aria-label="Progress">
      {STEPS.map((s, i) => {
        const reachable = i === 0 || hasResume;
        const done = i < index && reachable;
        return (
          <div key={s.id} style={{ display: 'contents' }}>
            {i > 0 && <span className="rail-line" aria-hidden />}
            <button
              type="button"
              className={`rail-step${done ? ' rail-step-done' : ''}`}
              aria-current={current === s.id ? 'step' : undefined}
              disabled={!reachable}
              onClick={() => reachable && onGo(s.id)}
            >
              <span className="rail-num" aria-hidden>
                {done ? '✓' : i + 1}
              </span>
              {s.label}
            </button>
          </div>
        );
      })}
    </nav>
  );
}
