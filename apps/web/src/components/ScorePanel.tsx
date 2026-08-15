import { useState } from 'react';
import { SAMPLE_JOBS, type ScoreReport } from '@ats/core';

import { CategoryBars } from './CategoryBars.js';
import { ScoreDetails } from './ScoreDetails.js';

interface Props {
  jobDescription: string;
  onJobDescription: (text: string) => void;
  report: ScoreReport | null;
  /** True once the person has asked for a score. */
  checked: boolean;
  onCheck: () => void;
  onToggleKeyword: (term: string) => void;
}

/**
 * The panel beside the document: the advert, the control that asks for a score, and the
 * result in short. The full breakdown opens over the top, because it is long and it is
 * something you read once and then act on.
 */
export function ScorePanel({
  jobDescription,
  onJobDescription,
  report,
  checked,
  onCheck,
  onToggleKeyword,
}: Props) {
  const [url, setUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const importUrl = async () => {
    if (!url.trim()) return;
    setFetching(true);
    setError(null);
    try {
      const res = await fetch('/api/job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(25_000),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.text) {
        setError(body?.error ?? 'The tool could not read that link. Copy the advert and put it below.');
        return;
      }
      onJobDescription(body.text);
      setUrl('');
    } catch {
      setError('The link reader does not operate. Start it with "npm run dev:api", or put the advert below.');
    } finally {
      setFetching(false);
    }
  };

  return (
    <aside className="side" aria-label="Score">
      <section className="side-block">
        <h2 className="side-title">The job advert</h2>

        <div className="url-row">
          <label className="visually-hidden" htmlFor="jd-url">Link to the advert</label>
          <input
            id="jd-url"
            type="url"
            className="url-input"
            placeholder="Paste a link"
            value={url}
            disabled={fetching}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void importUrl();
              }
            }}
          />
          <button
            type="button"
            className="button button-ghost"
            disabled={fetching || !url.trim()}
            onClick={() => void importUrl()}
          >
            {fetching ? 'Reading…' : 'Read'}
          </button>
        </div>
        {error && <p className="url-error">{error}</p>}

        <label className="visually-hidden" htmlFor="jd-text">The text of the advert</label>
        <textarea
          id="jd-text"
          className="side-textarea"
          value={jobDescription}
          placeholder="…or paste the text of the advert here"
          onChange={(e) => onJobDescription(e.target.value)}
        />

        <p className="legend" style={{ marginBottom: 6 }}>Or use a sample:</p>
        <div className="chips">
          {SAMPLE_JOBS.map((s) => (
            <button key={s.id} type="button" className="chip" onClick={() => onJobDescription(s.text)}>
              {s.label}
            </button>
          ))}
        </div>
      </section>

      <section className="side-block">
        <button type="button" className="button check-button" onClick={onCheck}>
          Check the ATS score
        </button>

        {!checked || !report ? (
          <p className="legend" style={{ marginTop: 10 }}>
            The score covers the format, the structure and the words. Add the advert first to also get a score
            for the keywords and the job title.
          </p>
        ) : (
          <>
            <div className="score-summary">
              <span className={`score-figure score-${report.band.key}`}>{report.score}</span>
              <span className="score-of">of 100</span>
              <span className="score-band">{report.band.label}</span>
            </div>
            <p className="legend" style={{ marginTop: 0 }}>{report.band.advice}</p>

            <CategoryBars categories={report.categories} />

            <button type="button" className="button button-ghost details-button" onClick={() => setOpen(true)}>
              View details
            </button>

            <ScoreDetails
              open={open}
              onOpenChange={setOpen}
              report={report}
              onToggleKeyword={onToggleKeyword}
            />
          </>
        )}
      </section>
    </aside>
  );
}
