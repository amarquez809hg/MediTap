import React, { useState } from 'react';
import type { EpicNoteFromClinicOccurrence } from '../intake/epicNoteFromClinic';

export const EPIC_NOTE_FROM_CLINIC_BATCH_SIZE = 10;

type Props = {
  occurrences: EpicNoteFromClinicOccurrence[];
  openMap: Record<number, boolean>;
  setOpenMap: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  setOccurrences: React.Dispatch<React.SetStateAction<EpicNoteFromClinicOccurrence[]>>;
  onOccurrencesChange?: (next: EpicNoteFromClinicOccurrence[]) => void;
};

function sourceBadge(source: EpicNoteFromClinicOccurrence['source']): string | null {
  if (source === 'inferredReprint') return 'Visit reprint';
  if (source === 'cover') return 'Cover';
  if (source === 'header') return 'Header';
  return null;
}

function dateKindLabel(kind: EpicNoteFromClinicOccurrence['intakeDateKind']): string {
  if (kind === 'generated') return 'Document generated';
  if (kind === 'encounter') return 'Encounter date';
  return 'Date unknown';
}

type Batch = {
  batchIndex: number;
  startOrdinal: number;
  endOrdinal: number;
  rows: EpicNoteFromClinicOccurrence[];
  dateRangeLabel: string;
};

function buildBatches(rows: EpicNoteFromClinicOccurrence[]): Batch[] {
  const batches: Batch[] = [];
  for (let i = 0; i < rows.length; i += EPIC_NOTE_FROM_CLINIC_BATCH_SIZE) {
    const slice = rows.slice(i, i + EPIC_NOTE_FROM_CLINIC_BATCH_SIZE);
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
 * Epic “Note from Mayo Clinic” intake: batches of 10 Find hits with intake dates.
 */
export function EpicNoteFromClinicOccurrencesPanel({
  occurrences,
  openMap,
  setOpenMap,
  setOccurrences,
  onOccurrencesChange,
}: Props) {
  const rows = occurrences;
  const batches = buildBatches(rows);
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({ 0: true });

  const updateOcc = (
    index: number,
    patch: Partial<EpicNoteFromClinicOccurrence['fields']>
  ) => {
    setOccurrences((prev) => {
      const next = prev.map((row) =>
        row.index === index ? { ...row, fields: { ...row.fields, ...patch } } : row
      );
      onOccurrencesChange?.(next);
      return next;
    });
  };

  if (rows.length === 0) {
    return (
      <p className="tab14-demo-occurrence-summary" role="status">
        Upload an Epic My Health Summary PDF to list every Note from Clinic hit in this
        document.
      </p>
    );
  }

  const clinicLabel = rows[0]?.fields.clinicName || 'Clinic';

  return (
    <div className="epic-demo-intakes">
      <p className="tab14-demo-occurrence-summary" role="status">
        Showing all {rows.length} Note from {clinicLabel} results found across this document
        (same list PDF Find uses), grouped in batches of {EPIC_NOTE_FROM_CLINIC_BATCH_SIZE}{' '}
        with each intake’s date.
      </p>

      {batches.map((batch) => {
        const groupOpen = openGroups[batch.batchIndex] ?? batch.batchIndex === 0;
        return (
          <section
            key={`epic-note-batch-${batch.batchIndex}`}
            className={`epic-demo-batch${groupOpen ? ' epic-demo-batch--open' : ''}`}
          >
            <button
              type="button"
              className="epic-demo-batch__header"
              aria-expanded={groupOpen}
              onClick={() =>
                setOpenGroups((prev) => ({
                  ...prev,
                  [batch.batchIndex]: !prev[batch.batchIndex],
                }))
              }
            >
              <span className="epic-demo-batch__title-block">
                <span className="epic-demo-batch__title">
                  Note from {clinicLabel} {batch.startOrdinal}–{batch.endOrdinal}
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
                  const open =
                    openMap[occ.index] ?? (occ.index === 0 && batch.batchIndex === 0);
                  const badge = sourceBadge(occ.source);

                  return (
                    <article
                      key={`epic-note-${occ.index}`}
                      className={`epic-demo-card${open ? ' epic-demo-card--open' : ''}`}
                    >
                      <button
                        type="button"
                        className="epic-demo-card__header"
                        aria-expanded={open}
                        onClick={() =>
                          setOpenMap((prev) => ({
                            ...prev,
                            [occ.index]: !open,
                          }))
                        }
                      >
                        <span className="epic-demo-card__header-main">
                          <span className="epic-demo-card__ordinal">
                            #{occ.ordinal} of {occ.total}
                          </span>
                          <span className="epic-demo-card__date">
                            {occ.intakeDateLabel || 'Date not on file'}
                          </span>
                          <span className="epic-demo-card__sex-born">
                            Note from {occ.fields.clinicName || clinicLabel}
                          </span>
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
                          <div className="epic-demo-card__grid epic-note-card__grid">
                            <div className="epic-demo-card__cell">
                              <label htmlFor={`epic-note-clinic-${occ.index}`}>
                                Clinic
                              </label>
                              <input
                                id={`epic-note-clinic-${occ.index}`}
                                value={occ.fields.clinicName || ''}
                                onChange={(e) =>
                                  updateOcc(occ.index, { clinicName: e.target.value })
                                }
                              />
                            </div>
                            <div className="epic-demo-card__cell">
                              <label htmlFor={`epic-note-shared-${occ.index}`}>
                                Shared with
                              </label>
                              <input
                                id={`epic-note-shared-${occ.index}`}
                                value={occ.fields.sharedWith || ''}
                                onChange={(e) =>
                                  updateOcc(occ.index, { sharedWith: e.target.value })
                                }
                              />
                            </div>
                            <div className="epic-demo-card__cell">
                              <label htmlFor={`epic-note-date-${occ.index}`}>
                                Intake date
                              </label>
                              <input
                                id={`epic-note-date-${occ.index}`}
                                value={occ.intakeDateLabel || ''}
                                readOnly
                              />
                            </div>
                            <div className="epic-demo-card__cell epic-note-card__body-cell">
                              <label htmlFor={`epic-note-body-${occ.index}`}>Note</label>
                              <textarea
                                id={`epic-note-body-${occ.index}`}
                                rows={4}
                                value={occ.fields.body || ''}
                                onChange={(e) =>
                                  updateOcc(occ.index, { body: e.target.value })
                                }
                              />
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
