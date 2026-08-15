import type { HardFailure as HardFailureType } from '@ats/core';
import { ScoreHeader } from './ScoreHeader.js';

const ADVICE: Record<HardFailureType['kind'], string> = {
  'no-text-layer':
    'There is no readable text in this file. Every detail a hiring system wants is missing, so it either creates an empty record or refuses the upload.',
  'engine-split':
    'Some readers get your text out of this file and some get nothing. You do not get to choose which one an employer uses.',
};

export function HardFailure({ failure }: { failure: HardFailureType }) {
  const engines = failure.engines.length ? failure.engines : [failure.diagnostics];

  return (
    <>
      <ScoreHeader
        score={0}
        band={{ key: 'high-risk', min: 0, label: failure.headline, advice: ADVICE[failure.kind] }}
      />

      <section className="group">
        <h3>What each reader got</h3>
        <table className="engines">
          <caption>The same file, read by different software</caption>
          <thead>
            <tr>
              <th scope="col">Reader</th>
              <th scope="col">Characters</th>
              <th scope="col">Text runs</th>
              <th scope="col">Shapes drawn</th>
            </tr>
          </thead>
          <tbody>
            {engines.map((d) => (
              <tr key={d.engine}>
                <th scope="row">{d.engine}</th>
                <td className={d.characters ? '' : 'field-empty'}>{d.characters}</td>
                <td className={d.textRuns ? '' : 'field-empty'}>{d.textRuns}</td>
                <td>{d.drawingOps || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <ul className="check-list">
          <li className="check">
            <span className="check-icon check-fail" aria-hidden>✕</span>
            <span className="check-body">
              <span className="check-label">The page draws letters as shapes, not as text</span>
              <span className="check-detail">{failure.explanation}</span>
              <span className="check-fix">
                <b>Fix:</b> {failure.fix}
              </span>
            </span>
          </li>
        </ul>
      </section>

      <section className="group">
        <h3>What to do right now</h3>
        <ol className="todo">
          <li>
            <span className="todo-body">
              <b>Send the DOCX instead</b>
              <span>
                Almost everything reads DOCX more reliably than PDF, and a DOCX cannot hide its words inside
                shapes.
              </span>
            </span>
            <span className="todo-gain">fix</span>
          </li>
          <li>
            <span className="todo-body">
              <b>Or paste your text here and score that</b>
              <span>
                That scores your wording and layout. It does not fix the file — the file still fails when you
                upload it.
              </span>
            </span>
            <span className="todo-gain">check</span>
          </li>
        </ol>
      </section>

      <p className="footnote">
        Different software fails on this file in different ways. One reader salvages your words but breaks them
        apart. Another gets nothing at all. Neither result puts you in front of a person.
      </p>
    </>
  );
}
