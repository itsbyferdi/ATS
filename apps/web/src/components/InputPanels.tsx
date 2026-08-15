import { useRef, useState, type DragEvent } from 'react';
import { SAMPLE_JOBS } from '@ats/core';

interface ResumePanelProps {
  value: string;
  status: string;
  onChange: (text: string) => void;
  onFile: (file: File) => void;
}

export function ResumePanel({ value, status, onChange, onFile }: ResumePanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const stop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <section className="card">
      <button
        type="button"
        className={`dropzone${over ? ' dropzone-over' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => { stop(e); setOver(true); }}
        onDragOver={(e) => { stop(e); setOver(true); }}
        onDragLeave={(e) => { stop(e); setOver(false); }}
        onDrop={(e) => {
          stop(e);
          setOver(false);
          const file = e.dataTransfer.files[0];
          if (file) onFile(file);
        }}
      >
        <b>Drop your CV here</b>
        <small>or click to browse · .pdf .docx .txt .md</small>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />

      <label className="visually-hidden" htmlFor="resume-text">Your CV as text</label>
      <textarea
        id="resume-text"
        value={value}
        placeholder="…or paste the text of your CV here"
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="status">{status}</p>
    </section>
  );
}

interface JobPanelProps {
  value: string;
  onChange: (text: string) => void;
}

export function JobPanel({ value, onChange }: JobPanelProps) {
  const [url, setUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * A browser cannot fetch another site directly — job boards do not allow it — so this
   * goes through the optional API. When that is not running, say so plainly rather than
   * leaving a spinner going.
   */
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
        setError(body?.error ?? 'That link could not be read. Copy the advert and paste it below instead.');
        return;
      }
      onChange(body.text);
      setUrl('');
    } catch {
      setError(
        'The link reader is not running. Start it with "npm run dev:api" in a second terminal, or paste the advert below.',
      );
    } finally {
      setFetching(false);
    }
  };

  return (
    <section className="card">
      <label className="legend" htmlFor="jd-url" style={{ marginTop: 0 }}>
        Paste a link to the advert
      </label>
      <div className="url-row">
        <input
          id="jd-url"
          type="url"
          className="url-input"
          placeholder="https://…"
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
          {fetching ? 'Reading…' : 'Read it'}
        </button>
      </div>
      {error && <p className="url-error">{error}</p>}
      <p className="legend" style={{ marginTop: 6, marginBottom: 12 }}>
        Works with most job boards. Some sites make you sign in before they show the advert — if this cannot read
        yours, copy the text and paste it below.
      </p>

      <label className="visually-hidden" htmlFor="jd-text">Job description</label>
      <textarea
        id="jd-text"
        value={value}
        placeholder="Paste the whole job posting here"
        onChange={(e) => onChange(e.target.value)}
      />

      {/* One sample per field. The scorer works the same way for all of them, and this is
          the quickest way to show that rather than assert it. */}
      <p className="legend" style={{ marginBottom: 6 }}>Or try a sample posting:</p>
      <div className="chips">
        {SAMPLE_JOBS.map((s) => (
          <button key={s.id} type="button" className="chip" onClick={() => onChange(s.text)}>
            {s.label}
          </button>
        ))}
        {value.trim() && (
          <button type="button" className="chip chip-clear" onClick={() => onChange('')}>
            Clear
          </button>
        )}
      </div>
    </section>
  );
}
