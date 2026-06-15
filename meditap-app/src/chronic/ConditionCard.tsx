import React from 'react';
import { useTranslation } from 'react-i18next';
import type {
  Tab5ChronicCondition,
  Tab5ChronicHospitalization,
} from '../api';
import './conditionCards.css';

const HospitalizationRecord: React.FC<{
  record: Tab5ChronicHospitalization;
}> = ({ record }) => {
  const { t } = useTranslation();
  return (
    <div className="hospitalization-record">
      <p>
        <strong>{t('chronic.card.admission')}</strong> {record.admissionDate || '—'} -{' '}
        <strong>{t('chronic.card.discharge')}</strong> {record.dischargeDate || '—'}
      </p>
      <p>
        <strong>{t('chronic.card.reason')}</strong> {record.reason || '—'}
      </p>
      <p>
        <strong>{t('chronic.card.facility')}</strong> {record.facility || '—'} -{' '}
        <strong>{t('chronic.card.physician')}</strong> {record.physician || '—'}
      </p>
    </div>
  );
};

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
  manageLabel,
}) => {
  const { t } = useTranslation();
  const label = manageLabel ?? t('common.manage');

  const action =
    onManage != null ? (
      <button
        type="button"
        className="condition-card__manage"
        onClick={() => onManage(condition)}
      >
        {label}
      </button>
    ) : manageHref ? (
      <a href={manageHref} className="condition-card__manage">
        {label}
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
          {t('chronic.card.diagnosed')} {condition.diagnosisDate || '—'}
        </span>
      </div>

      <div className="condition-details">
        <h4>{t('chronic.card.currentTreatment')}</h4>
        <p>{condition.currentTreatment || '—'}</p>

        {condition.hospitalizations && condition.hospitalizations.length > 0 ? (
          <>
            <h4>
              {t('chronic.card.hospitalizationHistory', {
                count: condition.hospitalizations.length,
              })}
            </h4>
            <div className="hospitalizations-list">
              {condition.hospitalizations.map((record, index) => (
                <HospitalizationRecord key={index} record={record} />
              ))}
            </div>
          </>
        ) : (
          <p className="no-hospitalizations">
            {t('chronic.card.noHospitalizations')}
          </p>
        )}
      </div>

      {action ? <div className="condition-card__footer">{action}</div> : null}
    </div>
  );
};

export default ConditionCard;
