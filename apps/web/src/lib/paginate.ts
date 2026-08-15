import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * A4 at 96dpi, the resolution a browser uses for a CSS pixel.
 *
 * These measure the sheet in the editor. The file you download is set again from the
 * document, in its own type and with its own margins, thus the page break on screen is a
 * close guide to the length of your CV and not a promise about where page two of the
 * Word or PDF file begins.
 */
export const PAGE_WIDTH = 794;
export const PAGE_HEIGHT = 1123;
export const PAGE_MARGIN_TOP = 56;
export const PAGE_MARGIN_SIDE = 60;
export const PAGE_MARGIN_BOTTOM = 56;
export const PAGE_BODY_HEIGHT = PAGE_HEIGHT - PAGE_MARGIN_TOP - PAGE_MARGIN_BOTTOM;

/** A CV longer than this is not read. The editor stops at the third page. */
export const MAX_PAGES = 3;

export interface Pagination {
  /** Distance to move the document up, one value for each page. */
  offsets: number[];
  /** Pages the document needs, before the limit applies. */
  needed: number;
  /** Pages the editor shows. Never more than MAX_PAGES. */
  count: number;
  /** True when the document does not fit in MAX_PAGES. */
  overflows: boolean;
}

const EMPTY: Pagination = { offsets: [0], needed: 1, count: 1, overflows: false };

/**
 * Works out where each page starts.
 *
 * A CSS column or a fixed division of the height would cut a line of text in half at the
 * page boundary. Instead the document marks its smallest whole parts with `data-block`: a
 * heading, one item of a list, one job. This function measures those parts and starts a
 * new page at the first part that does not fit. Thus a page break never falls inside a
 * line.
 *
 * A part taller than one page cannot be moved anywhere better. It starts its own page and
 * the surplus is cut, which the caller reports as an overflow.
 */
export function measure(flow: HTMLElement, bodyHeight: number): Pagination {
  const blocks = Array.from(flow.querySelectorAll<HTMLElement>('[data-block]'));
  const total = flow.scrollHeight;
  if (!blocks.length || total <= bodyHeight) return EMPTY;

  // The document carries a transform, and a nested part can have its own containing
  // block. A rectangle measured against the document itself removes both effects.
  const flowRect = flow.getBoundingClientRect();
  const origin = flowRect.top;
  // On a narrow window the sheet is drawn smaller with `transform: scale`. A rectangle
  // reports the drawn size, and the page height is in layout pixels. `offsetWidth` is the
  // layout width, thus this ratio converts one to the other. Without it the pages hold
  // more text than an A4 page holds.
  const scale = flow.offsetWidth ? flowRect.width / flow.offsetWidth : 1;
  const px = (v: number) => (scale > 0 ? v / scale : v);

  const offsets = [0];
  let start = 0;

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    const rect = block.getBoundingClientRect();
    const top = px(rect.top - origin);
    const height = px(rect.height);
    const bottom = top + height;

    // Already on this page in full. Nothing to do.
    if (bottom - start <= bodyHeight) continue;

    // A block that is taller than a whole page cannot fit anywhere. Leave it where it
    // is, or it would start an empty page every time it is measured.
    if (height > bodyHeight) {
      if (top - start >= bodyHeight) {
        start = top;
        offsets.push(start);
      }
      continue;
    }

    // A section heading at the foot of a page, with its section on the next page, reads
    // as an error. The heading goes with the part below it.
    const before = blocks[i - 1];
    const keeps = before?.dataset.block === 'keep-with-next';
    const beforeTop = keeps ? px(before.getBoundingClientRect().top - origin) : 0;

    start = keeps && beforeTop > offsets[offsets.length - 1] ? beforeTop : top;
    offsets.push(start);
  }

  const needed = offsets.length;
  return {
    offsets: offsets.slice(0, MAX_PAGES),
    needed,
    count: Math.min(needed, MAX_PAGES),
    overflows: needed > MAX_PAGES,
  };
}

/**
 * Keeps the page breaks current while the document is written.
 *
 * Every keystroke can change the height of the document, so the measurement runs from a
 * ResizeObserver on the document itself rather than from React state. The measurement
 * reads the layout and writes nothing, thus it cannot loop.
 */
export function usePagination(bodyHeight = PAGE_BODY_HEIGHT) {
  const flowRef = useRef<HTMLDivElement>(null);
  const [pagination, setPagination] = useState<Pagination>(EMPTY);
  const [page, setPage] = useState(0);

  const remeasure = useCallback(() => {
    const flow = flowRef.current;
    if (!flow) return;
    const next = measure(flow, bodyHeight);
    setPagination((prev) =>
      prev.needed === next.needed &&
      prev.offsets.length === next.offsets.length &&
      prev.offsets.every((v, i) => v === next.offsets[i])
        ? prev
        : next,
    );
  }, [bodyHeight]);

  useLayoutEffect(remeasure);

  useEffect(() => {
    const flow = flowRef.current;
    if (!flow || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(remeasure);
    observer.observe(flow);
    return () => observer.disconnect();
  }, [remeasure]);

  // A page that disappears must not leave the view on nothing.
  useEffect(() => {
    setPage((p) => Math.min(p, pagination.count - 1));
  }, [pagination.count]);

  /**
   * Follows the caret. You can reach a field on another page with the Tab key, and the
   * field you reach has to be the field you see.
   */
  const onFocusCapture = useCallback(
    (event: React.FocusEvent<HTMLElement>) => {
      const flow = flowRef.current;
      const target = event.target;
      if (!flow || !(target instanceof HTMLElement)) return;

      const flowRect = flow.getBoundingClientRect();
      const scale = flow.offsetWidth ? flowRect.width / flow.offsetWidth : 1;
      const top = (target.getBoundingClientRect().top - flowRect.top) / (scale || 1);

      const { offsets } = pagination;
      let next = 0;
      for (let i = 0; i < offsets.length; i += 1) if (top >= offsets[i]) next = i;
      setPage((p) => (p === next ? p : next));
    },
    [pagination],
  );

  return { flowRef, pagination, page, setPage, onFocusCapture };
}
