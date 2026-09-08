import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import type {
  Tab14ClinicalEntry,
  Tab14ExtendedSectionKey,
  Tab14ExtraEntryField,
} from '../intake/tab14PortabilitySections';
import {
  TAB14_EXTRA_ENTRY_FIELDS,
  emptyClinicalEntry,
} from '../intake/tab14PortabilitySections';

type Props = {
  sectionKey: Tab14ExtendedSectionKey;
  title: string;
  entries: Tab14ClinicalEntry[];
  canEdit: boolean;
  onChange: (next: Tab14ClinicalEntry[]) => void;
};

const EXTRA_FIELD_LABELS: Record<Tab14ExtraEntryField, string> = {
  status: 'Status',
  category: 'Category',
  relationship: 'Relation',
  phone: 'Phone',
  email: 'Email',
  address: 'Address',
  role: 'Role',
  memberId: 'Member ID',
  npi: 'NPI',
  specialty: 'Specialty',
  laterality: 'Laterality',
  encounterId: 'Encounter ID',
  code: 'Code',
  codeSystem: 'Code system',
  icd10: 'ICD-10',
  snomed: 'SNOMED-CT',
  onsetAge: 'Onset age',
  diedAge: 'Died of this age',
  resolvedAge: 'Resolved age',
  response: 'Response (Y/N)',
  noteType: 'Note type',
  submitDate: 'Submit date',
  orderDate: 'Order date',
  instructions: 'Instructions',
  performer: 'Performer',
  location: 'Location',
  startDateTime: 'Start date/time',
  closedDateTime: 'Closed date/time',
  score: 'Score',
};

function extraFieldLabel(sectionKey: Tab14ExtendedSectionKey, field: Tab14ExtraEntryField): string {
  if (field === 'relationship' && sectionKey === 'familyHistory') return 'Relationship';
  if (sectionKey === 'planOfTreatment') {
    if (field === 'category') return 'Reminders';
    if (field === 'instructions') return 'Instructions';
  }
  return EXTRA_FIELD_LABELS[field];
}

/** Athena columns worth showing per section even when the document left them blank. */
const SECTION_EXTRA_FIELDS: Partial<Record<Tab14ExtendedSectionKey, Tab14ExtraEntryField[]>> = {
  relatedPerson: ['relationship', 'phone', 'email', 'address'],
  careTeamMembers: ['role', 'phone', 'address'],
  careTeam: ['role', 'memberId', 'npi', 'specialty', 'phone', 'address'],
  // Meditech PoT columns are laid out explicitly; keep status / submit / instructions as extras
  planOfTreatment: ['status', 'submitDate', 'instructions'],
  patientInstructions: ['encounterId'],
  surgicalHistory: ['status', 'laterality'],
  imagingResults: ['status', 'laterality'],
  procedures: ['status', 'laterality'],
  familyHistory: ['relationship', 'onsetAge', 'diedAge', 'resolvedAge'],
  medicalHistory: ['response'],
  obstetricsHistory: ['category'],
  immunizations: ['status'],
  notes: ['noteType'],
  mentalStatus: ['score'],
  advanceDirectives: ['status', 'response'],
};

const CONTACT_SECTION_KEYS = new Set<Tab14ExtendedSectionKey>([
  'relatedPerson',
  'careTeamMembers',
  'careTeam',
]);

const PLAN_OF_TREATMENT_KEY: Tab14ExtendedSectionKey = 'planOfTreatment';

function extraFieldsForRow(
  sectionKey: Tab14ExtendedSectionKey,
  row: Tab14ClinicalEntry
): Tab14ExtraEntryField[] {
  const mapped = SECTION_EXTRA_FIELDS[sectionKey] ?? [];
  /** Already shown as Reminders / Order / Date / Provider / Organization. */
  const potHidden = new Set<Tab14ExtraEntryField>([
    'category',
    'orderDate',
    'performer',
    'location',
  ]);
  const populated = TAB14_EXTRA_ENTRY_FIELDS.filter((field) => {
    if (mapped.includes(field)) return false;
    if (sectionKey === PLAN_OF_TREATMENT_KEY && potHidden.has(field)) return false;
    return Boolean(String(row[field] ?? '').trim());
  });
  return [...mapped, ...populated];
}

