import { renderCvHtml, renderCvMarkdown, renderCvText, type CvDoc } from '@ats/core';

const slug = (doc: CvDoc) =>
  (doc.name || 'cv').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cv';

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Safari stops the download if the address is released immediately.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function exportText(doc: CvDoc) {
  save(new Blob([renderCvText(doc)], { type: 'text/plain;charset=utf-8' }), `${slug(doc)}.txt`);
}

export function exportMarkdown(doc: CvDoc) {
  save(new Blob([renderCvMarkdown(doc)], { type: 'text/markdown;charset=utf-8' }), `${slug(doc)}.md`);
}

/**
 * A real .docx file, not HTML with a different extension. The purpose of this tool is a
 * file that a program can read, thus a file that is not a real .docx would be an error
 * against the user.
 *
 * The file is simple on purpose: real heading styles, no tables, no text boxes, no page
 * header and no page footer. These four things stop a program from reading a file.
 */
export async function exportDocx(doc: CvDoc) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');

  const children: InstanceType<typeof Paragraph>[] = [];
  const para = (text: string, opts: Record<string, unknown> = {}) =>
    children.push(new Paragraph({ text, ...opts }));

  const name = doc.name.trim();
  const headline = doc.headline.trim();
  if (name) para(name, { heading: HeadingLevel.TITLE });
  if (headline) children.push(new Paragraph({ children: [new TextRun({ text: headline, bold: true })] }));

  /*
   * The file comes from the same plain text that the scorer reads. Thus the document you
   * send and the score you see can never disagree.
   */
  const isHeading = (l: string) => /^[A-Z0-9 ,&/()'-]+$/.test(l) && l.length > 3 && !l.startsWith('-');
  let removed = 0;
  for (const raw of renderCvText(doc).split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    // The name and the job title are already in the file above.
    if (removed < 2 && (line === name || line === headline)) {
      removed += 1;
      continue;
    }
    if (isHeading(line)) para(line, { heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 80 } });
    else if (line.startsWith('- ')) para(line.slice(2), { bullet: { level: 0 } });
    else para(line);
  }

  const file = new Document({
    creator: 'ATS',
    title: name || 'CV',
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 22 } },
        title: { run: { font: 'Calibri', size: 36, bold: true, color: '000000' } },
        heading1: { run: { font: 'Calibri', size: 24, bold: true, color: '000000' } },
      },
    },
    sections: [{ children }],
  });

  save(await Packer.toBlob(file), `${slug(doc)}.docx`);
}

/**
 * The PDF comes from the print window of the browser. It contains a real font and real
 * text. A file from a design tool does not do this, which is the fault that started this
 * project. Select "Save as PDF" in the print window.
 */
export function exportPdf(doc: CvDoc) {
  const win = window.open('', '_blank', 'width=820,height=1000');
  if (!win) {
    alert('The browser stopped the print window. Permit pop-up windows for this page and try again.');
    return;
  }
  win.document.write(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${slug(doc)}</title>
<style>
  @page { size: A4; margin: 16mm 15mm; }
  body { font-family: Inter, Calibri, Arial, sans-serif; font-size: 10.5pt; line-height: 1.5; color: #111; margin: 0; }
  h1 { font-size: 21pt; margin: 0 0 2pt; letter-spacing: -0.4pt; }
  h2 { font-size: 9.5pt; margin: 15pt 0 5pt; color: #555; font-weight: 500;
       padding-bottom: 3pt; border-bottom: 0.5pt solid #ddd; }
  .cv-headline { font-size: 11.5pt; color: #333; margin-bottom: 6pt; }
  p { margin: 0 0 4pt; }
  .cv-contact { color: #333; margin-bottom: 4pt; }
  .cv-label { color: #777; }
  .cv-sep { display: inline-block; width: 14pt; }
  .cv-entry { margin-bottom: 10pt; }
  .cv-entry-head { display: flex; justify-content: space-between; gap: 12pt; }
  .cv-entry-loc { color: #666; white-space: nowrap; }
  .cv-meta { color: #666; margin-bottom: 4pt; }
  ul { margin: 4pt 0 0; padding-left: 14pt; }
  li { margin-bottom: 3pt; }
  h1, h2, .cv-entry-head { break-after: avoid; page-break-after: avoid; }
  li, p, .cv-entry { break-inside: avoid; page-break-inside: avoid; }
</style></head><body>${renderCvHtml(doc)}</body></html>`);
  win.document.close();
  win.focus();
  // Give the new document a moment to lay out before the print window opens.
  win.setTimeout(() => win.print(), 300);
}
