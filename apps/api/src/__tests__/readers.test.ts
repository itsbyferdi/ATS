import { describe, expect, it } from 'vitest';
import type { EngineResult } from '@ats/core';

import { readersDisagree } from '../index.js';

const reader = (engine: string, characters: number, ok = true): EngineResult => ({
  engine,
  ok,
  text: 'x'.repeat(characters),
  diagnostics: { engine, pages: 1, textRuns: ok ? 10 : 0, drawingOps: 500, characters },
  ...(ok ? {} : { error: 'pdftotext is not installed.' }),
});

/**
 * The message "the two readers do not agree" is the most serious result of this tool. It
 * means that one half of employers get an empty page. The tool must give this message
 * for a damaged file and give no message for a correct file.
 */
describe('readersDisagree', () => {
  it('fires when one reader gets text and another gets nothing', () => {
    expect(readersDisagree([reader('Strict PDF reader', 0), reader('Lenient PDF reader', 2890)])).toBe(true);
  });

  /**
   * The bug this exists for: Poppler is optional, and on a machine without it every
   * upload was reported as a disagreement. A reader that never ran has no opinion.
   */
  it('stays silent when the second reader is not installed', () => {
    expect(readersDisagree([reader('Strict PDF reader', 3400), reader('Lenient PDF reader', 0, false)])).toBe(
      false,
    );
  });

  it('stays silent when both readers agree there is text', () => {
    expect(readersDisagree([reader('Strict PDF reader', 3400), reader('Lenient PDF reader', 3100)])).toBe(false);
  });

  it('stays silent when both readers agree there is none', () => {
    expect(readersDisagree([reader('Strict PDF reader', 0), reader('Lenient PDF reader', 0)])).toBe(false);
  });

  it('stays silent with only one reader, however it did', () => {
    expect(readersDisagree([reader('Word document reader', 3400)])).toBe(false);
    expect(readersDisagree([reader('Word document reader', 0)])).toBe(false);
  });

  it('stays silent when no reader ran at all', () => {
    expect(readersDisagree([reader('a', 0, false), reader('b', 0, false)])).toBe(false);
    expect(readersDisagree([])).toBe(false);
  });
});
