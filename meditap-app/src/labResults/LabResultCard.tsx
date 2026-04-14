import React from 'react';
import type { LabResultLineItem, LabResultRow } from './labResultModel';
import './labResultCards.css';

const ResultDetail: React.FC<{ item: LabResultLineItem }> = ({ item }) => (
  <div className={`result-item ${item.critical ? 'critical' : ''}`}>
    <span className="result-name">{item.name}</span>
    <span className="result-value">
      {item.value} {item.unit}
      {item.critical && (
        <i
          className="fas fa-exclamation-circle critical-icon"
          title={item.interpretation}
        ></i>
      )}
    </span>
    <span className="result-range">Ref: {item.range}</span>
  </div>
);

export type LabResultCardProps = {
  result: LabResultRow;
  canManage?: boolean;
  onManage?: () => void;
};

const LabResultCard: React.FC<LabResultCardProps> = ({
  result,
  canManage = false,
  onManage,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const statusClass = result.status.toLowerCase();
  const hasCritical = result.results.some((item) => item.critical);

  return (
    <div className={`lab-card ${hasCritical ? 'card-critical' : ''}`}>
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

      {isExpanded && result.results.length > 0 && (
        <div className="card-details">
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
        </div>
      )}

      {isExpanded && result.results.length === 0 && result.status !== 'Pending' && (
        <div className="card-details">
          <p className="no-data">No results data available for this report.</p>
        </div>
      )}

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
