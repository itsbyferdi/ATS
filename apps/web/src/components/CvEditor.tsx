import { useState, type Dispatch, type SetStateAction } from 'react';
import {
  emptyEntry,
  emptyRow,
  emptySection,
  newId,
  type CvDoc,
  type CvEntry,
  type CvSection,
  type SectionKind,
} from '@ats/core';

import { Editable } from './Editable.js';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  HistoryIcon,
  ListIcon,
  ParagraphIcon,
  PlusIcon,
} from './EditorIcons.js';
import { RemoveButton } from './RemoveButton.js';
import { useEnter } from '../lib/motion.js';

interface Props {
  doc: CvDoc;
  /** A React setter. Every change is a function of the current document rather than of
   *  a copy captured when the handler was built, thus two changes cannot overwrite each
   *  other and a delete always applies to the document as it is now. */
  onChange: Dispatch<SetStateAction<CvDoc>>;
}

/** Replaces the item with this id and leaves the rest as they were. */
const replaceById = <T extends { id: string }>(list: T[], id: string, patch: Partial<T>): T[] =>
  list.map((item) => (item.id === id ? { ...item, ...patch } : item));

const withoutId = <T extends { id: string }>(list: T[], id: string): T[] =>
  list.filter((item) => item.id !== id);

/**
 * The document, on the page, exactly as it prints.
 *
 * Each piece of text is editable where it sits. There is no separate form, because a
 * form and a preview always drift apart.
 *
 * `data-block` marks the smallest whole part of the document. `lib/paginate.ts` measures
 * those parts to find where each A4 page ends, thus a page break never cuts a line of
 * text in half. `keep-with-next` marks a heading, which must not stay alone at the foot
 * of a page.
 *
 * Every control says what it adds and shows what it does. A control that reads "+ entry"
 * does not tell a person writing a CV what arrives when they press it.
 */
export function CvEditor({ doc, onChange }: Props) {
  /** The field that gets the caret next. A part you add is a part you want to write in. */
  const [focus, setFocus] = useState<string | null>(null);
  /** The request is used once. Without this, a later list change takes the caret again. */
  const clearFocus = () => setFocus(null);

  const patch = (update: (doc: CvDoc) => CvDoc) => onChange(update);

  const setSection = (id: string, next: Partial<CvSection>) =>
    patch((d) => ({ ...d, sections: replaceById(d.sections, id, next) }));

  const addSection = (kind: SectionKind) => {
    const section = emptySection(kind);
    patch((d) => ({ ...d, sections: [...d.sections, section] }));
    setFocus(`section:${section.id}`);
  };

  const moveSection = (id: string, by: number) =>
    patch((d) => {
      const index = d.sections.findIndex((s) => s.id === id);
      const to = index + by;
      if (index < 0 || to < 0 || to >= d.sections.length) return d;
      const sections = [...d.sections];
      [sections[index], sections[to]] = [sections[to], sections[index]];
      return { ...d, sections };
    });

  const addContact = () => {
    const field = { id: newId('c'), label: 'Label', value: '' };
    patch((d) => ({ ...d, contact: [...d.contact, field] }));
    setFocus(`contact:${field.id}`);
  };

  return (
    <article className="cv-flow-inner" aria-label="Your CV">
      <header className="cv-head" data-block>
        <Editable
          className="cv-name"
          value={doc.name}
          placeholder="Your name"
          onChange={(name) => patch((d) => ({ ...d, name }))}
        />
        <Editable
          className="cv-headline"
          value={doc.headline}
          placeholder="Your job title"
          onChange={(headline) => patch((d) => ({ ...d, headline }))}
        />

        <div className="cv-contact">
          {doc.contact.map((field) => (
            <ContactField
              key={field.id}
              field={field}
              focus={focus}
              onClearFocus={clearFocus}
              onPatch={(next) => patch((d) => ({ ...d, contact: replaceById(d.contact, field.id, next) }))}
              onRemove={
                doc.contact.length > 1
                  ? () => patch((d) => ({ ...d, contact: withoutId(d.contact, field.id) }))
                  : undefined
              }
            />
          ))}
        </div>

        {/* Below the details, not among them. Inside that row the control was one more
            item in a wrapping line, so it sat wherever the last detail happened to end
            and it read as a contact detail of its own. */}
        <button type="button" className="cv-add" onClick={addContact}>
          <PlusIcon /> Add a contact detail
        </button>
      </header>

      {doc.sections.map((section) => (
        <SectionBlock
          key={section.id}
          section={section}
          focus={focus}
          onFocusField={setFocus}
          onClearFocus={clearFocus}
          onPatch={(next) => setSection(section.id, next)}
          onMove={(by) => moveSection(section.id, by)}
          onRemove={() => patch((d) => ({ ...d, sections: withoutId(d.sections, section.id) }))}
          onRemoveEntry={(entryId) =>
            patch((d) => ({
              ...d,
              sections: d.sections.map((s) =>
                s.id === section.id ? { ...s, entries: withoutId(s.entries, entryId) } : s,
              ),
            }))
          }
          onRemoveRow={(rowId) =>
            patch((d) => ({
              ...d,
              sections: d.sections.map((s) =>
                s.id === section.id ? { ...s, rows: withoutId(s.rows, rowId) } : s,
              ),
            }))
          }
        />
      ))}

      <div className="cv-add-section" data-block>
        <button type="button" className="cv-add" onClick={() => addSection('text')}>
          <ParagraphIcon /> Add a paragraph section
        </button>
        <button type="button" className="cv-add" onClick={() => addSection('rows')}>
          <ListIcon /> Add a skills section
        </button>
        <button type="button" className="cv-add" onClick={() => addSection('entries')}>
          <HistoryIcon /> Add a history section
        </button>
      </div>
    </article>
  );
}

