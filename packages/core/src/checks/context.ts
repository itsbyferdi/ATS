import { extractFields } from '../fields.js';
import { flatten, splitLines, type Lines } from '../text.js';
import type { CategoryName, Check, ExtractedFields, ExtractionDiagnostics } from '../types.js';

export interface CheckContext {
  /** Source text exactly as the extractor produced it. */
  text: string;
  lines: Lines;
  /** Flattened text padded with single spaces, ready for hasTerm. */
  flat: string;
  fields: ExtractedFields;
  jobDescription: string;
  hasJobDescription: boolean;
  mutedKeywords: Set<string>;
  /** Absent for pasted text, so every check that uses it must degrade gracefully. */
  diagnostics?: ExtractionDiagnostics;
}

export function buildContext(
  text: string,
  jobDescription: string,
  mutedKeywords: string[] = [],
  diagnostics?: ExtractionDiagnostics,
): CheckContext {
  return {
    text,
    lines: splitLines(text),
    flat: ` ${flatten(text)} `,
    fields: extractFields(text),
    jobDescription,
    hasJobDescription: jobDescription.trim().length > 60,
    mutedKeywords: new Set(mutedKeywords.map((k) => k.toLowerCase())),
    diagnostics,
  };
}

/** Clamp, derive status, and drop the fix when there is nothing left to fix. */
export function makeCheck(
  category: CategoryName,
  id: string,
  label: string,
  max: number,
  awarded: number,
  detail: string,
  fix?: string,
): Check {
  const score = Math.max(0, Math.min(max, Math.round(awarded)));
  const status = score === max ? 'pass' : score === 0 ? 'fail' : 'partial';
  return { id, category, label, max, score, status, detail, ...(score < max && fix ? { fix } : {}) };
}
