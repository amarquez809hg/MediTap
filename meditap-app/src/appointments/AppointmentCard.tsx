import React from 'react';
import type { Appointment } from './appointmentStorage';
import './appointmentCards.css';

export type AppointmentCardProps = {
  appt: Appointment;
  /** Full tab: opens manage modal */
  onManage?: (appt: Appointment) => void;
  /** Dashboard: same card, link to appointments tab instead of modal */
  manageHref?: string;
  manageLabel?: string;
};

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appt,
  onManage,
  manageHref,
  manageLabel = 'Manage',
}) => {
  const statusClass = appt.status.toLowerCase();

  const action =
    onManage != null ? (
      <button
        type="button"
        className="manage-btn"
        onClick={() => onManage(appt)}
      >
        {manageLabel}
      </button>
    ) : manageHref ? (
      <a href={manageHref} className="manage-btn">
        {manageLabel}
      </a>
    ) : null;

  return (
    <div className="appointment-card">
      <div className="card-header">
        <span className={`status-badge ${statusClass}`}>{appt.status}</span>
        <span className="type-badge">{appt.type}</span>
      </div>

      <div className="card-body">
        <h3 className="specialist-name">
          <i className="fas fa-user-md"></i> {appt.specialist}
        </h3>
        <p className="department">{appt.department}</p>
      </div>

      <div className="card-footer">
        <div className="time-info">
          <i className="fas fa-clock"></i> {appt.time}
        </div>
        <div className="date-info">
          <i className="fas fa-calendar-alt"></i> {appt.date}
        </div>
        {action}
      </div>
    </div>
  );
};

export default AppointmentCard;
