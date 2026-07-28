import React from 'react';
import { Link } from 'react-router-dom';
import { useAdminPatient } from './AdminPatientContext';
import './portalShell.css';

type AdminPortalLayoutProps = {
  children: React.ReactNode;
};

/**
 * Staff / org-admin shell chrome.
 */
const AdminPortalLayout: React.FC<AdminPortalLayoutProps> = ({ children }) => {
  const { selected, clearPatient } = useAdminPatient();

  return (
    <div className="portal-shell portal-shell--admin" data-portal="admin">
      <header className="portal-shell__chrome" aria-label="Admin portal">
        <div className="portal-shell__brand">
          <span className="portal-shell__product">MediTap</span>
          <span className="portal-shell__label">Admin portal</span>
          {selected ? (
            <span className="portal-shell__patient-chip">
              <Link to={`/admin-portal/patients/${selected.patientId}`}>
                {selected.displayName}
              </Link>
              <button type="button" onClick={clearPatient} aria-label="Clear selected patient">
                ×
              </button>
            </span>
          ) : null}
        </div>
        <nav className="portal-shell__nav" aria-label="Admin sections">
          <a href="/admin-portal/home">Home</a>
          <a href="/admin-portal/patients">Patients</a>
          <a href="/admin-portal/hospitals">Hospitals</a>
          <a href="/admin-portal/activity">Activity</a>
          <a href="/admin-portal/panel">Panel</a>
          <a href="/app/dashboard">Patient view</a>
        </nav>
      </header>
      <div className="portal-shell__body">{children}</div>
    </div>
  );
};

export default AdminPortalLayout;