/**
 * One line of the header block.
 *
 * It is a component and not a piece of the loop above, because it calls `useEnter`, and a
 * hook inside a `map` runs a different number of times on each render.
 */
function ContactField({
  field,
  focus,
  onClearFocus,
  onPatch,
  onRemove,
}: {
  field: { id: string; label: string; value: string };
  focus: string | null;
  onClearFocus: () => void;
  onPatch: (next: { label?: string; value?: string }) => void;
  onRemove?: () => void;
}) {
  const enter = useEnter();

  return (
    <span className={`cv-contact-field ${enter}`.trim()}>
      <Editable
        className="cv-label"
        value={field.label}
        placeholder="Label"
        onChange={(label) => onPatch({ label })}
      />
      <Editable
        className="cv-contact-value"
        value={field.value}
        placeholder="Value"
        takeFocus={focus === `contact:${field.id}`}
        onTookFocus={onClearFocus}
        onChange={(value) => onPatch({ value })}
        onEmptyBackspace={onRemove}
      />
      {/* Until now the only way to take a line out of the header was to empty it and
          press Backspace once more, which nothing on the page mentioned. */}
      {onRemove && (
        <RemoveButton
          inline
          onRemove={onRemove}
          label={`Remove ${field.label.trim() || 'this contact detail'}`}
          title="Remove this contact detail"
        />
      )}
    </span>
  );
}

function SectionBlock({
  section,
  focus,
  onFocusField,
  onClearFocus,
  onPatch,
  onMove,
  onRemove,
  onRemoveEntry,
  onRemoveRow,
}: {
  section: CvSection;
  focus: string | null;
  onFocusField: (key: string) => void;
  onClearFocus: () => void;
  onPatch: (next: Partial<CvSection>) => void;
  onMove: (by: number) => void;
  onRemove: () => void;
  onRemoveEntry: (id: string) => void;
  onRemoveRow: (id: string) => void;
}) {
  const enter = useEnter();

  return (
    <section className={`cv-section ${enter}`.trim()}>
      <div className="cv-section-head" data-block="keep-with-next">
        <Editable
          className="cv-h2"
          value={section.heading}
          placeholder="Section heading"
          takeFocus={focus === `section:${section.id}`}
          onTookFocus={onClearFocus}
          onChange={(heading) => onPatch({ heading })}
        />
        <span className="cv-tools">
          <button type="button" className="cv-tool" onClick={() => onMove(-1)} aria-label={`Move ${section.heading} up`} title="Move up">
            <ArrowUpIcon />
          </button>
          <button type="button" className="cv-tool" onClick={() => onMove(1)} aria-label={`Move ${section.heading} down`} title="Move down">
            <ArrowDownIcon />
          </button>
          <RemoveButton
            onRemove={onRemove}
            label={`Remove ${section.heading}`}
            title="Remove this section"
          />
        </span>
      </div>

      {section.kind === 'text' && (
        <div data-block>
          <Editable
            className="cv-body"
            multiline
            value={section.body}
            placeholder="Write this section here"
            onChange={(body) => onPatch({ body })}
          />
        </div>
      )}

      {section.kind === 'rows' && (
        <>
          {section.rows.map((row, ri) => (
            <RowBlock
              key={row.id}
              row={row}
              focus={focus}
              onClearFocus={onClearFocus}
              onPatch={(next) => onPatch({ rows: replaceById(section.rows, row.id, next) })}
              onSplit={() => {
                const made = emptyRow();
                onPatch({
                  rows: [...section.rows.slice(0, ri + 1), made, ...section.rows.slice(ri + 1)],
                });
                onFocusField(`row:${made.id}`);
              }}
              onRemove={section.rows.length > 1 ? () => onRemoveRow(row.id) : undefined}
            />
          ))}
          <button
            type="button"
            className="cv-add"
            data-block
            onClick={() => {
              const row = emptyRow();
              onPatch({ rows: [...section.rows, row] });
              onFocusField(`row:${row.id}`);
            }}
          >
            <PlusIcon /> Add a skill group
          </button>
        </>
      )}

      {section.kind === 'entries' && (
        <>
          {section.entries.map((entry) => (
            <EntryBlock
              key={entry.id}
              entry={entry}
              focus={focus}
              onFocusField={onFocusField}
              onClearFocus={onClearFocus}
              onPatch={(next) => onPatch({ entries: replaceById(section.entries, entry.id, next) })}
              onRemove={() => onRemoveEntry(entry.id)}
            />
          ))}
          <button
            type="button"
            className="cv-add"
            data-block
            onClick={() => {
              const entry = emptyEntry();
              onPatch({ entries: [...section.entries, entry] });
              onFocusField(`entry:${entry.id}`);
            }}
          >
            <PlusIcon /> Add to {section.heading.trim() || 'this section'}
          </button>
        </>
      )}
    </section>
  );
}

