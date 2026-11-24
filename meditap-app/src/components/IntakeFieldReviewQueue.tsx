import React from 'react';
import type { IntakeReviewQueueItem } from '../intake/intakeFieldReview';

type Props = {
  items: IntakeReviewQueueItem[];
  onAccept: (item: IntakeReviewQueueItem) => void;
  onReject: (item: IntakeReviewQueueItem) => void;
  onAcceptAll: () => void;
  onJump: (item: IntakeReviewQueueItem) => void;
};

/**
 * Staff worklist for PDF/OCR flagged fields — Accept / Reject / Jump in one place.
 */
const IntakeFieldReviewQueue: React.FC<Props> = ({
  items,
  onAccept,
  onReject,
  onAcceptAll,
  onJump,
}) => {
  if (items.length === 0) return null;

  return (
    <section
      className="tab14-intake-review-queue"
      aria-label="Intake field review queue"
    >
      <header className="tab14-intake-review-queue__header">
        <div>
          <p className="tab14-intake-review-queue__eyebrow">Staff review queue</p>
          <h3 className="tab14-intake-review-queue__title">
            {items.length} flagged field{items.length === 1 ? '' : 's'}
          </h3>
          <p className="tab14-intake-review-queue__hint">
            Accept keeps the imported value. Reject clears it. Jump opens the
            section so you can compare against the source PDF.
          </p>
        </div>
        <button
          type="button"
          className="tab14-pdf-review-btn tab14-pdf-review-btn--accept"
          onClick={onAcceptAll}
        >
          Accept all
        </button>
      </header>

      <ol className="tab14-intake-review-queue__list">
        {items.map((item) => (
          <li key={item.id} className="tab14-intake-review-queue__item">
            <div className="tab14-intake-review-queue__meta">
              <span className="tab14-intake-review-queue__section">
                {item.sectionLabel}
                {item.kind !== 'patient' && item.kind !== 'hospital'
                  ? ` · row ${item.index + 1}`
                  : ''}
              </span>
              <strong className="tab14-intake-review-queue__field">
                {item.fieldLabel}
              </strong>
              {item.currentValue ? (
                <code className="tab14-intake-review-queue__value">
                  {item.currentValue}
                </code>
              ) : null}
              <span className="tab14-intake-review-queue__message">{item.message}</span>
              <span className="tab14-intake-review-queue__chips">
                <span
                  className={`tab14-intake-review-queue__confidence tab14-intake-review-queue__confidence--${item.confidence}`}
                >
                  {item.confidence} confidence
                </span>
                {item.reason ? (
                  <span className="tab14-intake-review-queue__reason">{item.reason}</span>
                ) : null}
              </span>
            </div>
            <div className="tab14-intake-review-queue__actions">
              <button
                type="button"
                className="tab14-pdf-review-btn"
                onClick={() => onJump(item)}
              >
                Jump
              </button>
              <button
                type="button"
                className="tab14-pdf-review-btn tab14-pdf-review-btn--accept"
                onClick={() => onAccept(item)}
              >
                Accept
              </button>
              <button
                type="button"
                className="tab14-pdf-review-btn tab14-pdf-review-btn--reject"
                onClick={() => onReject(item)}
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default IntakeFieldReviewQueue;
