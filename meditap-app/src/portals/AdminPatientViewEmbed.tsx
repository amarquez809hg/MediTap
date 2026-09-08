import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAdminPatient } from './AdminPatientContext';
import { ADMIN_PORTAL_HOME } from './portalPaths';
import {
  ADMIN_PATIENT_VIEW_BASE,
  ADMIN_PATIENT_VIEW_PATHS,
} from './adminPatientViewPaths';
import PortalNavLink from '../components/PortalNavLink';
import { navigatePortal } from '../navigation/portalGoBack';
import './adminPatientEmbed.css';

type AdminPatientViewEmbedProps = {
  children: React.ReactNode;
  /** When true, require a selected patient before showing children. */
  requirePatient?: boolean;
};

const SUBNAV: { to: string; label: string }[] = [
  { to: ADMIN_PATIENT_VIEW_PATHS.dashboard, label: 'Dashboard' },
  { to: ADMIN_PATIENT_VIEW_PATHS.status, label: 'Quick status' },
  { to: ADMIN_PATIENT_VIEW_PATHS.intake, label: 'Intake' },
  { to: ADMIN_PATIENT_VIEW_PATHS.appointments, label: 'Appointments' },
  { to: ADMIN_PATIENT_VIEW_PATHS.labs, label: 'Labs' },
  { to: ADMIN_PATIENT_VIEW_PATHS.insurance, label: 'Insurance' },
  { to: ADMIN_PATIENT_VIEW_PATHS.conditions, label: 'Conditions' },
  { to: ADMIN_PATIENT_VIEW_PATHS.incidents, label: 'Incidents' },
];

/**
 * Renders patient portal pages inside the admin shell content zone
 * (sidebar + top bar stay visible).
 */
const AdminPatientViewEmbed: React.FC<AdminPatientViewEmbedProps> = ({
  children,
  requirePatient = true,
}) => {
  const { selected, clearPatient } = useAdminPatient();
  const location = useLocation();

  if (requirePatient && !selected) {
    return (
      <div className="admin-patient-embed admin-patient-embed--empty">
        <div className="admin-patient-embed__empty-card">
          <i className="fas fa-user-injured" aria-hidden />
          <h1>Select a patient first</h1>
          <p>
            Patient views open in this admin workspace. Choose a chart from Patients
            or Clinical charts, then return here.
          </p>
          <div className="admin-patient-embed__empty-actions">
            <button
              type="button"
              className="admin-patient-embed__primary"
              onClick={() => navigatePortal('/admin-portal/charts')}
            >
              Clinical charts
            </button>
            <button
              type="button"
              className="admin-patient-embed__secondary"
              onClick={() => navigatePortal('/admin-portal/patients')}
            >
              Patients
            </button>
            <a
              href={ADMIN_PORTAL_HOME}
              onClick={(e) => {
                e.preventDefault();
                navigatePortal(ADMIN_PORTAL_HOME);
              }}
            >
              Back to dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-patient-embed" data-admin-embed="patient-view">
      <div className="admin-patient-embed__banner">
        <div className="admin-patient-embed__banner-text">
          <span className="admin-patient-embed__eyebrow">On-behalf patient view</span>
          <strong>{selected?.displayName || 'Patient'}</strong>
          <span>
            Shown inside the admin portal — sidebar stays available.
          </span>
        </div>
        <div className="admin-patient-embed__banner-actions">
          <Link to="/admin-portal/charts">Profile</Link>
          {selected ? (
            <Link to={`/admin-portal/patients/${selected.patientId}`}>Hub</Link>
          ) : null}
          <button type="button" onClick={clearPatient}>
            Clear
          </button>
        </div>
      </div>

      <nav className="admin-patient-embed__subnav" aria-label="Patient chart sections">
        {SUBNAV.map((item) => {
          const active =
            item.to === ADMIN_PATIENT_VIEW_BASE
              ? location.pathname === ADMIN_PATIENT_VIEW_BASE ||
                location.pathname === `${ADMIN_PATIENT_VIEW_BASE}/`
              : location.pathname === item.to ||
                location.pathname.startsWith(`${item.to}/`);
          return (
            <PortalNavLink
              key={item.to}
              to={item.to}
              className={active ? 'is-active' : undefined}
            >
              {item.label}
            </PortalNavLink>
          );
        })}
      </nav>

      <div className="admin-patient-embed__viewport">{children}</div>
    </div>
  );
};

export default AdminPatientViewEmbed;
