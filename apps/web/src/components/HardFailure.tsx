import type { HardFailure as HardFailureType } from '@ats/core';
import { ScoreHeader } from './ScoreHeader.js';

const ADVICE: Record<HardFailureType['kind'], string> = {
  'no-text-layer':
    'This file has no readable text. Each detail that a hiring system needs is missing. Thus the system makes an empty record or refuses the file.',
  'engine-split':
    'Some readers get your text from this file and some readers get nothing. You cannot select the reader that an employer uses.',
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
                <td>{d.drawingOps || 'n/a'}</td>
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
                Almost all programs read DOCX more reliably than PDF. A DOCX file cannot hide its words in
                shapes.
              </span>
            </span>
            <span className="todo-gain">fix</span>
          </li>
          <li>
            <span className="todo-body">
              <b>Or paste your text here and score that</b>
              <span>
                This gives a score for your words and your layout. It does not correct the file. The file
                fails again when you send it.
              </span>
            </span>
            <span className="todo-gain">check</span>
          </li>
        </ol>
      </section>

      <p className="footnote">
        Different programs fail on this file in different ways. One reader gets your words but divides them
        into parts. A second reader gets nothing. Neither result puts your CV in front of a person.
      </p>
    </>
  );
}
