import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { searchPatientsForAdmin, type PatientApi } from '../api';
import { useAdminPatient } from './AdminPatientContext';
import { formatPatientDisplayName } from './adminPatientStorage';
import './adminOps.css';

function isIncomplete(p: PatientApi): boolean {
  const missingName = !(p.given_name || '').trim() || !(p.family_name || '').trim();
  const missingDob = !(p.date_of_birth || '').trim();
  return missingName || missingDob;
}

/**
 * Admin portal landing — ops console with patient context and work-queue heuristics.
 */
const AdminPortalHome: React.FC = () => {
  const { username, portalRole } = useAuth();
  const { selected, clearPatient } = useAdminPatient();
  const [queue, setQueue] = useState<PatientApi[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const all = await searchPatientsForAdmin('');
        if (!cancelled) setQueue(all.filter(isIncomplete).slice(0, 8));
      } catch {
        if (!cancelled) setQueue([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="admin-home-console">
      <h1>Admin home</h1>
      <p className="admin-home-console__lead">
        Signed in as <strong>{username || 'staff'}</strong> ({portalRole}). Select a patient to
        review and edit charts on behalf of care without using the patient login.
      </p>

      {selected ? (
        <div className="admin-home-console__chip">
          Active patient: <strong>{selected.displayName}</strong>
          <Link to={`/admin-portal/patients/${selected.patientId}`}>Open hub</Link>
          <button type="button" onClick={clearPatient}>
            Clear
          </button>
        </div>
      ) : null}

      <div className="admin-home-console__grid">
        <Link to="/admin-portal/patients">
          <strong>Patients</strong>
          <span>Search and open charts</span>
        </Link>
        <Link to="/admin-portal/hospitals">
          <strong>Hospitals</strong>
          <span>List and create facilities</span>
        </Link>
        <Link to="/admin-portal/activity">
          <strong>Activity</strong>
          <span>Staff action trail</span>
        </Link>
        <Link to="/admin-portal/panel">
          <strong>Admin panel</strong>
          <span>Epic, shortcuts, facility ops</span>
        </Link>
        <Link to="/app/dashboard">
          <strong>Patient view</strong>
          <span>Open user portal shell</span>
        </Link>
      </div>

      <section className="admin-home-console__queue" aria-label="Work queue">
        <h2>Needs attention</h2>
        {queue.length === 0 ? (
          <p className="admin-home-console__lead">No incomplete charts in the current sample.</p>
        ) : (
          <div className="admin-ops__table-wrap">
            <table className="admin-ops__table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Issue</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {queue.map((p) => (
                  <tr key={p.patient_id}>
                    <td>{formatPatientDisplayName(p)}</td>
                    <td>
                      {!(p.given_name || '').trim() || !(p.family_name || '').trim()
                        ? 'Missing name'
                        : 'Missing DOB'}
                    </td>
                    <td>
                      <Link to={`/admin-portal/patients/${p.patient_id}`}>Open</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminPortalHome;