function entryAccordionTitle(
  sectionKey: Tab14ExtendedSectionKey,
  sectionTitle: string,
  row: Tab14ClinicalEntry,
  index: number
): string {
  const name = row.title.trim() || sectionTitle;
  const bits = [`${index + 1}# ${name}`];
  if (CONTACT_SECTION_KEYS.has(sectionKey)) {
    if (row.relationship?.trim()) bits.push(row.relationship.trim());
    else if (row.role?.trim()) bits.push(row.role.trim());
    if (row.phone?.trim()) {
      const p = row.phone.trim();
      bits.push(p.length > 22 ? `${p.slice(0, 22)}…` : p);
    }
    return bits.join(' · ');
  }
  if (sectionKey === PLAN_OF_TREATMENT_KEY) {
    if (row.category?.trim()) bits.push(row.category.trim());
    if (row.date.trim()) bits.push(row.date.trim());
    if (row.recordedBy?.trim()) {
      const by = row.recordedBy.trim();
      bits.push(by.length > 28 ? `${by.slice(0, 28)}…` : by);
    }
    return bits.join(' · ');
  }
  if (row.date.trim()) bits.push(row.date.trim());
  if (row.detail.trim()) {
    const d = row.detail.trim();
    bits.push(d.length > 40 ? `${d.slice(0, 40)}…` : d);
  } else if (row.response?.trim()) {
    bits.push(row.response.trim());
  } else if (row.score?.trim()) {
    bits.push(`Score ${row.score.trim()}`);
  }
  return bits.join(' · ');
}

function uniqueDatesNewestFirst(entries: Tab14ClinicalEntry[]): string[] {
  const dates = [
    ...new Set(entries.map((e) => e.date.trim()).filter(Boolean)),
  ];
  return dates.sort((a, b) => {
    const parse = (d: string) => {
      if (/^\d{4}-\d{2}-\d{2}/.test(d)) return Date.parse(d);
      const m = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (m) return Date.parse(`${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`);
      return 0;
    };
    return parse(b) - parse(a);
  });
}

function toggleKeyDown(onActivate: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate();
    }
  };
}

/**
 * Generic Add Patient Information panel for portability sections
 * that do not yet have a dedicated rich form (care team, social history, etc.).
 * Each entry is a collapsible accordion (same pattern as Medications / Allergies).
 */
