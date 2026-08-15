import { useEffect, useRef, type KeyboardEvent } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** A single line refuses Enter, thus a heading cannot become two paragraphs. */
  multiline?: boolean;
  /** Enter makes the next item in a list. Backspace on an empty item removes it. */
  onEnter?: () => void;
  onEmptyBackspace?: () => void;
  /** Takes the caret when it becomes true. A part that you add gets the caret. */
  takeFocus?: boolean;
  /** Runs after the caret arrives, so the request can be cleared and not repeat. */
  onTookFocus?: () => void;
  ariaLabel?: string;
}

/** Puts the caret after the last character, which is where a person continues to write. */
function caretToEnd(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

/**
 * One editable piece of the document.
 *
 * React and `contentEditable` do not agree about who owns the text. If React writes the
 * text back on each keystroke, the caret goes to the start of the line. Thus this
 * component writes the text only when the text in the element and the text in the
 * document are different.
 *
 * That test replaces an earlier test, which was "write only when the element does not
 * have focus". The earlier test lost text: remove an item from the middle of a list while
 * the caret is in it, and the item that moves up keeps the focus and keeps the old text,
 * because the update was refused. The test below cannot refuse a change that comes from
 * the document, and it still refuses the echo of your own keystroke.
 *
 * The text is plain. A paste keeps the words and discards the formatting, because a
 * style that comes from another program is the thing that breaks a CV.
 */
export function Editable({
  value,
  onChange,
  placeholder,
  className = '',
  multiline = false,
  onEnter,
  onEmptyBackspace,
  takeFocus = false,
  onTookFocus,
  ariaLabel,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  /** The last text this element sent out. Anything else came from the document. */
  const sent = useRef(value);
  /** An input method editor builds a character over several events. Do not interrupt it. */
  const composing = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || composing.current) return;
    if (el.textContent === value) return;

    const focused = document.activeElement === el;
    // The echo of a keystroke that this element sent. The browser already shows it.
    if (focused && value === sent.current) return;

    el.textContent = value;
    if (focused) caretToEnd(el);
  }, [value]);

  useEffect(() => {
    const el = ref.current;
    if (!takeFocus || !el) return;
    if (document.activeElement !== el) {
      el.focus();
      caretToEnd(el);
    }
    onTookFocus?.();
  });

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (onEnter) {
        e.preventDefault();
        onEnter();
        return;
      }
      if (!multiline) e.preventDefault();
    }
    if (
      e.key === 'Backspace' &&
      onEmptyBackspace &&
      !(e.currentTarget.textContent ?? '').trim()
    ) {
      e.preventDefault();
      onEmptyBackspace();
    }
  };

  return (
    <div
      ref={ref}
      role="textbox"
      aria-label={ariaLabel ?? placeholder}
      aria-multiline={multiline}
      tabIndex={0}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      className={`editable ${className}`.trim()}
      data-placeholder={placeholder}
      onInput={(e) => {
        const text = e.currentTarget.textContent ?? '';
        sent.current = text;
        onChange(text);
      }}
      onCompositionStart={() => {
        composing.current = true;
      }}
      onCompositionEnd={(e) => {
        composing.current = false;
        const text = e.currentTarget.textContent ?? '';
        sent.current = text;
        onChange(text);
      }}
      onKeyDown={handleKeyDown}
      onPaste={(e) => {
        // Keep the words, discard the styles.
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain').replace(/\s+/g, ' ');
        document.execCommand('insertText', false, text);
      }}
    />
  );
}
