import {
  contactLine,
  renderHtml,
  renderMarkdown,
  renderText,
  type CvDocument,
  type Template,
} from '@ats/core';

const slug = (doc: CvDocument) =>
  (doc.name ?? 'cv').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cv';

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking immediately can cancel the download in Safari.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function exportText(doc: CvDocument, t: Template) {
  save(new Blob([renderText(doc, t)], { type: 'text/plain;charset=utf-8' }), `${slug(doc)}-${t.id}.txt`);
}

export function exportMarkdown(doc: CvDocument, t: Template) {
  save(new Blob([renderMarkdown(doc, t)], { type: 'text/markdown;charset=utf-8' }), `${slug(doc)}-${t.id}.md`);
}

/**
 * A real .docx, not HTML with the extension changed. The whole point of this tool is
 * that the container has to survive a parser, so shipping a fake one would be a joke at
 * the user's expense.
 *
 * Everything here is deliberately plain: real heading styles, no tables, no text boxes,
 * no header or footer region. Those are the four things that break extraction.
 */
export async function exportDocx(doc: CvDocument, t: Template) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');

  const children: InstanceType<typeof Paragraph>[] = [];
  const para = (text: string, opts: Record<string, unknown> = {}) =>
    children.push(new Paragraph({ text, ...opts }));

  if (doc.name) para(doc.name, { heading: HeadingLevel.TITLE });
  if (t.headline && doc.headline) {
    children.push(new Paragraph({ children: [new TextRun({ text: doc.headline, bold: true })] }));
  }

  const contact = contactLine(doc);
  if (contact) para(contact);
  if (doc.contactExtra.length) para(doc.contactExtra.join(' | '));
  para('');

  // Reuse the canonical plain-text render so the DOCX can never drift from what is
  // previewed and scored. Headings are the bare upper-case lines the renderer emits.
  const lines = renderText(doc, t).split('\n');
  const startAt = lines.findIndex((l, i) => i > 0 && l.trim() && /^[A-Z0-9 ,&/()'-]+$/.test(l.trim()) && l.trim().length > 3);

  for (const raw of lines.slice(startAt === -1 ? 0 : startAt)) {
    const line = raw.trim();
    if (!line) continue;
    const isHeading = /^[A-Z0-9 ,&/()'-]+$/.test(line) && line.length > 3 && !/^-/.test(line);
    if (isHeading) para(line, { heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 80 } });
    else if (line.startsWith('- ')) para(line.slice(2), { bullet: { level: 0 } });
    else para(line);
  }

  const file = new Document({
    creator: 'ats-cv-scoring',
    title: doc.name ?? 'CV',
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 22 } },
        title: { run: { font: 'Calibri', size: 36, bold: true, color: '000000' } },
        heading1: { run: { font: 'Calibri', size: 24, bold: true, color: '000000' } },
      },
    },
    sections: [{ children }],
  });

  save(await Packer.toBlob(file), `${slug(doc)}-${t.id}.docx`);
}

/**
 * PDF via the browser's own print pipeline. It embeds a real font and a real text
 * layer, which is exactly what a design-tool export fails to do — the fault that
 * started this project. The user picks "Save as PDF" in the print dialogue.
 */
export function exportPdf(doc: CvDocument, t: Template) {
  const win = window.open('', '_blank', 'width=820,height=1000');
  if (!win) {
    alert('Your browser blocked the print window. Allow pop-ups for this page and try again.');
    return;
  }
  win.document.write(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${slug(doc)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  body { font-family: Calibri, Carlito, Arial, sans-serif; font-size: 11pt; line-height: 1.42; color: #000; margin: 0; }
  h1 { font-size: 20pt; margin: 0 0 2pt; }
  h2 { font-size: 12pt; margin: 16pt 0 4pt; text-transform: uppercase; letter-spacing: .04em; }
  h3 { font-size: 11pt; margin: 10pt 0 0; }
  p { margin: 0 0 4pt; }
  .cv-headline { font-weight: 700; }
  .cv-contact { margin-bottom: 2pt; }
  .cv-meta { color: #333; margin: 0 0 4pt; }
  ul { margin: 4pt 0 0; padding-left: 16pt; }
  li { margin-bottom: 3pt; }
  h2, h3 { break-after: avoid; page-break-after: avoid; }
  li, p { break-inside: avoid; page-break-inside: avoid; }
</style></head><body>${renderHtml(doc, t)}</body></html>`);
  win.document.close();
  win.focus();
  // Give the new document a tick to lay out before the dialogue opens.
  win.setTimeout(() => win.print(), 300);
}
