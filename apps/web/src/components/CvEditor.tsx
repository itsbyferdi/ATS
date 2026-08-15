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

interface Props {
  doc: CvDoc;
  onChange: (doc: CvDoc) => void;
}

/** Replaces one item of a list and leaves the rest as they were. */
const replaceAt = <T,>(list: T[], index: number, next: T): T[] =>
  list.map((item, i) => (i === index ? next : item));

/**
 * The document, on the page, exactly as it prints.
 *
 * Each piece of text is editable where it sits. There is no separate form, because a
 * form and a preview always drift apart. The controls that add and remove a part stay
 * out of the way until the pointer is on the part they belong to.
 */
export function CvEditor({ doc, onChange }: Props) {
  const set = (patch: Partial<CvDoc>) => onChange({ ...doc, ...patch });

  const setSection = (index: number, next: CvSection) =>
    set({ sections: replaceAt(doc.sections, index, next) });

  const addSection = (kind: SectionKind) => set({ sections: [...doc.sections, emptySection(kind)] });

  const removeSection = (index: number) =>
    set({ sections: doc.sections.filter((_, i) => i !== index) });

  const moveSection = (index: number, by: number) => {
    const to = index + by;
    if (to < 0 || to >= doc.sections.length) return;
    const next = [...doc.sections];
    [next[index], next[to]] = [next[to], next[index]];
    set({ sections: next });
  };

  return (
    <article className="paper" aria-label="Your CV">
      <header className="cv-head">
        <Editable
          className="cv-name"
          value={doc.name}
          placeholder="Your name"
          onChange={(name) => set({ name })}
        />
        <Editable
          className="cv-headline"
          value={doc.headline}
          placeholder="Your job title"
          onChange={(headline) => set({ headline })}
        />

        <div className="cv-contact">
          {doc.contact.map((field, i) => (
            <span key={field.id} className="cv-contact-field">
              <Editable
                className="cv-label"
                value={field.label}
                placeholder="Label"
                onChange={(label) => set({ contact: replaceAt(doc.contact, i, { ...field, label }) })}
              />
              <Editable
                className="cv-contact-value"
                value={field.value}
                placeholder="Value"
                onChange={(value) => set({ contact: replaceAt(doc.contact, i, { ...field, value }) })}
                onEmptyBackspace={() =>
                  doc.contact.length > 1 && set({ contact: doc.contact.filter((_, x) => x !== i) })
                }
              />
            </span>
          ))}
          <button
            type="button"
            className="cv-add cv-add-inline"
            onClick={() =>
              set({ contact: [...doc.contact, { id: newId('c'), label: 'Label', value: '' }] })
            }
          >
            + field
          </button>
        </div>
      </header>

      {doc.sections.map((section, si) => (
        <section key={section.id} className="cv-section">
          <div className="cv-section-head">
            <Editable
              className="cv-h2"
              value={section.heading}
              placeholder="Section heading"
              onChange={(heading) => setSection(si, { ...section, heading })}
            />
            <span className="cv-tools" aria-hidden={false}>
              <button type="button" onClick={() => moveSection(si, -1)} aria-label="Move section up" title="Move up">↑</button>
              <button type="button" onClick={() => moveSection(si, 1)} aria-label="Move section down" title="Move down">↓</button>
              <button type="button" onClick={() => removeSection(si)} aria-label="Remove section" title="Remove">×</button>
            </span>
          </div>

          {section.kind === 'text' && (
            <Editable
              className="cv-body"
              multiline
              value={section.body}
              placeholder="Write this section here"
              onChange={(body) => setSection(si, { ...section, body })}
            />
          )}

          {section.kind === 'rows' && (
            <>
              {section.rows.map((row, ri) => (
                <div key={row.id} className="cv-row">
                  <Editable
                    className="cv-row-label"
                    value={row.label}
                    placeholder="Group"
                    onChange={(label) =>
                      setSection(si, { ...section, rows: replaceAt(section.rows, ri, { ...row, label }) })
                    }
                  />
                  <Editable
                    className="cv-row-value"
                    multiline
                    value={row.value}
                    placeholder="The skills for this group, separated by commas"
                    onChange={(value) =>
                      setSection(si, { ...section, rows: replaceAt(section.rows, ri, { ...row, value }) })
                    }
                    onEnter={() =>
                      setSection(si, {
                        ...section,
                        rows: [...section.rows.slice(0, ri + 1), emptyRow(), ...section.rows.slice(ri + 1)],
                      })
                    }
                    onEmptyBackspace={() =>
                      section.rows.length > 1 &&
                      setSection(si, { ...section, rows: section.rows.filter((_, x) => x !== ri) })
                    }
                  />
                </div>
              ))}
              <button
                type="button"
                className="cv-add"
                onClick={() => setSection(si, { ...section, rows: [...section.rows, emptyRow()] })}
              >
                + row
              </button>
            </>
          )}

          {section.kind === 'entries' && (
            <>
              {section.entries.map((entry, ei) => (
                <EntryBlock
                  key={entry.id}
                  entry={entry}
                  onChange={(next) =>
                    setSection(si, { ...section, entries: replaceAt(section.entries, ei, next) })
                  }
                  onRemove={() =>
                    setSection(si, { ...section, entries: section.entries.filter((_, x) => x !== ei) })
                  }
                />
              ))}
              <button
                type="button"
                className="cv-add"
                onClick={() => setSection(si, { ...section, entries: [...section.entries, emptyEntry()] })}
              >
                + entry
              </button>
            </>
          )}
        </section>
      ))}

      <div className="cv-add-section">
        <button type="button" className="cv-add" onClick={() => addSection('text')}>+ text section</button>
        <button type="button" className="cv-add" onClick={() => addSection('rows')}>+ skills section</button>
        <button type="button" className="cv-add" onClick={() => addSection('entries')}>+ history section</button>
      </div>
    </article>
  );
}

