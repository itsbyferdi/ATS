import { useState } from 'react';
import { Tabs } from '@base-ui-components/react/tabs';
import type { ScoreReport } from '@ats/core';

import { CategoryBars } from './CategoryBars.js';
import { HowItScores } from './HowItScores.js';
import { JobAdvert } from './JobAdvert.js';
import { ScoreDetails } from './ScoreDetails.js';

interface Props {
  jobDescription: string;
  onJobDescription: (text: string) => void;
  report: ScoreReport | null;
  /** True once the person has asked for a score. */
  checked: boolean;
  onCheck: () => void;
  onToggleKeyword: (term: string) => void;
  /** True while the document is still the example text that the editor starts with. */
  isExample: boolean;
}

/**
 * The panel beside the document. Two tabs, and each tab does one job: the score, or the
 * advert that the score is measured against.
 *
 * Before this there was one column with the advert on top and the score below it, and a
 * person looking for their score read an advert form first. The full breakdown still
 * opens over the page, because it is long and you read it once and then act on it.
 */
export function ScorePanel({
  jobDescription,
  onJobDescription,
  report,
  checked,
  onCheck,
  onToggleKeyword,
  isExample,
}: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('score');
  const hasAdvert = jobDescription.trim().length > 0;

  return (
    <aside className="side" aria-label="Score and job advert">
      <Tabs.Root className="side-tabs" value={tab} onValueChange={(v) => setTab(v as string)}>
        <Tabs.List className="segmented" aria-label="Score and job advert">
          <Tabs.Tab value="score" className="segment">ATS score</Tabs.Tab>
          <Tabs.Tab value="advert" className="segment">
            Job description
            {hasAdvert && <span className="segment-dot" aria-label="added" />}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="score" className="side-panel">
          <div className="side-block">
            {isExample && (
              <p className="side-alert">
                This is still the example CV that the editor starts with. A score on it describes the example,
                not you. Replace the text first.
              </p>
            )}

            {/* Once the score is on, the button has done its job and goes. Leaving a
                solid primary control at the top of the panel would put the loudest thing
                on the screen on an action that no longer does anything. */}
            {!checked || !report ? (
              <>
                <button type="button" className="button check-button" onClick={onCheck}>
                  Check the ATS score
                </button>
                <p className="legend">
                  The score covers the format, the structure and the words. It uses the advert, if you give
                  one, for the keywords and the job title. Once it is on it stays current: the number follows
                  the document as you write, and you do not press this again.
                </p>
              </>
            ) : (
              <>
                <div className="score-summary">
                  <span className={`score-figure score-${report.band.key}`}>{report.score}</span>
                  <span className="score-of">of 100</span>
                  <span className="score-band">{report.band.label}</span>
                </div>
                <p className="legend">{report.band.advice}</p>

                <CategoryBars categories={report.categories} />

                <div className="side-split">
                  {!report.hasJobDescription && (
                    <p className="side-note">
                      There is no advert, so Job Match cannot be measured. This 100 is the other four groups,
                      which carry {report.max} points between them, turned into a percentage. Add an advert on
                      the next tab and the number moves, because it then has Job Match in it. The two numbers
                      are not comparable.
                    </p>
                  )}
                  <p className="side-note">The number follows the document. It changes as you write.</p>
                </div>

                <button type="button" className="button button-ghost side-button" onClick={() => setOpen(true)}>
                  See every check
                </button>

                <ScoreDetails
                  open={open}
                  onOpenChange={setOpen}
                  report={report}
                  onToggleKeyword={onToggleKeyword}
                />
              </>
            )}
          </div>

          {/* Outside the two branches above, thus it is there before you ask for a score
              as well as after. The rules are the thing a person wants to read when they
              disagree with the number, and also the thing they want before they trust
              one. It sits under the score because that is what it explains. */}
          <div className="side-foot">
            <HowItScores />
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="advert" className="side-panel">
          <JobAdvert value={jobDescription} onChange={onJobDescription} />
        </Tabs.Panel>
      </Tabs.Root>
    </aside>
  );
}