export default function Tab14ExtendedSectionPanel({
  sectionKey,
  title,
  entries,
  canEdit,
  onChange,
}: Props) {
  const [openByIndex, setOpenByIndex] = useState<Record<number, boolean>>({});
  const [dateFilter, setDateFilter] = useState<string>('all');

  const datedOptions = useMemo(() => uniqueDatesNewestFirst(entries), [entries]);
  const showDateFilter = sectionKey === 'mentalStatus' && datedOptions.length > 1;

  const visibleIndexes = useMemo(() => {
    return entries
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => {
        if (!showDateFilter || dateFilter === 'all') return true;
        if (!row.date.trim()) {
          // Stress / undated rows stay visible with every date filter
          return true;
        }
        return row.date.trim() === dateFilter;
      })
      .map(({ index }) => index);
  }, [entries, showDateFilter, dateFilter]);

  // When entries are replaced (PDF re-upload), collapse all and reset date filter
  useEffect(() => {
    setOpenByIndex({});
    setDateFilter('all');
  }, [sectionKey, entries.length]);

  const update = (index: number, patch: Partial<Tab14ClinicalEntry>) => {
    onChange(entries.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const remove = (index: number) => {
    onChange(entries.filter((_, i) => i !== index));
    setOpenByIndex({});
  };

  const add = () => {
    onChange([...entries, emptyClinicalEntry()]);
    setOpenByIndex((prev) => ({ ...prev, [entries.length]: true }));
  };

  const setAllOpen = (open: boolean) => {
    const next: Record<number, boolean> = {};
    for (const index of visibleIndexes) next[index] = open;
    setOpenByIndex(next);
  };

  const toggle = (index: number) => {
    setOpenByIndex((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <fieldset
      className={`tab14-record-fieldset${!canEdit ? ' tab14-record-fieldset--locked' : ''}`}
    >
      <div className="tab14-section-card">
        <p className="tab14-panel-sub" style={{ marginTop: 0 }}>
          Maps to the document section <strong>{title}</strong>. Values can come from a PDF
          upload; staff edit or add entries in the admin portal.
        </p>

        {showDateFilter && (
          <div className="form-field tab14-extended-date-filter">
            <label htmlFor={`tab14-${sectionKey}-date-filter`}>Assessment date</label>
            <select
              id={`tab14-${sectionKey}-date-filter`}
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setOpenByIndex({});
              }}
            >
              <option value="all">All dates ({entries.length})</option>
              {datedOptions.map((d) => {
                const count = entries.filter((e) => e.date.trim() === d).length;
                return (
                  <option key={d} value={d}>
                    {d} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {entries.length === 0 ? (
          <p className="tab14-panel-sub">No entries yet for this section.</p>
        ) : (
          <>
            <div className="tab14-repeater-toolbar">
              <div
                role="button"
                tabIndex={0}
                className="tab14-repeater-toolbar__action"
                onClick={() => setAllOpen(true)}
                onKeyDown={toggleKeyDown(() => setAllOpen(true))}
              >
                Expand all
              </div>
              <div
                role="button"
                tabIndex={0}
                className="tab14-repeater-toolbar__action"
                onClick={() => setAllOpen(false)}
                onKeyDown={toggleKeyDown(() => setAllOpen(false))}
              >
                Collapse all
              </div>
            </div>

            <div className="tab14-extended-entry-list">
              {visibleIndexes.map((index) => {
                const row = entries[index];
                const isOpen = Boolean(openByIndex[index]);
                const panelId = `tab14-ext-${sectionKey}-${index}`;
                return (
                  <div
                    key={`${sectionKey}-${index}`}
                    className="tab14-repeater-accordion section-block tab14-extended-entry-accordion"
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      className={`accordion-header tab14-repeater-accordion__header${
                        isOpen ? ' tab14-repeater-accordion__header--open' : ''
                      }`}
                      onClick={() => toggle(index)}
                      onKeyDown={toggleKeyDown(() => toggle(index))}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                    >
                      <span className="tab14-repeater-accordion__title-wrap">
                        <span className="tab14-repeater-accordion__title">
                          {entryAccordionTitle(sectionKey, title, row, index)}
                        </span>
                      </span>
                      <span className="tab14-repeater-accordion__chevron" aria-hidden="true">
                        {isOpen ? '▾' : '▸'}
                      </span>
                    </div>

                    {isOpen ? (
                      <div
                        id={panelId}
                        className="accordion-content tab14-repeater-accordion__content tab14-extended-entry__body"
                      >
                        {sectionKey === PLAN_OF_TREATMENT_KEY ? (
                          <>
                            <div className="form-field">
                              <label>Reminders</label>
                              <input
                                value={row.category ?? ''}
                                onChange={(e) => update(index, { category: e.target.value })}
                                placeholder="Lab, Imaging, MedicationOrders…"
                              />
                            </div>
                            <div className="form-field">
                              <label>Order</label>
                              <input
                                value={row.title}
                                onChange={(e) => update(index, { title: e.target.value })}
                                placeholder="Order name (e.g. free T4)"
                              />
                            </div>
                            <div className="form-field">
                              <label>Date</label>
                              <input
                                value={row.date}
                                onChange={(e) => update(index, { date: e.target.value })}
                                placeholder="MM/DD/YYYY or YYYY-MM-DD"
                              />
                            </div>
                            <div className="form-field">
                              <label>Provider Name</label>
                              <input
                                value={row.recordedBy ?? ''}
                                onChange={(e) => update(index, { recordedBy: e.target.value })}
                                placeholder="Ordering provider"
                              />
                            </div>
                            <div className="form-field">
                              <label>Organization Details</label>
                              <input
                                value={row.place ?? ''}
                                onChange={(e) => update(index, { place: e.target.value })}
                                placeholder="Lab / pharmacy / imaging org"
                              />
                            </div>
                            <div className="form-field">
                              <label>Additional notes</label>
                              <textarea
                                rows={2}
                                value={row.detail}
                                onChange={(e) => update(index, { detail: e.target.value })}
                                placeholder="Optional free-text notes"
                              />
                            </div>
                            {extraFieldsForRow(sectionKey, row).map((field) => (
                              <div className="form-field" key={field}>
                                <label>{extraFieldLabel(sectionKey, field)}</label>
                                <input
                                  value={row[field] ?? ''}
                                  onChange={(e) => update(index, { [field]: e.target.value })}
                                />
                              </div>
                            ))}
                          </>
                        ) : (
                          <>
                            <div className="form-field">
                              <label>Title / name</label>
                              <input
                                value={row.title}
                                onChange={(e) => update(index, { title: e.target.value })}
                              />
                            </div>
                            {CONTACT_SECTION_KEYS.has(sectionKey) &&
                              extraFieldsForRow(sectionKey, row).map((field) => (
                                <div className="form-field" key={field}>
                                  <label>{extraFieldLabel(sectionKey, field)}</label>
                                  <input
                                    value={row[field] ?? ''}
                                    onChange={(e) => update(index, { [field]: e.target.value })}
                                  />
                                </div>
                              ))}
                            <div className="form-field">
                              <label>
                                {CONTACT_SECTION_KEYS.has(sectionKey)
                                  ? 'Additional notes'
                                  : 'Detail / answer'}
                              </label>
                              <textarea
                                rows={CONTACT_SECTION_KEYS.has(sectionKey) ? 2 : 3}
                                value={row.detail}
                                onChange={(e) => update(index, { detail: e.target.value })}
                                placeholder={
                                  CONTACT_SECTION_KEYS.has(sectionKey)
                                    ? 'Optional free-text notes (contact fields above)'
                                    : undefined
                                }
                              />
                            </div>
                            <div className="form-field">
                              <label>Date</label>
                              <input
                                value={row.date}
                                onChange={(e) => update(index, { date: e.target.value })}
                                placeholder="MM/DD/YYYY or YYYY-MM-DD"
                              />
                            </div>
                            <div className="form-field">
                              <label>Recorded by</label>
                              <input
                                value={row.recordedBy ?? ''}
                                onChange={(e) => update(index, { recordedBy: e.target.value })}
                                placeholder="Who recorded this answer"
                              />
                            </div>
                            <div className="form-field">
                              <label>Place</label>
                              <input
                                value={row.place ?? ''}
                                onChange={(e) => update(index, { place: e.target.value })}
                                placeholder="Organization / location"
                              />
                            </div>
                            <div className="form-field">
                              <label>Time</label>
                              <input
                                value={row.time ?? ''}
                                onChange={(e) => update(index, { time: e.target.value })}
                                placeholder="HH:MM:SS"
                              />
                            </div>
                            <div className="form-field">
                              <label>Notes</label>
                              <textarea
                                rows={2}
                                value={row.notes ?? ''}
                                onChange={(e) => update(index, { notes: e.target.value })}
                              />
                            </div>
                            {!CONTACT_SECTION_KEYS.has(sectionKey) &&
                              extraFieldsForRow(sectionKey, row).map((field) => (
                                <div className="form-field" key={field}>
                                  <label>{extraFieldLabel(sectionKey, field)}</label>
                                  <input
                                    value={row[field] ?? ''}
                                    onChange={(e) => update(index, { [field]: e.target.value })}
                                  />
                                </div>
                              ))}
                          </>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            className="remove-btn"
                            onClick={() => remove(index)}
                          >
                            Remove entry
                          </button>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {canEdit && (
          <button type="button" className="add-btn" onClick={add} style={{ marginTop: 12 }}>
            Add entry
          </button>
        )}
      </div>
    </fieldset>
  );
}
