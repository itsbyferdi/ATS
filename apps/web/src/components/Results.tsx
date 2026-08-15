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
 * One view at a time. Everything below the score used to be stacked in a single
 * column, which meant the most useful thing — the short list of fixes — sat under
 * several screens of detail nobody had asked for yet.
 */
export function Results({ report, engines, enginesDisagree, onToggleKeyword }: Props) {
  const [view, setView] = useState<View>('score');

  const tabs: { id: View; label: string; count?: number }[] = [
    { id: 'score', label: 'Score' },
    { id: 'fixes', label: 'Do these first', count: report.priorityFixes.length },
    { id: 'keywords', label: 'Keywords', count: report.hasJobDescription ? report.keywords.length : undefined },
    { id: 'machine', label: 'What software sees' },
    { id: 'checks', label: 'All checks', count: report.checks.length },
  ];

  /*
   * Base UI's Tabs rather than buttons with role="tab". The hand-rolled version looked
   * right and read right to a screen reader, but left and right arrow keys did nothing
   * and every tab sat in the tab order — which is not how a tab list is meant to behave.
   */
  return (
    <Tabs.Root value={view} onValueChange={(v) => setView(v as View)}>
      <Tabs.List className="segmented" aria-label="Results view">
        {tabs.map((t) => (
          <Tabs.Tab key={t.id} value={t.id} className="segment">
            {t.label}
            {t.count !== undefined && ` · ${t.count}`}
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
            <p className="empty-state">Nothing left to fix. Every check that can pass, passes.</p>
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
