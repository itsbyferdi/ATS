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
  ariaLabel?: string;
}

/**
 * One editable piece of the document.
 *
 * React and `contentEditable` do not agree about who owns the text. If React writes the
 * text back on each keystroke, the caret goes to the start of the line. Thus this
 * component writes the text only when the element does not have focus. While you type,
 * the browser owns the element and React only listens.
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
  ariaLabel,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.textContent !== value) el.textContent = value;
  }, [value]);

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
      onInput={(e) => onChange(e.currentTarget.textContent ?? '')}
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
