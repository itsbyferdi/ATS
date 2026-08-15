import type { EngineResult, ExtractionDiagnostics } from '@ats/core';

export interface ExtractionOutcome {
  filename: string;
  text: string;
  primaryEngine: string;
  engines: EngineResult[];
  enginesDisagree: boolean;
  diagnostics?: ExtractionDiagnostics;
}

const blank = (engine: string): ExtractionDiagnostics => ({
  engine,
  pages: 0,
  textRuns: 0,
  drawingOps: 0,
  characters: 0,
});

/**
 * Count the Type 3 fonts on a page. ISO 32000 lets a Type 3 font define each letter
 * as a small drawing program, with no requirement to record which character it draws.
 * Fonts are read from the operator list rather than from the text items, because the
 * files worth catching produce no text items at all.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function countType3Fonts(pdfjs: any, page: any, ops: { fnArray: number[]; argsArray: any[] }): number {
  const names = new Set<string>();
  for (let i = 0; i < ops.fnArray.length; i++) {
    if (ops.fnArray[i] === pdfjs.OPS.setFont) names.add(ops.argsArray[i][0]);
  }
  let type3 = 0;
  for (const name of names) {
    try {
      if (!page.commonObjs.has?.(name)) continue;
      if (page.commonObjs.get(name)?.isType3Font) type3++;
    } catch {
      /* font not resolved; not a Type 3 signal either way */
    }
  }
  return type3;
}

/**
 * Browser-side PDF read. Deliberately uses pdf.js, the strict engine: a CV whose
 * text was converted to Type 3 outlines returns nothing here, and that silence is
 * the result worth showing.
 */
async function readPdfInBrowser(file: File): Promise<EngineResult> {
  const diagnostics = blank('Strict PDF reader');
  try {
    const pdfjs = await import('pdfjs-dist');
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

    const doc = await pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
      verbosity: 0,
    }).promise;

    diagnostics.pages = doc.numPages;
    diagnostics.type3Fonts = 0;
    diagnostics.tagged = false;
    const pages: string[] = [];

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      diagnostics.textRuns += content.items.length;
      try {
        const ops = await page.getOperatorList();
        diagnostics.drawingOps += ops.fnArray.length;
        diagnostics.type3Fonts = (diagnostics.type3Fonts ?? 0) + countType3Fonts(pdfjs, page, ops);
      } catch {
        /* diagnostic only */
      }

      // ISO 14289: the structure tree is where a PDF states its reading order.
      // No tree means every parser has to guess it from glyph positions.
      try {
        if (await page.getStructTree()) diagnostics.tagged = true;
      } catch {
        /* absent tree is the common case, not an error */
      }

      // Rebuild reading order from glyph positions, the way a parser has to.
      const rows = new Map<number, { x: number; s: string }[]>();
      for (const item of content.items as { transform: number[]; str: string }[]) {
        const y = Math.round(item.transform[5]);
        const row = rows.get(y) ?? [];
        row.push({ x: item.transform[4], s: item.str });
        rows.set(y, row);
      }
      pages.push(
        [...rows.entries()]
          .sort((a, b) => b[0] - a[0])
          .map(([, row]) =>
            row.sort((a, b) => a.x - b.x).map((c) => c.s).join(' ').replace(/\s+/g, ' ').trim(),
          )
          .filter(Boolean)
          .join('\n'),
      );
    }

    const text = pages.join('\n\n');
    diagnostics.characters = text.replace(/\s/g, '').length;
    return { engine: diagnostics.engine, ok: true, text, diagnostics };
  } catch (err) {
    return {
      engine: diagnostics.engine,
      ok: false,
      text: '',
      diagnostics,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * DOCX list items carry their bullet in the numbering definition, not in the text, so
 * `extractRawText` returns them as bare paragraphs. That loses the one signal the
 * impact checks depend on. Converting to HTML first keeps the list structure, which is
 * then flattened back to a marker a human would have typed.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/(p|h[1-6]|li|div|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function readDocxInBrowser(file: File): Promise<EngineResult> {
  const diagnostics = blank('Word document reader');
  const mammoth = await import('mammoth');
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
  const text = htmlToText(html);
  diagnostics.pages = 1;
  diagnostics.characters = text.replace(/\s/g, '').length;
  diagnostics.textRuns = text.split('\n').filter((l) => l.trim()).length;
  return { engine: diagnostics.engine, ok: true, text, diagnostics };
}

/** Ask the API for a second, independent engine. Absent API is not an error. */
async function tryServer(file: File): Promise<ExtractionOutcome | null> {
  try {
    const body = new FormData();
    body.append('file', file);
    const res = await fetch('/api/extract', { method: 'POST', body, signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return null;
    return (await res.json()) as ExtractionOutcome;
  } catch {
    return null;
  }
}

/** Reported as the work actually happens, so the progress shown is never a fiction. */
export type Stage = 'read' | 'engines' | 'compare' | 'score';

export async function extractFile(
  file: File,
  onStage: (stage: Stage) => void = () => {},
): Promise<ExtractionOutcome> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  onStage('read');

  // Prefer the server when it is up: two engines beat one, and their disagreement
  // is the most useful thing this tool can tell you.
  onStage('engines');
  const fromServer = await tryServer(file);
  if (fromServer && fromServer.text !== undefined) {
    onStage('compare');
    const primary = fromServer.engines.find((e) => e.engine === fromServer.primaryEngine);
    onStage('score');
    return { ...fromServer, diagnostics: primary?.diagnostics };
  }

  if (ext === 'pdf') {
    const result = await readPdfInBrowser(file);
    onStage('compare');
    onStage('score');
    return {
      filename: file.name,
      text: result.text,
      primaryEngine: result.engine,
      engines: [result],
      enginesDisagree: false,
      diagnostics: result.diagnostics,
    };
  }

  if (ext === 'docx') {
    const result = await readDocxInBrowser(file);
    onStage('compare');
    onStage('score');
    return {
      filename: file.name,
      text: result.text,
      primaryEngine: result.engine,
      engines: [result],
      enginesDisagree: false,
      diagnostics: result.diagnostics,
    };
  }

  const text = await file.text();
  onStage('compare');
  onStage('score');
  return {
    filename: file.name,
    text,
    primaryEngine: 'Plain text',
    engines: [],
    enginesDisagree: false,
  };
}
