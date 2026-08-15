import { Dialog } from '@base-ui-components/react/dialog';
import { useEffect, useMemo, useRef, useState } from 'react';
import { figmaEvidence, parsePastedCv, type CvDoc, type CvSection, type PastedClipboard } from '@ats/core';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A paste that landed on the page rather than in the box below. */
  incoming: PastedClipboard | null;
  onImport: (doc: CvDoc) => void;
}

/** "a", "a and b", "a, b and c". A list of markers is read, not scanned. */
const listed = (items: string[]): string =>
  items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

/** What the reader made of one section, in the fewest words that still say it. */
function describe(section: CvSection): string {
  if (section.kind === 'text') {
    const count = section.body.split(/\s+/).filter(Boolean).length;
    return `paragraph, ${count} ${count === 1 ? 'word' : 'words'}`;
  }
  if (section.kind === 'rows') {
    return `${section.rows.length} ${section.rows.length === 1 ? 'group' : 'groups'}`;
  }
  const bullets = section.entries.reduce((n, e) => n + e.bullets.length, 0);
  const entries = `${section.entries.length} ${section.entries.length === 1 ? 'entry' : 'entries'}`;
  return bullets ? `${entries}, ${bullets} ${bullets === 1 ? 'item' : 'items'}` : entries;
}

/**
 * Brings a CV in from the clipboard.
 *
 * This exists because the CV is written in Figma first. A Figma frame is not a document:
 * copy it and the clipboard gives you the words of each text layer with nothing to say
 * which line was a heading, which was a job title and which was a date. `parsePastedCv`
 * puts that structure back.
 *
 * The panel shows the structure before it replaces anything. A reader that guesses and
 * says nothing is worse than no reader at all, because the person cannot see what it
 * decided until the score is already wrong. Thus the paste, what was found and what had
 * to be guessed are all on the screen at the moment of the decision.
 *
 * The clipboard is read in this browser and goes nowhere else.
 */
export function ImportDialog({ open, onOpenChange, incoming, onImport }: Props) {
  const [paste, setPaste] = useState<PastedClipboard | null>(null);
  /** The text was typed into or changed in the box, thus the HTML no longer matches it. */
  const [edited, setEdited] = useState(false);
  /** The wait that empties the box after the panel has closed. See `close`. */
  const emptying = useRef<number | null>(null);

  const keepBox = () => {
    if (emptying.current) window.clearTimeout(emptying.current);
    emptying.current = null;
  };

  // A paste that arrived on the page opens this panel with the text already in it.
  useEffect(() => {
    if (!incoming) return;
    keepBox();
    setPaste(incoming);
    setEdited(false);
  }, [incoming]);

  const result = useMemo(
    () => (paste?.text.trim() ? parsePastedCv({ text: paste.text, html: edited ? undefined : paste.html }) : null),
    [paste, edited],
  );

  // Where the text came from is a fact about the clipboard, thus it survives an edit to
  // the words. What the reader could do with the text does not: the HTML holds the bold
  // headings and the list items, and it stops describing text that has been changed.
  const evidence = useMemo(() => figmaEvidence(paste?.html), [paste]);

  const close = () => {
    onOpenChange(false);
    // The box is emptied after the panel has gone, so the text does not disappear in
    // front of the person who is watching it close.
    emptying.current = window.setTimeout(() => {
      setPaste(null);
      setEdited(false);
    }, 240);
  };

  const reopen = () => {
    // Opening again inside that wait must not empty the box that was just filled.
    keepBox();
    onOpenChange(true);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(next) => (next ? reopen() : close())}>
      <Dialog.Trigger className="button button-ghost">Import</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="how-backdrop" />
        <Dialog.Popup className="how-popup import-popup">
          <div className="how-head">
            <Dialog.Title className="how-title">Import a CV</Dialog.Title>
            <Dialog.Close className="how-close" aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden focusable="false">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </Dialog.Close>
          </div>

          <div className="how-body import-body">
            <Dialog.Description className="how-lede">
              In Figma, select the text layers of your CV and copy them. Paste them here. The reader finds the
              headings, the jobs, the dates and the items, and it states what it had to guess. Your CV stays in
              this browser.
            </Dialog.Description>

            <label className="visually-hidden" htmlFor="import-text">
              The text of your CV
            </label>
            <textarea
              id="import-text"
              className="side-textarea import-area"
              value={paste?.text ?? ''}
              placeholder="Paste your CV here"
              spellCheck={false}
              autoFocus
              onPaste={(e) => {
                const text = e.clipboardData.getData('text/plain');
                if (!text.trim()) return;
                // The HTML form of the clipboard carries the proof that the paste came
                // from Figma, and it keeps the bold headings and the list items that the
                // plain text form throws away. The browser would give the box the plain
                // text only, thus the paste is taken here instead.
                e.preventDefault();
                setPaste({ text, html: e.clipboardData.getData('text/html') || undefined });
                setEdited(false);
              }}
              onChange={(e) => {
                setPaste((prev) => ({ text: e.target.value, html: prev?.html }));
                setEdited(true);
              }}
            />

            {result && (
              <div className="import-report">
                <p className={`import-source ${evidence.length ? 'import-source-figma' : ''}`.trim()}>
                  <span className="import-source-dot" aria-hidden />
                  <span className="import-source-text">
                    <b>{evidence.length ? 'This came from Figma.' : 'This did not come from Figma.'}</b>{' '}
                    <span className="import-source-why">
                      {evidence.length
                        ? `Figma writes its own payload beside the words, and this clipboard carried ${listed(evidence)}.`
                        : 'Nothing in the clipboard named the program it came from, thus the reader used the shape of the lines alone. It reads a paste from any program the same way.'}{' '}
                      {result.lineCount} {result.lineCount === 1 ? 'line' : 'lines'} of text arrived.
                    </span>
                  </span>
                </p>

                <dl className="import-found">
                  <div className="import-found-row">
                    <dt>Name</dt>
                    <dd>{result.doc.name || 'not found'}</dd>
                  </div>
                  {result.doc.headline && (
                    <div className="import-found-row">
                      <dt>Job title</dt>
                      <dd>{result.doc.headline}</dd>
                    </div>
                  )}
                  <div className="import-found-row">
                    <dt>Contact</dt>
                    <dd>
                      {result.doc.contact.length
                        ? result.doc.contact.map((c) => c.label || 'Detail').join(', ')
                        : 'not found'}
                    </dd>
                  </div>
                  {result.doc.sections.map((section) => (
                    <div className="import-found-row" key={section.id}>
                      <dt>{section.heading}</dt>
                      <dd>{describe(section)}</dd>
                    </div>
                  ))}
                </dl>

                {result.notes.length > 0 && (
                  <div className="import-notes">
                    <p className="import-notes-title">Check these before you import</p>
                    <ul>
                      {result.notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="import-limit">
                  A heading that is not written in capitals and is not a usual CV heading is read as ordinary
                  text. Everything the reader could not place is kept, not dropped. Correct anything it got wrong
                  on the sheet, where you can see it.
                </p>
              </div>
            )}
          </div>

          <div className="import-foot">
            <p className="import-foot-note">This replaces the CV in the editor. You can undo it afterwards.</p>
            <div className="import-actions">
              <button type="button" className="button button-ghost" onClick={close}>
                Cancel
              </button>
              <button
                type="button"
                className="button"
                disabled={!result?.doc.sections.length && !result?.doc.name}
                onClick={() => {
                  if (!result) return;
                  onImport(result.doc);
                  close();
                }}
              >
                Replace my CV
              </button>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
