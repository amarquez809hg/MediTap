import React, { useState } from 'react';
import {
  EPIC_SECTION_OCCURRENCE_BATCH_SIZE,
  epicSectionOccurrenceDateKindLabel,
  epicSectionOccurrenceSourceBadge,
  type EpicSectionOccurrence,
} from '../intake/epicSectionOccurrences';

type Props = {
  sectionTitle: string;
  occurrences: EpicSectionOccurrence[];
  openMap: Record<number, boolean>;
  setOpenMap: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
};

type Batch = {
  batchIndex: number;
  startOrdinal: number;
  endOrdinal: number;
  rows: EpicSectionOccurrence[];
  dateRangeLabel: string;
};

function buildBatches(rows: EpicSectionOccurrence[]): Batch[] {
  const batches: Batch[] = [];
  for (let i = 0; i < rows.length; i += EPIC_SECTION_OCCURRENCE_BATCH_SIZE) {
    const slice = rows.slice(i, i + EPIC_SECTION_OCCURRENCE_BATCH_SIZE);
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
 * Shared Epic multi-hit UI: batches of 10 dated intakes (Demographics / Note pattern).
 */
export function EpicSectionOccurrencesPanel({
  sectionTitle,
  occurrences,
  openMap,
  setOpenMap,
}: Props) {
  const rows = occurrences;
  const batches = buildBatches(rows);
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({ 0: true });

  if (rows.length === 0) {
    return (
      <p className="tab14-demo-occurrence-summary" role="status">
        Upload an Epic My Health Summary PDF to list every {sectionTitle} hit in this document.
      </p>
    );
  }

  return (
    <div className="epic-demo-intakes">
      <p className="tab14-demo-occurrence-summary" role="status">
        Showing all {rows.length} {sectionTitle} results found across this document (same list PDF
        Find uses), grouped in batches of {EPIC_SECTION_OCCURRENCE_BATCH_SIZE} with each intake’s
        date.
      </p>

      {batches.map((batch) => {
        const groupOpen = openGroups[batch.batchIndex] ?? batch.batchIndex === 0;
        return (
          <section
            key={`epic-sec-batch-${sectionTitle}-${batch.batchIndex}`}
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
                  {sectionTitle} {batch.startOrdinal}–{batch.endOrdinal}
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
                  const badge = epicSectionOccurrenceSourceBadge(occ.source);

                  return (
                    <article
                      key={`epic-sec-${sectionTitle}-${occ.index}`}
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
                          {occ.previewLines[0] ? (
                            <span className="epic-demo-card__sex-born">
                              {occ.previewLines[0]}
                              {occ.previewLines.length > 1
                                ? ` · +${occ.previewLines.length - 1} more`
                                : ''}
                            </span>
                          ) : null}
                          <span className="epic-demo-card__kind">
                            {epicSectionOccurrenceDateKindLabel(occ.intakeDateKind)}
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
                          {occ.previewLines.length > 0 ? (
                            <ul className="epic-section-preview-list">
                              {occ.previewLines.map((line, i) => (
                                <li key={`${occ.index}-pv-${i}`}>{line}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="tab14-panel-sub" style={{ marginTop: 0 }}>
                              No structured rows parsed for this intake — showing document text.
                            </p>
                          )}
                          <div className="epic-demo-card__cell epic-note-card__body-cell">
                            <label htmlFor={`epic-sec-body-${sectionTitle}-${occ.index}`}>
                              Section text
                            </label>
                            <textarea
                              id={`epic-sec-body-${sectionTitle}-${occ.index}`}
                              rows={6}
                              readOnly
                              value={occ.body.slice(0, 4000)}
                            />
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
