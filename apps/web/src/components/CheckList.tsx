import { CATEGORY_ORDER, type CategoryName, type Check, type CheckStatus } from '@ats/core';

const ICON: Record<CheckStatus, string> = { pass: '✓', partial: '!', fail: '✕' };

/** Says who each group is really for, so nobody assumes the software grades their verbs. */
const AUDIENCE: Record<CategoryName, string> = {
  'Parse Safety': 'Whether software can read the file at all',
  Contact: 'Whether it can find a way to reach you',
  Structure: 'Whether it can work out your job history',
  'Impact Language': 'For the person reading, not the software',
  'Job Match': 'How closely you line up with this posting',
};

function CheckRow({ check }: { check: Check }) {
  return (
    <li className="check">
      <span className={`check-icon check-${check.status}`} aria-hidden>
        {ICON[check.status]}
      </span>
      <span className="check-body">
        <span className="check-label">{check.label}</span>
        <span className="check-detail">{check.detail}</span>
        {check.fix && (
          <span className="check-fix">
            <b>Fix:</b> {check.fix}
          </span>
        )}
      </span>
      <span className="check-points">
        <span className="visually-hidden">scored </span>
        {check.score}/{check.max}
      </span>
    </li>
  );
}

export function CheckList({ checks }: { checks: Check[] }) {
  return (
    <>
      {CATEGORY_ORDER.map((category) => {
        const own = checks.filter((c) => c.category === category);
        if (!own.length) return null;
        return (
          <section key={category} className="group">
            <h3>{category}</h3>
            <p className="legend" style={{ marginTop: -6 }}>{AUDIENCE[category]}</p>
            <ul className="check-list">
              {own.map((c) => (
                <CheckRow key={c.id} check={c} />
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}

export function PriorityFixes({ checks }: { checks: Check[] }) {
  if (!checks.length) return null;
  return (
    <section className="group">
      <h3>Do these first</h3>
      <ol className="todo">
        {checks.map((c) => (
          <li key={c.id}>
            <span className="todo-body">
              <b>{c.label}</b>
              <span>{c.fix}</span>
            </span>
            <span className="todo-gain">+{c.max - c.score}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
