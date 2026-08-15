import type { EngineResult, ExtractedFields } from '@ats/core';

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="field">
      <dt>{label}</dt>
      <dd className={value ? '' : 'field-empty'}>{value ?? 'not detected'}</dd>
    </div>
  );
}

interface Props {
  fields: ExtractedFields;
  text: string;
  engines: EngineResult[];
  enginesDisagree: boolean;
}

export function MachineView({ fields, text, engines, enginesDisagree }: Props) {
  return (
    <section className="group">
      <h3>What the machine keeps</h3>

      {enginesDisagree && (
        <p className="alert">
          <b>The two PDF readers disagree about this file.</b> One got text out and one got nothing. That means
          some employers will read your CV and some will receive a blank page. Rebuild the file before you send
          it.
        </p>
      )}

      <dl className="fields">
        <Field label="Name" value={fields.name} />
        <Field label="Email" value={fields.email} />
        <Field label="Phone" value={fields.phone} />
        <Field label="Location" value={fields.location} />
        <Field label="LinkedIn" value={fields.linkedin} />
        <Field label="Portfolio" value={fields.portfolio} />
        <Field
          label="Date ranges"
          value={fields.dateRanges.length ? fields.dateRanges.map((d) => d.raw).join(' · ') : null}
        />
        <div className="field">
          <dt>Word count</dt>
          <dd>{fields.wordCount}</dd>
        </div>
        <div className="field">
          <dt>Bullets</dt>
          <dd>{fields.bulletCount}</dd>
        </div>
      </dl>

      {engines.length > 0 && (
        <table className="engines">
          <caption>The same file, read by different software</caption>
          <thead>
            <tr>
              <th scope="col">Reader</th>
              <th scope="col">Characters</th>
              <th scope="col">Text runs</th>
              <th scope="col">Shapes drawn</th>
              <th scope="col">Reading order</th>
            </tr>
          </thead>
          <tbody>
            {engines.map((e) =>
              // A reader that never ran is not a reader that found nothing. Showing its
              // empty numbers in red made an optional, uninstalled tool look like a fault
              // in the file.
              e.ok ? (
                <tr key={e.engine}>
                  <th scope="row">{e.engine}</th>
                  <td className={e.diagnostics.characters ? '' : 'field-empty'}>{e.diagnostics.characters}</td>
                  <td className={e.diagnostics.textRuns ? '' : 'field-empty'}>{e.diagnostics.textRuns}</td>
                  <td>{e.diagnostics.drawingOps || '—'}</td>
                  <td className={e.diagnostics.tagged === false ? 'field-empty' : ''}>
                    {e.diagnostics.tagged === undefined ? '—' : e.diagnostics.tagged ? 'stated' : 'guessed'}
                  </td>
                </tr>
              ) : (
                <tr key={e.engine} className="engine-off">
                  <th scope="row">{e.engine}</th>
                  <td colSpan={4}>Not installed, so it did not run</td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      )}

      <details>
        <summary>Show the plain text an employer's software receives</summary>
        <pre className="raw-text">{text}</pre>
      </details>
    </section>
  );
}
