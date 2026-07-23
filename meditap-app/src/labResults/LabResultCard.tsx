import React from 'react';
import type { LabResultLineItem, LabResultRow } from './labResultModel';
import './labResultCards.css';

const ResultDetail: React.FC<{ item: LabResultLineItem }> = ({ item }) => {
  const displayValue =
    item.textValue?.trim() ||
    (item.value != null ? String(item.value) : '');
  return (
  <div className={`result-item ${item.critical ? 'critical' : ''}`}>
    <span className="result-name">{item.name}</span>
    <span className="result-value">
      {displayValue} {item.unit}
      {item.critical && (
        <i
          className="fas fa-exclamation-circle critical-icon"
          title={item.interpretation}
        ></i>
      )}
    </span>
    <span className="result-range">Ref: {item.range || '—'}</span>
  </div>
  );
};

export type LabResultCardProps = {
  result: LabResultRow;
  canManage?: boolean;
  onManage?: () => void;
  /**
   * When true, skip this card's own expand/collapse chrome so a parent
   * (e.g. Tab14 repeater accordion) owns open/close state.
   */
  embedded?: boolean;
};

const LabResultCard: React.FC<LabResultCardProps> = ({
  result,
  canManage = false,
  onManage,
  embedded = false,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const statusClass = result.status.toLowerCase();
  const hasCritical = result.results.some((item) => item.critical);
  const showDetails = embedded || isExpanded;

  const details = (
    <div className="card-details">
      {(result.category ||
        result.impression ||
        result.clinicalIndication ||
        result.notes ||
        result.accessionNumber ||
        result.signedBy) && (
        <div className="lab-card__meta" style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>
          {result.category && (
            <p>
              <strong>Category:</strong> {result.category}
            </p>
          )}
          {result.clinicalIndication && (
            <p>
              <strong>Indication:</strong> {result.clinicalIndication}
            </p>
          )}
          {result.impression && (
            <p>
              <strong>Impression:</strong> {result.impression}
            </p>
          )}
          {result.accessionNumber && (
            <p>
              <strong>Accession:</strong> {result.accessionNumber}
            </p>
          )}
          {result.modality && (
            <p>
              <strong>Modality:</strong> {result.modality}
            </p>
          )}
          {result.signedBy && (
            <p>
              <strong>Signed by:</strong> {result.signedBy}
            </p>
          )}
          {result.notes && (
            <p>
              <strong>Notes:</strong> {result.notes}
            </p>
          )}
        </div>
      )}
      {result.results.length > 0 ? (
        <>
          <h4>Test Components:</h4>
          <div className="details-grid">
            {result.results.map((item, index) => (
              <ResultDetail key={index} item={item} />
            ))}
          </div>
          {hasCritical && (
            <p className="critical-note">
              <i className="fas fa-bell"></i> Consult physician regarding flagged
              results.
            </p>
          )}
        </>
      ) : result.status !== 'Pending' ? (
        <p className="no-data">No component rows for this report.</p>
      ) : null}
    </div>
  );

  return (
    <div
      className={`lab-card${hasCritical ? ' card-critical' : ''}${
        embedded ? ' lab-card--embedded' : ''
      }`}
    >
      {embedded ? (
        <div className="card-summary card-summary--embedded">
          <div className="card-info">
            <p className="test-date">Collected: {result.date || '—'}</p>
          </div>
          <div className="card-actions">
            {result.isNew && <span className="new-badge">New</span>}
            <span className={`status-badge ${statusClass}`}>{result.status}</span>
            {canManage && onManage && (
              <button
                type="button"
                className="lab-card__manage-btn"
                onClick={onManage}
              >
                <i className="fas fa-edit" aria-hidden />
                Manage
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          className="card-summary"
          onClick={() => setIsExpanded(!isExpanded)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsExpanded((v) => !v);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="card-info">
            <h3 className="test-name">
              <i className="fas fa-microscope"></i> {result.testName}
            </h3>
            <p className="test-date">Collected: {result.date}</p>
          </div>

          <div className="card-actions">
            {result.isNew && <span className="new-badge">New</span>}
            <span className={`status-badge ${statusClass}`}>{result.status}</span>
            {canManage && onManage && (
              <button
                type="button"
                className="lab-card__manage-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onManage();
                }}
              >
                <i className="fas fa-edit" aria-hidden />
                Manage
              </button>
            )}
            <i
              className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} expand-icon`}
            ></i>
          </div>
        </div>
      )}

      {showDetails ? details : null}

      {result.status === 'Pending' && (
        <div className="pending-status">
          <i className="fas fa-hourglass-half"></i> Results expected soon. Check
          back later.
        </div>
      )}
    </div>
  );
};

export default LabResultCard;
