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

  // Each reader that operated, not only the best one. The server sends back the reader
  // that got the most text. If you use only that reader, you hide the condition where a
  // second reader got no text.
  const engineDiagnostics = useMemo(
    () => extraction.engines.filter((e) => e.ok).map((e) => e.diagnostics),
    [extraction.engines],
  );

  // The score is a pure function and it is quick. Thus it operates for each key that you
  // press. The interface does not need a button.
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

    // Each stage is a real event. On a small file, all the stages can occur in a few
    // milliseconds. A minimum time for each stage makes the sequence readable. The
    // program waits for the chain before it shows the result. Thus the last stage cannot
    // occur before the work is complete.
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
      setStatus(`${outcome.filename} · ${outcome.primaryEngine} · ${chars.toLocaleString()} characters`);
      setStep('job');
    } catch (err) {
      setStatus(`The program could not read that file. ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setParsing(null);
    }
  }, []);

  // New text replaces the text from the reader. Thus the data of the reader does not
  // apply.
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
              Put in the exact file that you send to employers. This page reads it in the same way as the
              software of an employer. Nothing leaves this page.
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
              This step is optional. If you add the advert, you also get a score for the keywords and the job
              title. If you do not add it, you get a score for the format and the structure, from 75 points.
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
            <p className="empty-state">Add a CV. Then the score comes on this page.</p>
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
                This number is ours. No hiring system gives a score from 100. Greenhouse puts people into five
                groups and states in its documentation that it does not refuse or advance a person by itself.
                Workday gives a grade from A to D. A recruiter makes the decision. Use this number to compare one
                version of your CV with the next version, and for nothing more. One rule is true for each system:
                if the software cannot get a field, nobody can search for it.
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
              This is your CV in a form that software can read: one column, usual headings, dates that a
              program can parse and contact data as usual text. The words stay the same. Only the format
              changes.
            </p>
          </div>
          {!report || report.hardFailure ? (
            <p className="empty-state">Add a CV that the program can read.</p>
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
