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
  /** The score of the current file. Thus the interface shows the change. */
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
      alert(`The program could not make the file. ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(null);
    }
  };

  if (!result.usable) {
    return (
      <section className="card">
        <h2>There is not sufficient text to make a new CV</h2>
        <p className="hint">
          This file gave almost no readable text. Thus there is nothing to put together.
        </p>
        <ul className="problem-list">
          {result.problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <p className="hint" style={{ marginBottom: 0 }}>
          Almost always the file has the fault, not your CV. Make the original file again in Word or Google
          Docs. As an alternative, put your text in the first step and try again.
        </p>
      </section>
    );
  }

  const delta = newScore - currentScore;

  return (
    <>
      {/* A result that is not complete is still useful, if the tool says so clearly. The
          old version refused the file and gave the user nothing. */}
      {result.quality === 'partial' && (
        <div className="notice">
          <p className="notice-head">
            <span aria-hidden>!</span> Read this CV again before you send it
          </p>
          <ul className="problem-list">
            {result.problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <p className="notice-foot">
            Each word from your file is here. The text that the tool could not put below a heading is at the
            end, below “Additional information”. The tool discarded nothing.
          </p>
        </div>
      )}

      {/* The RadioGroup of Base UI: the arrow keys move between the templates, and only
          the selected template is in the tab order. A radio group must operate in this
          way. */}
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
            ? `The ${template.name} template adds ${delta} point${delta === 1 ? '' : 's'}. It uses headings and dates that a program can read.`
            : delta === 0
              ? `Your CV has the same score as the new version. The ${template.name} template changes the order and the format, not the score.`
              : `The ${template.name} template gives ${-delta} points less. Select a different template or keep your current file.`}
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
        Send the DOCX file to application forms. Programs read this format most reliably. Your browser prints
        the PDF file, thus it contains real text. Use Markdown to edit your CV, not to send it.
      </p>

      <section className="group">
        <h3>Preview</h3>
        <p className="legend" style={{ marginTop: 0 }}>
          This is the full document. {result.wordsLost > 0 && `The tool removed ${result.wordsLost} words of formatting and separators. `}
          The tool discarded no content. Text with no section goes below “Additional information”.
        </p>
        <div className="cv-preview" dangerouslySetInnerHTML={{ __html: html }} />
      </section>
    </>
  );
}