function EntryBlock({
  entry,
  onChange,
  onRemove,
}: {
  entry: CvEntry;
  onChange: (entry: CvEntry) => void;
  onRemove: () => void;
}) {
  const setBullet = (i: number, text: string) =>
    onChange({ ...entry, bullets: replaceAt(entry.bullets, i, text) });

  return (
    <div className="cv-entry">
      <div className="cv-entry-head">
        <Editable
          className="cv-role"
          value={entry.role}
          placeholder="Your job title at Company"
          onChange={(role) => onChange({ ...entry, role })}
        />
        <Editable
          className="cv-loc"
          value={entry.location}
          placeholder="City (Remote)"
          onChange={(location) => onChange({ ...entry, location })}
        />
        <button type="button" className="cv-tools cv-tools-entry" onClick={onRemove} aria-label="Remove entry" title="Remove entry">
          ×
        </button>
      </div>

      <Editable
        className="cv-dates"
        value={entry.dates}
        placeholder="Month YYYY - Month YYYY"
        onChange={(dates) => onChange({ ...entry, dates })}
      />

      <Editable
        className="cv-body"
        multiline
        value={entry.summary}
        placeholder="One line about the team and your part in it. Optional."
        onChange={(summary) => onChange({ ...entry, summary })}
      />

      <ul className="cv-bullets">
        {entry.bullets.map((b, i) => (
          <li key={i}>
            <Editable
              multiline
              value={b}
              placeholder="Start with a verb. Give the result."
              onChange={(text) => setBullet(i, text)}
              onEnter={() =>
                onChange({
                  ...entry,
                  bullets: [...entry.bullets.slice(0, i + 1), '', ...entry.bullets.slice(i + 1)],
                })
              }
              onEmptyBackspace={() =>
                entry.bullets.length > 1 &&
                onChange({ ...entry, bullets: entry.bullets.filter((_, x) => x !== i) })
              }
            />
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="cv-add"
        onClick={() => onChange({ ...entry, bullets: [...entry.bullets, ''] })}
      >
        + item
      </button>
    </div>
  );
}
