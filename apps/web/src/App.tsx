import { useCallback, useEffect, useMemo, useState } from 'react';
import { renderCvText, repairIds, scoreResume, starterDoc, type CvDoc } from '@ats/core';

import { CvEditor } from './components/CvEditor.js';
import { DownloadMenu } from './components/DownloadMenu.js';
import { GithubIcon, LinkedinIcon } from './components/Icons.js';
import { Paper } from './components/Paper.js';
import { ScorePanel } from './components/ScorePanel.js';
import { ThemeToggle } from './components/ThemeToggle.js';
import { useTheme } from './lib/useTheme.js';

/*
 * The key keeps the old name of the project on purpose. It is the address of the CV in
 * the local store of a browser, and a person who wrote one before the project was renamed
 * still has it under this key. Changing the string would not move their document, it
 * would hide it, and the editor would open on the example CV as though their work had
 * never existed.
 */
const STORE_KEY = 'ats-cv-scoring:doc';

/** The document stays in this browser. Nothing about it goes to another machine. */
function loadDoc(): CvDoc {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return starterDoc();
    const parsed = JSON.parse(raw) as CvDoc;
    // A document written before ids became random can hold the same id twice, and two
    // parts with one id change together. Repair it on the way in.
    if (parsed && Array.isArray(parsed.sections) && Array.isArray(parsed.contact)) {
      return repairIds(parsed);
    }
  } catch {
    /* A damaged record must not stop the editor. Start a new document instead. */
  }
  return starterDoc();
}

/** The example text, as the scorer sees it. Ids differ every call; the text does not. */
const EXAMPLE_TEXT = renderCvText(starterDoc());

export default function App() {
  const { isDark, toggle, flashing } = useTheme();

  const [doc, setDoc] = useState<CvDoc>(loadDoc);
  const [jobDescription, setJobDescription] = useState('');
  const [muted, setMuted] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORE_KEY, JSON.stringify(doc));
      } catch {
        /* A full or blocked store is not a reason to stop the editor. */
      }
    }, 400);
    return () => window.clearTimeout(id);
  }, [doc]);

  const text = useMemo(() => renderCvText(doc), [doc]);

  // The score follows the document. After you ask for it, it stays current as you write.
  const report = useMemo(
    () => (checked ? scoreResume({ text, jobDescription, mutedKeywords: muted }) : null),
    [checked, text, jobDescription, muted],
  );

  const toggleKeyword = useCallback((term: string) => {
    setMuted((prev) => (prev.includes(term) ? prev.filter((t) => t !== term) : [...prev, term]));
  }, []);

  const run = useCallback((name: string, fn: () => void | Promise<void>) => {
    setBusy(name);
    void (async () => {
      try {
        await fn();
      } catch (err) {
        alert(`The program could not make the file. ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setBusy(null);
      }
    })();
  }, []);

  const startAgain = () => {
    if (!window.confirm('This removes your CV from this browser and starts a new one. Continue?')) return;
    setDoc(starterDoc());
    setChecked(false);
    setMuted([]);
  };

  return (
    <div className="app">
      {flashing && <div className="theme-flash" aria-hidden />}

      <header className="topbar">
        {/* The mark, and nothing else. The rubric moved into the score panel, where the
            number it explains is. */}
        <div className="logo" role="img" aria-label="ATS CV Scoring" />
        <div className="topbar-actions">
          <DownloadMenu doc={doc} busy={busy} onRun={run} />
          <button type="button" className="button button-quiet" onClick={startAgain}>
            Start again
          </button>
          <ThemeToggle isDark={isDark} onToggle={toggle} />
        </div>
      </header>

      <main className="workspace">
        <Paper>
          <CvEditor doc={doc} onChange={setDoc} />
        </Paper>

        <ScorePanel
          jobDescription={jobDescription}
          onJobDescription={setJobDescription}
          report={report}
          checked={checked}
          onCheck={() => setChecked(true)}
          onToggleKeyword={toggleKeyword}
          isExample={text === EXAMPLE_TEXT}
        />
      </main>

      <footer className="site-footer">
        <p className="footer-copy">Made by Ferdi © 2026</p>
        <div className="footer-links">
          <a className="footer-link" href="https://github.com/itsbyferdi" target="_blank" rel="noopener noreferrer">
            <GithubIcon /> Github
          </a>
          <a className="footer-link" href="https://www.linkedin.com/in/hafidhferdi/" target="_blank" rel="noopener noreferrer">
            <LinkedinIcon /> LinkedIn
          </a>
        </div>
      </footer>
    </div>
  );
}
