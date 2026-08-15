import { useCallback, useMemo, useState } from 'react';
import { scoreResume, type EngineResult, type ExtractionDiagnostics } from '@ats/core';

import { GithubIcon, LinkedinIcon } from './components/Icons.js';
import { HardFailure } from './components/HardFailure.js';
import { HowItScores } from './components/HowItScores.js';
import { JobPanel, ResumePanel } from './components/InputPanels.js';
import { Parsing, type StageId } from './components/Parsing.js';
import { Rebuild } from './components/Rebuild.js';
import { Results } from './components/Results.js';
import { StepRail, type Step } from './components/StepRail.js';
import { ThemeToggle } from './components/ThemeToggle.js';
import { extractFile } from './lib/extract.js';
import { useTheme } from './lib/useTheme.js';

interface Extraction {
  engines: EngineResult[];
  enginesDisagree: boolean;
  diagnostics?: ExtractionDiagnostics;
}

const NO_EXTRACTION: Extraction = { engines: [], enginesDisagree: false };

export default function App() {
  const { isDark, toggle, flashing } = useTheme();

  const [step, setStep] = useState<Step>('cv');
  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [muted, setMuted] = useState<string[]>([]);
  const [extraction, setExtraction] = useState<Extraction>(NO_EXTRACTION);
  const [status, setStatus] = useState('No file loaded');
  const [parsing, setParsing] = useState<{ filename: string; stage: StageId } | null>(null);

  // Every engine that ran, not just the winning one. The server returns whichever
  // engine recovered the most text, so passing only that one hides the case where a
  // second engine read nothing at all.
  const engineDiagnostics = useMemo(
    () => extraction.engines.filter((e) => e.ok).map((e) => e.diagnostics),
    [extraction.engines],
  );

  // Scoring is pure and fast, so it runs on every keystroke. No Scan button needed.
  const report = useMemo(
    () =>
      resume.trim() || extraction.diagnostics
        ? scoreResume({
            text: resume,
            jobDescription,
            mutedKeywords: muted,
            diagnostics: extraction.diagnostics,
            engines: engineDiagnostics,
          })
        : null,
    [resume, jobDescription, muted, extraction.diagnostics, engineDiagnostics],
  );

  const handleFile = useCallback(async (file: File) => {
    setMuted([]);
    setParsing({ filename: file.name, stage: 'read' });

    // Each stage is a real event, but on a small file they can all fire within a few
    // milliseconds. A short floor per stage makes the sequence readable rather than a
    // flicker. It never runs ahead of the work: the chain is awaited before the result
    // is shown, so the last stage cannot appear before it has actually happened.
    let chain = Promise.resolve();
    const paced = (stage: StageId) => {
      chain = chain.then(
        () =>
          new Promise<void>((resolve) => {
            setParsing({ filename: file.name, stage });
            window.setTimeout(resolve, 240);
          }),
      );
    };

    try {
      const outcome = await extractFile(file, paced);
      await chain;
      setResume(outcome.text);
      setExtraction({
        engines: outcome.engines,
        enginesDisagree: outcome.enginesDisagree,
        diagnostics: outcome.diagnostics,
      });
      const chars = outcome.diagnostics?.characters ?? outcome.text.replace(/\s/g, '').length;
      setStatus(`${outcome.filename} · ${outcome.primaryEngine} · ${chars.toLocaleString()} characters recovered`);
      setStep('job');
    } catch (err) {
      setStatus(`Could not read that file: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setParsing(null);
    }
  }, []);

  // Typing replaces whatever the extractor produced, so its diagnostics no longer apply.
  const handleResumeText = useCallback((text: string) => {
    setResume(text);
    setExtraction(NO_EXTRACTION);
    setStatus(text.trim() ? 'Pasted text' : 'No file loaded');
  }, []);

  const toggleKeyword = useCallback((term: string) => {
    setMuted((prev) => (prev.includes(term) ? prev.filter((t) => t !== term) : [...prev, term]));
  }, []);

  const startOver = useCallback(() => {
    setResume('');
    setJobDescription('');
    setMuted([]);
    setExtraction(NO_EXTRACTION);
    setStatus('No file loaded');
    setStep('cv');
  }, []);

  const hasResume = Boolean(resume.trim() || extraction.diagnostics);

  return (
    <div className="page">
      {flashing && <div className="theme-flash" aria-hidden />}

      <header className="masthead">
        <HowItScores />
        <ThemeToggle isDark={isDark} onToggle={toggle} />
      </header>

      <StepRail current={step} hasResume={hasResume} onGo={setStep} />

      {step === 'cv' && (
        <div className="panel">
          <div className="step-head">
            <h2>Start with your CV</h2>
            <p>
              Drop in the exact file you send to employers. It is read here the same way an employer's software
              reads it, and nothing leaves this page.
            </p>
          </div>
          {parsing ? (
            <div className="card">
              <Parsing filename={parsing.filename} stage={parsing.stage} />
            </div>
          ) : (
            <ResumePanel value={resume} status={status} onChange={handleResumeText} onFile={handleFile} />
          )}
          {hasResume && !parsing && (
            <div className="button-row">
              <button type="button" className="button button-next" onClick={() => setStep('job')}>
                Next
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}

      {step === 'job' && (
        <div className="panel">
          <div className="step-head">
            <h2>Add the job posting</h2>
            <p>
              Optional. Paste it in and you get a keyword and job-title score too. Skip it and you still get a
              format and structure score, worked out of 75.
            </p>
          </div>
          <JobPanel value={jobDescription} onChange={setJobDescription} />
          <div className="button-row">
            <button type="button" className="button button-next" onClick={() => setStep('results')}>
              {jobDescription.trim() ? 'See results' : 'Skip and see results'}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button type="button" className="button button-quiet" onClick={() => setStep('cv')}>
              Back
            </button>
          </div>
        </div>
      )}

      {step === 'results' && (
        <div className="panel">
          {!report ? (
            <p className="empty-state">Add a CV first and the score appears here.</p>
          ) : report.hardFailure ? (
            <div className="card">
              <HardFailure failure={report.hardFailure} />
            </div>
          ) : (
            <>
              <Results
                report={report}
                engines={extraction.engines}
                enginesDisagree={extraction.enginesDisagree}
                onToggleKeyword={toggleKeyword}
              />
              <p className="footnote">
                This number is ours, not theirs. No real hiring system gives out a score from 100. Greenhouse
                sorts people into five bands and says in its own documentation that it never rejects or advances
                anyone on its own. Workday grades A to D. A recruiter still decides. Use this to compare one
                draft of your CV against the next, and nothing more. What does carry across every system is
                simpler: a field the software cannot pull out is a field nobody can search for.
              </p>
            </>
          )}
          <div className="button-row">
            {report && !report.hardFailure && (
              <button type="button" className="button button-next" onClick={() => setStep('rebuild')}>
                Rebuild my CV
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <button type="button" className="button button-ghost" onClick={() => setStep('job')}>
              Edit the posting
            </button>
            <button type="button" className="button button-quiet" onClick={startOver}>
              Start over
            </button>
          </div>
        </div>
      )}

      {step === 'rebuild' && (
        <div className="panel">
          <div className="step-head">
            <h2>Rebuild it cleanly</h2>
            <p>
              Your CV, written back out in a shape software can read: one column, standard headings, dates in a
              form that parses, contact details as plain text. Same words, different wrapper.
            </p>
          </div>
          {!report || report.hardFailure ? (
            <p className="empty-state">Add a CV that can be read first.</p>
          ) : (
            <Rebuild text={resume} jobDescription={jobDescription} currentScore={report.score} />
          )}
          <div className="button-row">
            <button type="button" className="button button-ghost" onClick={() => setStep('results')}>
              Back to results
            </button>
            <button type="button" className="button button-quiet" onClick={startOver}>
              Start over
            </button>
          </div>
        </div>
      )}

      <footer className="site-footer">
        <p className="footer-copy">© 2026</p>
        <div className="footer-links">
          <a
            className="footer-link"
            href="https://github.com/itsbyferdi"
            target="_blank"
            rel="noopener noreferrer"
          >
            <GithubIcon /> Github
          </a>
          <a
            className="footer-link"
            href="https://www.linkedin.com/in/hafidhferdi/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <LinkedinIcon /> LinkedIn
          </a>
        </div>
      </footer>
    </div>
  );
}