function RowBlock({
  row,
  focus,
  onClearFocus,
  onPatch,
  onSplit,
  onRemove,
}: {
  row: { id: string; label: string; value: string };
  focus: string | null;
  onClearFocus: () => void;
  onPatch: (next: { label?: string; value?: string }) => void;
  onSplit: () => void;
  onRemove?: () => void;
}) {
  const enter = useEnter();

  return (
    <div className={`cv-row ${enter}`.trim()} data-block>
      <Editable
        className="cv-row-label"
        value={row.label}
        placeholder="Group"
        takeFocus={focus === `row:${row.id}`}
        onTookFocus={onClearFocus}
        onChange={(label) => onPatch({ label })}
      />
      <Editable
        className="cv-row-value"
        multiline
        value={row.value}
        placeholder="The skills for this group, separated by commas"
        onChange={(value) => onPatch({ value })}
        onEnter={onSplit}
        onEmptyBackspace={onRemove}
      />
      {onRemove && (
        <RemoveButton
          inline
          onRemove={onRemove}
          label={`Remove ${row.label.trim() || 'this skill group'}`}
          title="Remove this skill group"
        />
      )}
    </div>
  );
}

function EntryBlock({
  entry,
  focus,
  onFocusField,
  onClearFocus,
  onPatch,
  onRemove,
}: {
  entry: CvEntry;
  focus: string | null;
  onFocusField: (key: string) => void;
  onClearFocus: () => void;
  onPatch: (next: Partial<CvEntry>) => void;
  onRemove: () => void;
}) {
  const enter = useEnter();

  const addBullet = (at: number) => {
    onPatch({ bullets: [...entry.bullets.slice(0, at), '', ...entry.bullets.slice(at)] });
    onFocusField(`bullet:${entry.id}:${at}`);
  };

  return (
    <div className={`cv-entry ${enter}`.trim()}>
      <div className="cv-entry-top" data-block="keep-with-next">
        <div className="cv-entry-head">
          <Editable
            className="cv-role"
            value={entry.role}
            placeholder="Your job title at Company"
            takeFocus={focus === `entry:${entry.id}`}
            onTookFocus={onClearFocus}
            onChange={(role) => onPatch({ role })}
          />
          <Editable
            className="cv-loc"
            value={entry.location}
            placeholder="City (Remote)"
            onChange={(location) => onPatch({ location })}
          />
          <RemoveButton
            onRemove={onRemove}
            label={`Remove ${entry.role.trim() || 'this entry'}`}
            title="Remove this entry"
          />
        </div>

        <Editable
          className="cv-dates"
          value={entry.dates}
          placeholder="Month YYYY - Month YYYY"
          onChange={(dates) => onPatch({ dates })}
        />
      </div>

      <div data-block>
        <Editable
          className="cv-body"
          multiline
          value={entry.summary}
          placeholder="One line about the team and your part in it. Optional."
          onChange={(summary) => onPatch({ summary })}
        />
      </div>

      <ul className="cv-bullets">
        {entry.bullets.map((b, i) => (
          <li key={i} data-block>
            <Editable
              multiline
              value={b}
              placeholder="Start with a verb. Give the result."
              takeFocus={focus === `bullet:${entry.id}:${i}`}
              onTookFocus={onClearFocus}
              onChange={(text) =>
                onPatch({ bullets: entry.bullets.map((x, n) => (n === i ? text : x)) })
              }
              onEnter={() => addBullet(i + 1)}
              onEmptyBackspace={() =>
                entry.bullets.length > 1 &&
                onPatch({ bullets: entry.bullets.filter((_, x) => x !== i) })
              }
            />
          </li>
        ))}
      </ul>
      <button type="button" className="cv-add" data-block onClick={() => addBullet(entry.bullets.length)}>
        <PlusIcon /> Add a bullet point
      </button>
    </div>
  );
}
