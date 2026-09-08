import React, { useState } from 'react';
import {
  formatEpicDemographicsSexBornLine,
  type EpicDemographicsOccurrence,
} from '../intake/epicPatientDemographics';
import type { Tab14PatientFields } from '../intake/tab14IntakeTypes';

export const EPIC_DEMOGRAPHICS_BATCH_SIZE = 10;

export type EpicDemographicsFormFields = {
  address: string;
  patientFullName: string;
  givenName: string;
  familyName: string;
  formerAliases: string;
  communication: string;
  phoneNumber: string;
  homePhone: string;
  email: string;
  preferredLanguage: string;
  race: string;
  ethnicity: string;
  maritalStatus: string;
  sexAtBirth: string;
  dateOfBirth: string;
};

type Props = {
  occurrences: EpicDemographicsOccurrence[];
  openMap: Record<number, boolean>;
  setOpenMap: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  setOccurrences: React.Dispatch<React.SetStateAction<EpicDemographicsOccurrence[]>>;
  fallback: EpicDemographicsFormFields;
  onPrimaryChange: (fields: Tab14PatientFields) => void;
};

function rebuildCommunication(parts: {
  phoneNumber?: string;
  homePhone?: string;
  email?: string;
}): string {
  const lines: string[] = [];
  if (parts.phoneNumber?.trim()) lines.push(`${parts.phoneNumber.trim()} (Mobile)`);
  if (parts.homePhone?.trim() && parts.homePhone.trim() !== parts.phoneNumber?.trim()) {
    lines.push(`${parts.homePhone.trim()} (Home)`);
  } else if (parts.homePhone?.trim() && !parts.phoneNumber?.trim()) {
    lines.push(`${parts.homePhone.trim()} (Home)`);
  }
  if (parts.email?.trim()) lines.push(parts.email.trim());
  return lines.join('\n');
}

function sourceBadge(source: EpicDemographicsOccurrence['source']): string | null {
  if (source === 'inferredReprint') return 'Visit reprint';
  if (source === 'coverWindow') return 'Cover';
  if (source === 'fieldCluster') return 'Field cluster';
  if (source === 'header') return 'Header';
  return null;
}

function dateKindLabel(kind: EpicDemographicsOccurrence['intakeDateKind']): string {
  if (kind === 'generated') return 'Document generated';
  if (kind === 'encounter') return 'Encounter date';
  return 'Date unknown';
}

