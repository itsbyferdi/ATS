/**
 * Holds the delete controls back until the pointer moves.
 *
 * A delete applies immediately, so the document under the pointer moves while the pointer
 * does not. Whatever arrives in that spot is a live control, and the second press of a
 * double click hits it. That press deletes a part the person never chose, and there is no
 * undo in this editor.
 *
 * `settle()` marks the document as moving. Every delete control stops answering the
 * pointer, which the stylesheet does with one rule on `[data-settling]`. The next
 * pointer movement clears the mark.
 *
 * Movement is the correct test, and it is the only one that separates the two cases. The
 * two presses of a double click carry no movement between them. A person deleting several
 * lines in a row always moves, if only by a pixel, so they are never refused. A test on
 * elapsed time refuses both.
 *
 * The keyboard is untouched. A control reached with Tab is revealed by `:focus-visible`
 * and is not held back, because the caret does not land on a control by accident.
 */
const ATTRIBUTE = 'data-settling';

let waiting = false;

function release() {
  waiting = false;
  document.documentElement.removeAttribute(ATTRIBUTE);
  // Whichever event ran, both listeners go. `once` only removes the one that fired.
  window.removeEventListener('pointermove', release);
  window.removeEventListener('keydown', release);
}

export function settle(): void {
  if (typeof document === 'undefined') return;

  document.documentElement.setAttribute(ATTRIBUTE, '');
  if (waiting) return;

  waiting = true;
  // `once` removes the listener, so a document that is never touched again does not keep
  // one alive. `pointermove` covers a mouse, a pen and a finger with one event.
  window.addEventListener('pointermove', release, { once: true, passive: true });
  // A press of any kind that is not the double click also means the person has moved on.
  window.addEventListener('keydown', release, { once: true, passive: true });
}
