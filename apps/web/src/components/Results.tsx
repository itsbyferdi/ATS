import { useState } from 'react';
import { Tabs } from '@base-ui-components/react/tabs';
import type { EngineResult, ScoreReport } from '@ats/core';

import { CategoryBars } from './CategoryBars.js';
import { CheckList, PriorityFixes } from './CheckList.js';
import { Keywords } from './Keywords.js';
import { MachineView } from './MachineView.js';
import { ScoreHeader } from './ScoreHeader.js';

type View = 'score' | 'fixes' | 'keywords' | 'machine' | 'checks';

interface Props {
  report: ScoreReport;
  engines: EngineResult[];
  enginesDisagree: boolean;
  onToggleKeyword: (term: string) => void;
}

/**
 * The interface shows one view at a time. All the data below the score was in one
 * column. Thus the most useful part, the short list of corrections, was below several
 * screens of detail that the user did not ask for.
 */
export function Results({ report, engines, enginesDisagree, onToggleKeyword }: Props) {
  const [view, setView] = useState<View>('score');

  const tabs: { id: View; label: string }[] = [
    { id: 'score', label: 'Score' },
    { id: 'fixes', label: 'Do these first' },
    { id: 'keywords', label: 'Keywords' },
    { id: 'machine', label: 'What software sees' },
    { id: 'checks', label: 'All checks' },
  ];

  /*
   * This code uses the Tabs component of Base UI, not buttons with role="tab". The
   * previous version looked correct and a screen reader read it correctly. But the left
   * and right arrow keys did nothing, and each tab was in the tab order. A tab list must
   * not operate in this way.
   */
  return (
    <Tabs.Root value={view} onValueChange={(v) => setView(v as View)}>
      <Tabs.List className="segmented" aria-label="Results view">
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

        {view === 'machine' && (
          <MachineView
            fields={report.fields}
            text={report.text}
            engines={engines}
            enginesDisagree={enginesDisagree}
          />
        )}

        {view === 'checks' && <CheckList checks={report.checks} />}
      </div>
    </Tabs.Root>
  );
}
