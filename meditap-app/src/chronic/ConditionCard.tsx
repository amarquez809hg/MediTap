import React from 'react';
import type {
  Tab5ChronicCondition,
  Tab5ChronicHospitalization,
} from '../api';
import './conditionCards.css';

const HospitalizationRecord: React.FC<{
  record: Tab5ChronicHospitalization;
}> = ({ record }) => (
  <div className="hospitalization-record">
    <p>
      <strong>Admission:</strong> {record.admissionDate || '—'} -{' '}
      <strong>Discharge:</strong> {record.dischargeDate || '—'}
    </p>
    <p>
      <strong>Reason:</strong> {record.reason || '—'}
    </p>
    <p>
      <strong>Facility:</strong> {record.facility || '—'} -{' '}
      <strong>Physician:</strong> {record.physician || '—'}
    </p>
  </div>
);

export type ConditionCardProps = {
  condition: Tab5ChronicCondition;
  onManage?: (c: Tab5ChronicCondition) => void;
  manageHref?: string;
  manageLabel?: string;
};

const ConditionCard: React.FC<ConditionCardProps> = ({
  condition,
  onManage,
  manageHref,
  manageLabel = 'Manage',
}) => {
  const action =
    onManage != null ? (
      <button
        type="button"
        className="condition-card__manage"
        onClick={() => onManage(condition)}
      >
        {manageLabel}
      </button>
    ) : manageHref ? (
      <a href={manageHref} className="condition-card__manage">
        {manageLabel}
      </a>
    ) : null;

  return (
    <div className="condition-card">
      <div className="condition-header">
        <h3 className="condition-name">
          <i className="fas fa-heartbeat" aria-hidden />{' '}
          {condition.name || '—'}
        </h3>
        <span className="diagnosis-date">
          Diagnosed: {condition.diagnosisDate || '—'}
        </span>
      </div>

      <div className="condition-details">
        <h4>Current Treatment:</h4>
        <p>{condition.currentTreatment || '—'}</p>

        {condition.hospitalizations && condition.hospitalizations.length > 0 ? (
          <>
            <h4>
              Hospitalization History ({condition.hospitalizations.length}{' '}
              times):
            </h4>
            <div className="hospitalizations-list">
              {condition.hospitalizations.map((record, index) => (
                <HospitalizationRecord key={index} record={record} />
              ))}
            </div>
          </>
        ) : (
          <p className="no-hospitalizations">
            No related hospitalizations recorded.
          </p>
        )}
      </div>

      {action ? <div className="condition-card__footer">{action}</div> : null}
    </div>
  );
};

export default ConditionCard;
