import { settle } from '../lib/settle.js';
import { RemoveIcon } from './EditorIcons.js';

interface Props {
  onRemove: () => void;
  label: string;
  title: string;
  /** Smaller, for a control that sits inside a line of text rather than beside a heading. */
  inline?: boolean;
}

/**
 * Deletes a part of the document.
 *
 * A delete applies on the press, so the parts below it move up at once. That is correct,
 * and it creates one hazard: the pointer does not move, the document does, and the
 * control that arrives under the pointer is the delete of the part that was next. The
 * second press of a double click then deletes something that was never chosen, and this
 * editor has no undo.
 *
 * The guard is in `lib/settle.ts`: after a delete, no delete control answers the pointer
 * until the pointer moves. A double click carries no movement between its two presses,
 * thus the second press finds nothing. Any real movement, down to one pixel, arms the
 * controls again, thus a person clearing several lines in a row is never refused.
 *
 * A test on time and distance was tried first and was wrong. Three deliberate deletes
 * 200ms apart look exactly like a double click by that measure, and one of the three was
 * silently dropped. Movement is the thing that actually separates the two.
 */
export function RemoveButton({ onRemove, label, title, inline = false }: Props) {
  return (
    <button
      type="button"
      className={`cv-tool${inline ? ' cv-tool-inline' : ''}`}
      onClick={() => {
        settle();
        onRemove();
      }}
      aria-label={label}
      title={title}
    >
      <RemoveIcon />
    </button>
  );
}
