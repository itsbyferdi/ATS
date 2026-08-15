import type { ReactNode } from 'react';

import { MAX_PAGES, PAGE_BODY_HEIGHT, usePagination } from '../lib/paginate.js';

/**
 * The sheet of paper, the table it sits on, and the control that moves between sheets.
 *
 * The frame is A4 at 96dpi and it does not change size. The document inside it moves up
 * by one page height at a time, thus every page you see holds the same quantity of text
 * as the printed page. `lib/paginate.ts` decides where each page starts.
 *
 * The arrows sit in a bar of their own below the sheet, not over it. An A4 page is 1123px
 * and almost no window is that tall, so a control that floats over the page covers the
 * line you are writing, and a control that sits at the foot of the page is below the fold
 * and nobody finds it. A bar outside the part that scrolls is neither.
 */
export function Paper({ children }: { children: ReactNode }) {
  const { flowRef, pagination, page, setPage, onFocusCapture } = usePagination();
  const { offsets, count, needed, overflows } = pagination;
  const index = Math.min(page, offsets.length - 1);
  const offset = offsets[index] ?? 0;

  /**
   * A page ends where the next page starts, not one page height further down.
   *
   * A heading at the foot of a page is moved to the next page with the block it belongs
   * to, so the next page starts above the end of this one. A window of a fixed height
   * still holds that heading, thus the heading was drawn twice: once at the foot of this
   * page and again at the head of the next.
   */
  const nextOffset = offsets[index + 1];
  const visible =
    nextOffset === undefined ? PAGE_BODY_HEIGHT : Math.min(PAGE_BODY_HEIGHT, nextOffset - offset);

  return (
    <div className="canvas">
      <div className="canvas-scroll">
        <div className="sheet" role="group" aria-label={`Page ${page + 1} of ${count}`}>
          <div className="sheet-body" style={{ height: `${visible}px` }}>
            <div
              ref={flowRef}
              className="cv-flow"
              style={{ transform: `translateY(-${offset}px)` }}
              onFocusCapture={onFocusCapture}
            >
              {children}
            </div>
          </div>
        </div>

        <p className="canvas-note">
          Click any line to change it. This CV stays in this browser. Send the Word file to application forms.
        </p>
      </div>

      <div className="canvas-foot">
        {overflows && (
          <p className="pager-warning" role="status">
            Your CV needs {needed} pages. This editor shows {MAX_PAGES}. The text after page {MAX_PAGES} is
            still in your document and still goes into the file you download, but you cannot see it or correct
            it here. Remove text until this message goes away.
          </p>
        )}

        <nav className="pager" aria-label="Pages">
          <button
            type="button"
            className="pager-arrow"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            aria-label="Go to the page before"
          >
            <Chevron direction="left" />
          </button>

          <p className="pager-count" aria-live="polite">
            Page {page + 1} of {count}
          </p>

          <button
            type="button"
            className="pager-arrow"
            onClick={() => setPage((p) => Math.min(count - 1, p + 1))}
            disabled={page >= count - 1}
            aria-label="Go to the page after"
          >
            <Chevron direction="right" />
          </button>
        </nav>
      </div>
    </div>
  );
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden focusable="false">
      <path
        d={direction === 'left' ? 'M9 2.5L4.5 7l4.5 4.5' : 'M5 2.5L9.5 7 5 11.5'}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
