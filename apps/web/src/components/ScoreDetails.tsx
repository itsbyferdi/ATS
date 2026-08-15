import { useState } from 'react';
import { Dialog } from '@base-ui-components/react/dialog';
import { Tabs } from '@base-ui-components/react/tabs';
import type { ScoreReport } from '@ats/core';

import { CategoryBars } from './CategoryBars.js';
import { CheckList, PriorityFixes } from './CheckList.js';
import { Keywords } from './Keywords.js';
import { ScoreHeader } from './ScoreHeader.js';

type View = 'score' | 'fixes' | 'keywords' | 'checks';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ScoreReport;
  onToggleKeyword: (term: string) => void;
}

/**
 * The full breakdown, over the top of the page.
 *
 * The summary beside the document answers "how am I doing". This answers "why", which is
 * a longer read. It opens over the document rather than beside it, because it needs the
 * width and because you read it once and then go back to writing.
 */
export function ScoreDetails({ open, onOpenChange, report, onToggleKeyword }: Props) {
  const [view, setView] = useState<View>('score');

  const tabs: { id: View; label: string }[] = [
    { id: 'score', label: 'Score' },
    { id: 'fixes', label: 'Do these first' },
    { id: 'keywords', label: 'Keywords' },
    { id: 'checks', label: 'All checks' },
  ];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="how-backdrop" />
        <Dialog.Popup className="how-popup details-popup">
          <div className="how-head">
            <Dialog.Title className="how-title">The score in full</Dialog.Title>
            <Dialog.Close className="how-close" aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </Dialog.Close>
          </div>

          <div className="how-body details-body">
            <Tabs.Root value={view} onValueChange={(v) => setView(v as View)}>
              <Tabs.List className="segmented" aria-label="Score details">
                {tabs.map((t) => (
                  <Tabs.Tab key={t.id} value={t.id} className="segment">
                    {t.label}
                  </Tabs.Tab>
                ))}
              </Tabs.List>

              <div className="panel" key={view}>
                {view === 'score' && (
                  <>
                    <ScoreHeader score={report.score} band={report.band} outOf={report.max} />
                    <CategoryBars categories={report.categories} />
                  </>
                )}

                {view === 'fixes' &&
                  (report.priorityFixes.length ? (
                    <PriorityFixes checks={report.priorityFixes} />
                  ) : (
                    <p className="empty-state">There is nothing to correct. Each check that can pass, passes.</p>
                  ))}

                {view === 'keywords' && (
                  <Keywords
                    keywords={report.keywords}
                    hasJobDescription={report.hasJobDescription}
                    outOf={report.max}
                    onToggle={onToggleKeyword}
                  />
                )}

                {view === 'checks' && <CheckList checks={report.checks} />}
              </div>
            </Tabs.Root>

            <p className="footnote">
              This number is ours. No hiring system gives a score from 100. Greenhouse puts people into five
              groups and states in its documentation that it does not refuse or advance a person by itself.
              Workday gives a grade from A to D. A recruiter makes the decision. Use this number to compare one
              version of your CV with the next version. One rule is true for each system: if the software cannot
              get a field, nobody can search for it.
            </p>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
