import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import type { EngineResult, ExtractionDiagnostics } from '@ats/core';

const run = promisify(execFile);

const empty = (engine: string): ExtractionDiagnostics => ({
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
/* eslint-disable @typescript-eslint/no-explicit-any */
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
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Engine A — pdf.js. Strict about fonts. A PDF whose text was converted to Type 3
 * outlines fails font translation here and yields zero text runs, which is exactly
 * the signal we want to surface.
 */
export async function extractWithPdfjs(buffer: Buffer): Promise<EngineResult> {
  const diagnostics = empty('Strict PDF reader');
  try {
    // Legacy build: no DOM, no worker, safe in Node.
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const doc = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      verbosity: 0,
      isEvalSupported: false,
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
        /* operator list is diagnostic only; never fail the extraction for it */
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
      const lines = [...rows.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([, row]) =>
          row.sort((a, b) => a.x - b.x).map((c) => c.s).join(' ').replace(/\s+/g, ' ').trim(),
        )
        .filter(Boolean);
      pages.push(lines.join('\n'));
    }

    const text = pages.join('\n\n');
    diagnostics.characters = text.replace(/\s/g, '').length;
    return { engine: 'Strict PDF reader', ok: true, text, diagnostics };
  } catch (err) {
    return {
      engine: 'Strict PDF reader',
      ok: false,
      text: '',
      diagnostics,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Engine B — Poppler's pdftotext, a genuinely different implementation. It often
 * salvages text through the ToUnicode map when pdf.js gives up, so a disagreement
 * between the two is itself the finding. Optional: requires poppler-utils.
 */
export async function extractWithPoppler(buffer: Buffer): Promise<EngineResult> {
  const diagnostics = empty('Lenient PDF reader');
  let dir: string | null = null;
  try {
    dir = await mkdtemp(join(tmpdir(), 'ats-'));
    const file = join(dir, 'input.pdf');
    await writeFile(file, buffer);
    const { stdout } = await run('pdftotext', ['-layout', file, '-'], {
      maxBuffer: 16 * 1024 * 1024,
    });
    diagnostics.characters = stdout.replace(/\s/g, '').length;
    diagnostics.textRuns = stdout.split('\n').filter((l) => l.trim()).length;
    return { engine: 'Lenient PDF reader', ok: true, text: stdout, diagnostics };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      engine: 'Lenient PDF reader',
      ok: false,
      text: '',
      diagnostics,
      error: /ENOENT/.test(message)
        ? 'pdftotext is not installed. Install poppler-utils to enable the second engine.'
        : message,
    };
  } finally {
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => {});
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

export async function extractDocx(buffer: Buffer): Promise<EngineResult> {
  const diagnostics = empty('Word document reader');
  try {
    const mammoth = await import('mammoth');
    const { value: html } = await mammoth.convertToHtml({ buffer });
    const value = htmlToText(html);
    diagnostics.pages = 1;
    diagnostics.characters = value.replace(/\s/g, '').length;
    diagnostics.textRuns = value.split('\n').filter((l) => l.trim()).length;
    return { engine: 'Word document reader', ok: true, text: value, diagnostics };
  } catch (err) {
    return {
      engine: 'Word document reader',
      ok: false,
      text: '',
      diagnostics,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
