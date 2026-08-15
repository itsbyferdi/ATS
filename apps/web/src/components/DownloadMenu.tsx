import { Menu } from '@base-ui-components/react/menu';
import type { CvDoc } from '@ats/core';

import { exportDocx, exportMarkdown, exportPdf, exportText } from '../lib/exporters.js';

/**
 * Four buttons across the top bar gave equal weight to four formats, although only one of
 * them is the answer for almost everybody. One button carries the answer. The rest sit
 * behind the chevron, each with the reason to pick it.
 */
const FORMATS = [
  {
    id: 'docx',
    label: 'Word (.docx)',
    note: 'Send this one. Application forms read it.',
    run: exportDocx,
  },
  {
    id: 'pdf',
    label: 'PDF',
    note: 'Opens your print window. Pick "Save as PDF".',
    run: exportPdf,
  },
  {
    id: 'md',
    label: 'Markdown (.md)',
    note: 'To keep a copy in a repository.',
    run: exportMarkdown,
  },
  {
    id: 'txt',
    label: 'Plain text (.txt)',
    note: 'The exact text the scorer reads.',
    run: exportText,
  },
] as const;

interface Props {
  doc: CvDoc;
  busy: string | null;
  onRun: (id: string, fn: () => void | Promise<void>) => void;
}

export function DownloadMenu({ doc, busy, onRun }: Props) {
  const running = FORMATS.find((f) => f.id === busy);

  return (
    <Menu.Root>
      <Menu.Trigger className="button button-split" disabled={busy !== null}>
        {running ? `Building ${running.label}…` : 'Download'}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden focusable="false">
          <path d="M3 4.75L6 7.75l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner className="menu-positioner" sideOffset={6} align="end">
          <Menu.Popup className="menu-popup">
            {FORMATS.map((format) => (
              <Menu.Item
                key={format.id}
                className="menu-item"
                onClick={() => onRun(format.id, () => format.run(doc))}
              >
                <span className="menu-item-label">{format.label}</span>
                <span className="menu-item-note">{format.note}</span>
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