function aliasesLines(raw: string): string {
  return String(raw || '')
    .split(/[;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join('\n');
}

type Batch = {
  batchIndex: number;
  startOrdinal: number;
  endOrdinal: number;
  rows: EpicDemographicsOccurrence[];
  dateRangeLabel: string;
};

function buildBatches(rows: EpicDemographicsOccurrence[]): Batch[] {
  const batches: Batch[] = [];
  for (let i = 0; i < rows.length; i += EPIC_DEMOGRAPHICS_BATCH_SIZE) {
    const slice = rows.slice(i, i + EPIC_DEMOGRAPHICS_BATCH_SIZE);
    const startOrdinal = slice[0]!.ordinal;
    const endOrdinal = slice[slice.length - 1]!.ordinal;
    const firstDate = slice.find((r) => r.intakeDateLabel)?.intakeDateLabel;
    const lastDate = [...slice].reverse().find((r) => r.intakeDateLabel)?.intakeDateLabel;
    const dateRangeLabel =
      firstDate && lastDate && firstDate !== lastDate
        ? `${firstDate} – ${lastDate}`
        : firstDate || lastDate || 'Dates vary';
    batches.push({
      batchIndex: batches.length,
      startOrdinal,
      endOrdinal,
      rows: slice,
      dateRangeLabel,
    });
  }
  return batches;
}

/**
 * Epic Patient Demographics intake: batches of 10 Find hits, each with intake date
 * and an Epic-style Address | Name (+ aliases) | Communication grid.
 */
export function EpicDemographicsOccurrencesPanel({
  occurrences,
  openMap,
  setOpenMap,
  setOccurrences,
  fallback,
  onPrimaryChange,
}: Props) {
  const rows: EpicDemographicsOccurrence[] =
    occurrences.length > 0
      ? occurrences
      : [
          {
            index: 0,
            ordinal: 1,
            total: 1,
            label: 'Patient Demographics · Date not on file',
            source: 'coverWindow',
            intakeDateIso: '',
            intakeDateLabel: 'Date not on file',
            intakeDateKind: 'unknown',
            visitType: 'Cover / summary of care',
            fields: {
              address: fallback.address,
              patientFullName: fallback.patientFullName,
              givenName: fallback.givenName,
              familyName: fallback.familyName,
              formerAliases: fallback.formerAliases,
              communication: fallback.communication,
              phoneNumber: fallback.phoneNumber,
              homePhone: fallback.homePhone,
              email: fallback.email,
              preferredLanguage: fallback.preferredLanguage,
              race: fallback.race,
              ethnicity: fallback.ethnicity,
              maritalStatus: fallback.maritalStatus,
              sexAtBirth: fallback.sexAtBirth,
              dateOfBirth: fallback.dateOfBirth,
            },
          },
        ];

  const batches = buildBatches(rows);
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({ 0: true });

  const updateOcc = (index: number, patch: Tab14PatientFields) => {
    setOccurrences((prev) => {
      const base =
        prev.length > 0
          ? prev
          : rows.map((r) => ({ ...r, fields: { ...r.fields } }));
      return base.map((row) =>
        row.index === index ? { ...row, fields: { ...row.fields, ...patch } } : row
      );
    });
    if (index === 0) {
      const current = rows.find((r) => r.index === index)?.fields ?? {};
      onPrimaryChange({ ...current, ...patch });
    }
  };

  const updateContact = (
    index: number,
    fields: Tab14PatientFields,
    patch: Pick<Tab14PatientFields, 'phoneNumber' | 'homePhone' | 'email'>
  ) => {
    const next = {
      phoneNumber: patch.phoneNumber ?? fields.phoneNumber,
      homePhone: patch.homePhone ?? fields.homePhone,
      email: patch.email ?? fields.email,
    };
    updateOcc(index, {
      ...next,
      communication: rebuildCommunication(next),
    });
  };

  const toggleGroup = (batchIndex: number) => {
    setOpenGroups((prev) => ({ ...prev, [batchIndex]: !prev[batchIndex] }));
  };

  const toggleItem = (index: number, currentlyOpen: boolean) => {
    setOpenMap((prev) => ({ ...prev, [index]: !currentlyOpen }));
  };

  return (
    <div className="epic-demo-intakes">
      <p className="tab14-demo-occurrence-summary" role="status">
        {occurrences.length > 0
          ? `Showing all ${occurrences.length} Patient Demographics results found across this document (same list PDF Find uses), grouped in batches of ${EPIC_DEMOGRAPHICS_BATCH_SIZE} with each intake’s date.`
          : 'Upload an Epic My Health Summary PDF to list every Patient Demographics hit in this document.'}
      </p>

      {batches.map((batch) => {
        const groupOpen = openGroups[batch.batchIndex] ?? batch.batchIndex === 0;
        return (
          <section
            key={`epic-demo-batch-${batch.batchIndex}`}
            className={`epic-demo-batch${groupOpen ? ' epic-demo-batch--open' : ''}`}
          >
            <button
              type="button"
              className="epic-demo-batch__header"
              aria-expanded={groupOpen}
              onClick={() => toggleGroup(batch.batchIndex)}
            >
              <span className="epic-demo-batch__title-block">
                <span className="epic-demo-batch__title">
                  Patient Demographics {batch.startOrdinal}–{batch.endOrdinal}
                </span>
                <span className="epic-demo-batch__meta">
                  {batch.rows.length} intake{batch.rows.length === 1 ? '' : 's'}
                  {batch.dateRangeLabel ? ` · ${batch.dateRangeLabel}` : ''}
                </span>
              </span>
              <span className="epic-demo-batch__chevron" aria-hidden>
                {groupOpen ? '▾' : '▸'}
              </span>
            </button>

            {groupOpen ? (
              <div className="epic-demo-batch__body">
                {batch.rows.map((occ) => {
                  const open = openMap[occ.index] ?? (occ.index === 0 && batch.batchIndex === 0);
                  const fields = occ.fields;
                  const badge = sourceBadge(occ.source);
                  const nameValue =
                    fields.patientFullName ||
                    [fields.givenName, fields.familyName].filter(Boolean).join(' ') ||
                    '';
                  const raceEthnicity = [fields.race, fields.ethnicity]
                    .filter((v) => String(v ?? '').trim())
                    .join(' / ');
                  const sexBorn = formatEpicDemographicsSexBornLine(fields);

                  return (
                    <article
                      key={`epic-demo-${occ.index}`}
                      className={`epic-demo-card${open ? ' epic-demo-card--open' : ''}`}
                    >
                      <button
                        type="button"
                        className="epic-demo-card__header"
                        aria-expanded={open}
                        onClick={() => toggleItem(occ.index, open)}
                      >
                        <span className="epic-demo-card__header-main">
                          <span className="epic-demo-card__ordinal">
                            #{occ.ordinal} of {occ.total}
                          </span>
                          <span className="epic-demo-card__date">
                            {occ.intakeDateLabel || 'Date not on file'}
                          </span>
                          {sexBorn ? (
                            <span className="epic-demo-card__sex-born">{sexBorn}</span>
                          ) : null}
                          <span className="epic-demo-card__kind">
                            {dateKindLabel(occ.intakeDateKind)}
                            {occ.visitType ? ` · ${occ.visitType}` : ''}
                          </span>
                        </span>
                        <span className="epic-demo-card__header-aside">
                          {badge ? (
                            <span className="epic-demo-card__badge">{badge}</span>
                          ) : null}
                          <span className="epic-demo-card__chevron" aria-hidden>
                            {open ? '▾' : '▸'}
                          </span>
                        </span>
                      </button>

                      {open ? (
                        <div className="epic-demo-card__body">
                          <div className="epic-demo-card__sex-born-edit">
                            <div className="epic-demo-card__cell epic-demo-card__cell--inline">
                              <label htmlFor={`epic-demo-sex-${occ.index}`}>Sex</label>
                              <select
                                id={`epic-demo-sex-${occ.index}`}
                                value={fields.sexAtBirth || ''}
                                onChange={(e) =>
                                  updateOcc(occ.index, { sexAtBirth: e.target.value })
                                }
                              >
                                <option value="">Select</option>
                                <option value="Female">Female</option>
                                <option value="Male">Male</option>
                                <option value="Other">Other</option>
                                <option value="Unknown">Unknown</option>
                              </select>
                            </div>
                            <div className="epic-demo-card__cell epic-demo-card__cell--inline">
                              <label htmlFor={`epic-demo-dob-${occ.index}`}>Born</label>
                              <input
                                id={`epic-demo-dob-${occ.index}`}
                                type="date"
                                value={fields.dateOfBirth || ''}
                                onChange={(e) =>
                                  updateOcc(occ.index, { dateOfBirth: e.target.value })
                                }
                              />
                            </div>
                          </div>

                          <div
                            className="epic-demo-card__grid"
                            role="group"
                            aria-label={occ.label}
                          >
                            <div className="epic-demo-card__cell">
                              <label htmlFor={`epic-demo-addr-${occ.index}`}>
                                Patient Address
                              </label>
                              <textarea
                                id={`epic-demo-addr-${occ.index}`}
                                rows={2}
                                value={fields.address || ''}
                                onChange={(e) =>
                                  updateOcc(occ.index, { address: e.target.value })
                                }
                              />
                            </div>

                            <div className="epic-demo-card__cell">
                              <label htmlFor={`epic-demo-name-${occ.index}`}>
                                Patient Name *
                              </label>
                              <input
                                id={`epic-demo-name-${occ.index}`}
                                value={nameValue}
                                onChange={(e) => {
                                  const full = e.target.value;
                                  const parts = full.trim().split(/\s+/);
                                  updateOcc(occ.index, {
                                    patientFullName: full,
                                    givenName:
                                      parts.length > 1 ? parts.slice(0, -1).join(' ') : full,
                                    familyName: parts.length > 1 ? parts[parts.length - 1] : '',
                                  });
                                }}
                              />
                              <label
                                className="epic-demo-card__sublabel"
                                htmlFor={`epic-demo-aliases-${occ.index}`}
                              >
                                Former / Aliases
                              </label>
                              <textarea
                                id={`epic-demo-aliases-${occ.index}`}
                                className="epic-demo-card__aliases"
                                rows={3}
                                placeholder="One alias per line"
                                value={aliasesLines(fields.formerAliases || '')}
                                onChange={(e) =>
                                  updateOcc(occ.index, {
                                    formerAliases: e.target.value
                                      .split(/\n+/)
                                      .map((s) => s.trim())
                                      .filter(Boolean)
                                      .join('; '),
                                  })
                                }
                              />
                            </div>

                            <div className="epic-demo-card__cell epic-demo-card__cell--comm">
                              <span className="epic-demo-card__comm-heading">Communication</span>
                              <label htmlFor={`epic-demo-mobile-${occ.index}`}>Mobile</label>
                              <input
                                id={`epic-demo-mobile-${occ.index}`}
                                value={fields.phoneNumber || ''}
                                onChange={(e) =>
                                  updateContact(occ.index, fields, {
                                    phoneNumber: e.target.value,
                                  })
                                }
                              />
                              <label htmlFor={`epic-demo-home-${occ.index}`}>Home</label>
                              <input
                                id={`epic-demo-home-${occ.index}`}
                                value={fields.homePhone || ''}
                                onChange={(e) =>
                                  updateContact(occ.index, fields, {
                                    homePhone: e.target.value,
                                  })
                                }
                              />
                              <label htmlFor={`epic-demo-email-${occ.index}`}>Email</label>
                              <input
                                id={`epic-demo-email-${occ.index}`}
                                type="email"
                                value={fields.email || ''}
                                onChange={(e) =>
                                  updateContact(occ.index, fields, { email: e.target.value })
                                }
                              />
                            </div>

                            <div className="epic-demo-card__cell">
                              <label htmlFor={`epic-demo-lang-${occ.index}`}>Language</label>
                              <textarea
                                id={`epic-demo-lang-${occ.index}`}
                                rows={2}
                                value={fields.preferredLanguage || ''}
                                onChange={(e) =>
                                  updateOcc(occ.index, { preferredLanguage: e.target.value })
                                }
                              />
                            </div>
                            <div className="epic-demo-card__cell">
                              <label htmlFor={`epic-demo-race-${occ.index}`}>
                                Race / Ethnicity
                              </label>
                              <input
                                id={`epic-demo-race-${occ.index}`}
                                value={raceEthnicity}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const [racePart, ...rest] = raw.split(/\s*\/\s*/);
                                  updateOcc(occ.index, {
                                    race: (racePart || '').trim(),
                                    ethnicity: rest.join(' / ').trim(),
                                  });
                                }}
                              />
                            </div>
                            <div className="epic-demo-card__cell">
                              <label htmlFor={`epic-demo-marital-${occ.index}`}>
                                Marital Status
                              </label>
                              <select
                                id={`epic-demo-marital-${occ.index}`}
                                value={fields.maritalStatus || ''}
                                onChange={(e) =>
                                  updateOcc(occ.index, { maritalStatus: e.target.value })
                                }
                              >
                                <option value="">Select marital status</option>
                                <option value="Single">Single</option>
                                <option value="Married">Married</option>
                                <option value="Never Married">Never Married</option>
                                <option value="Divorced">Divorced</option>
                                <option value="Widowed">Widowed</option>
                                <option value="Separated">Separated</option>
                                <option value="Domestic Partnership">
                                  Domestic Partnership
                                </option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
