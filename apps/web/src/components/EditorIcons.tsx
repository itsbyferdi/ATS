/**
 * The icons of the editor controls.
 *
 * One box of 12px and one stroke of 1px across the whole set. A control that adds a part
 * of the document sits beside 10.5px text, and a heavier stroke there reads as a second
 * weight of type on the page.
 *
 * Every icon draws in `currentColor` and carries no colour of its own. Hover, focus and
 * the disabled state come from the colour of the button, thus one file covers every
 * state and the icon can never disagree with the label next to it.
 */
import type { SVGProps } from 'react';

function Icon({ children, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Adds one more of the thing you are looking at. */
export const PlusIcon = () => (
  <Icon>
    <path d="M6 2.25v7.5M2.25 6h7.5" />
  </Icon>
);

/** A block of prose: a summary, a profile. */
export const ParagraphIcon = () => (
  <Icon>
    <path d="M2 2.75h8M2 6h8M2 9.25h5" />
  </Icon>
);

/** A labelled list: the skills block. */
export const ListIcon = () => (
  <Icon>
    <path d="M2 2.75h.01M2 6h.01M2 9.25h.01M4.5 2.75h5.5M4.5 6h5.5M4.5 9.25h5.5" />
  </Icon>
);

/** Dated entries: jobs, degrees. */
export const HistoryIcon = () => (
  <Icon>
    <path d="M1.75 4.25h8.5v5.5h-8.5zM4.5 4.25v-1.5h3v1.5" />
  </Icon>
);

export const ArrowUpIcon = () => (
  <Icon>
    <path d="M6 9.75v-7.5M3 5.25L6 2.25l3 3" />
  </Icon>
);

export const ArrowDownIcon = () => (
  <Icon>
    <path d="M6 2.25v7.5M3 6.75L6 9.75l3-3" />
  </Icon>
);

/**
 * Removes a part of the document.
 *
 * A cross and not a bin. The bin drew six strokes inside 12px, beside a document that is
 * already dense with text, and every entry and every contact line carries one. The cross
 * carries the same meaning in two strokes.
 */
export const RemoveIcon = () => (
  <Icon>
    <path d="M3 3l6 6M9 3l-6 6" />
  </Icon>
);
