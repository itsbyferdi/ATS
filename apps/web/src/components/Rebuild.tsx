import { useMemo, useState } from 'react';
import { Radio } from '@base-ui-components/react/radio';
import { RadioGroup } from '@base-ui-components/react/radio-group';
import {
  rebuildCv,
  renderHtml,
  scoreResume,
  TEMPLATES,
  type TemplateId,
} from '@ats/core';

import { exportDocx, exportMarkdown, exportPdf, exportText } from '../lib/exporters.js';

interface Props {
  text: string;
  jobDescription: string;
  /** The score of the file as it stands, so the change is shown rather than claimed. */
  currentScore: number;
}

export function Rebuild({ text, jobDescription, currentScore }: Props) {
  const [id, setId] = useState<TemplateId>('classic');
  const [busy, setBusy] = useState<string | null>(null);

  const template = TEMPLATES.find((t) => t.id === id)!;
  const result = useMemo(() => rebuildCv(text, template), [text, template]);
  const newScore = useMemo(
    () => scoreResume({ text: result.text, jobDescription }).score,
    [result.text, jobDescription],
  );
  const html = useMemo(() => renderHtml(result.doc, template), [result.doc, template]);

  const run = async (name: string, fn: () => void | Promise<void>) => {
    setBusy(name);
    try {
      await fn();
    } catch (err) {
      alert(`Could not export: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(null);
    }
  };

  if (!result.usable) {
    return (
      <section className="card">
        <h2>There is not enough text to rebuild from</h2>
        <p className="hint">
          Almost nothing readable came out of this file, so there is nothing to put back together.
        </p>
        <ul className="problem-list">
          {result.problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <p className="hint" style={{ marginBottom: 0 }}>
          This is nearly always the file, not your CV. Rebuild the original in Word or Google Docs, or paste your
          text into the first step and try again.
        </p>
      </section>
    );
  }

  const delta = newScore - currentScore;

  return (
    <>
      {/* Base UI's RadioGroup: arrow keys move between templates and only the selected
          one sits in the tab order, which is what a radio group is supposed to do. */}
      {/* A partial rebuild is still worth having, as long as it says so plainly. The
          previous version refused outright and left the user with nothing. */}
      {result.quality === 'partial' && (
        <div className="notice">
          <p className="notice-head">
            <span aria-hidden>!</span> Read this one over before you send it
          </p>
          <ul className="problem-list">
            {result.problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <p className="notice-foot">
            Every word from your original is still here — anything that could not be placed under a heading is at
            the end, under “Additional information”. Nothing was thrown away.
          </p>
        </div>
      )}

      <RadioGroup
        className="template-picker"
        aria-label="Template"
        value={id}
        onValueChange={(v) => setId(v as TemplateId)}
      >
        {TEMPLATES.map((t) => (
          <Radio.Root key={t.id} value={t.id} className="template-option">
            <span className="template-name">{t.name}</span>
            <span className="template-blurb">{t.blurb}</span>
          </Radio.Root>
        ))}
      </RadioGroup>

      <div className="card rebuild-summary">
        <div className="delta">
          <span className="delta-from">{currentScore}</span>
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className={`delta-to${delta > 0 ? ' delta-up' : ''}`}>{newScore}</span>
        </div>
        <p className="hint" style={{ margin: 0 }}>
          {delta > 0
            ? `Rebuilding as ${template.name} gains ${delta} point${delta === 1 ? '' : 's'}, mostly by using headings and dates a parser recognises.`
            : delta === 0
              ? `Your CV already scores as well as the rebuild. ${template.name} changes the order and the wrapper, not the score.`
              : `${template.name} scores ${-delta} lower here. Pick another template, or keep your current file.`}
        </p>
      </div>

      <div className="button-row export-row">
        <button type="button" className="button" disabled={busy !== null} onClick={() => run('docx', () => exportDocx(result.doc, template))}>
          {busy === 'docx' ? 'Building…' : 'Download DOCX'}
        </button>
        <button type="button" className="button button-ghost" disabled={busy !== null} onClick={() => run('pdf', () => exportPdf(result.doc, template))}>
          Save as PDF
        </button>
        <button type="button" className="button button-ghost" disabled={busy !== null} onClick={() => run('md', () => exportMarkdown(result.doc, template))}>
          Markdown
        </button>
        <button type="button" className="button button-ghost" disabled={busy !== null} onClick={() => run('txt', () => exportText(result.doc, template))}>
          Plain text
        </button>
      </div>
      <p className="legend" style={{ marginTop: 4 }}>
        Send the DOCX to application forms — it is the format that survives parsing best. The PDF is printed by
        your browser, so it carries a real text layer. Markdown is for editing, not for sending.
      </p>

      <section className="group">
        <h3>Preview</h3>
        <p className="legend" style={{ marginTop: 0 }}>
          This is the whole document. {result.wordsLost > 0 && `${result.wordsLost} words of formatting and separators were dropped; `}
          nothing that could not be placed was thrown away — it goes under “Additional information”.
        </p>
        <div className="cv-preview" dangerouslySetInnerHTML={{ __html: html }} />
      </section>
    </>
  );
}
