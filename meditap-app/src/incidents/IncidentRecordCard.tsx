import React from 'react';
import type { IncidentRecord } from './incidentModel';
import './incidentCards.css';

export type IncidentRecordCardProps = {
  incident: IncidentRecord;
  onManage?: (incident: IncidentRecord) => void;
};

const IncidentRecordCard: React.FC<IncidentRecordCardProps> = ({
  incident,
  onManage,
}) => {
  const sev = incident.severity.trim().toLowerCase();
  const severityClass =
    sev === 'high' || sev === 'medium' || sev === 'low' ? sev : 'unknown';

  return (
    <div className="incident-card">
      <div className="incident-header">
        <h3 className="incident-type">
          <i className="fas fa-exclamation-triangle"></i> {incident.type}
        </h3>
        <span className={`severity-badge ${severityClass}`}>{incident.severity}</span>
      </div>

      <div className="incident-meta">
        <p>
          <strong>Date:</strong> {incident.date}
        </p>
        <p>
          <strong>Location:</strong> {incident.location}
        </p>
        <p>
          <strong>ID:</strong> {incident.id}
        </p>
      </div>

      <div className="incident-details">
        <h4>Outcome &amp; Treatment:</h4>
        <p className="outcome-text">{incident.outcome}</p>

        <h4>Detailed Summary:</h4>
        <p className="summary-text">{incident.details}</p>
      </div>

      {onManage ? (
        <div className="incident-card__footer">
          <button
            type="button"
            className="incident-card__manage"
            onClick={() => onManage(incident)}
          >
            Manage
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default IncidentRecordCard;
