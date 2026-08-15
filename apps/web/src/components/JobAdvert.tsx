import { useState } from 'react';
import { SAMPLE_JOBS } from '@ats/core';

interface Props {
  value: string;
  onChange: (text: string) => void;
}

/**
 * The advert, by link, by paste or by sample.
 *
 * A sample is a real advert for a real field, not a demonstration. It scores exactly the
 * same way a pasted advert scores, and the panel says so, because a number that arrives
 * the instant you press a button invites the question "did it really do the work?".
 */
export function JobAdvert({ value, onChange }: Props) {
  const [url, setUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      onChange(body.text);
      setUrl('');
    } catch {
      setError('The link reader does not operate. Start it with "npm run dev:api", or put the advert below.');
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="side-block">
      <p className="side-lede">
        The advert gives the Job Match group its 25 points: the keywords, the job title and how recent your use
        of them is. Without an advert the other four groups carry the whole score.
      </p>

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
        value={value}
        placeholder="…or paste the text of the advert here"
        onChange={(e) => onChange(e.target.value)}
      />

      <p className="side-label">Or put a real advert in, to see how the group works:</p>
      <div className="chips">
        {SAMPLE_JOBS.map((s) => (
          <button key={s.id} type="button" className="chip chip-clear" onClick={() => onChange(s.text)}>
            {s.label}
          </button>
        ))}
      </div>
      <p className="legend">
        A sample fills the box above with the full text of that advert. It then scores the same way your own
        advert scores. Nothing is stored and nothing is pre-calculated.
      </p>

      {value.trim() && (
        <button type="button" className="button button-ghost side-button" onClick={() => onChange('')}>
          Remove this advert
        </button>
      )}
    </div>
  );
}
