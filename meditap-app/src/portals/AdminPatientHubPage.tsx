import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { searchPatientsForAdmin, type PatientApi } from '../api';
import { useAdminPatient } from './AdminPatientContext';
import { formatPatientDisplayName } from './adminPatientStorage';
import './adminOps.css';

const AdminPatientHubPage: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const { selectPatient, selected, clearPatient } = useAdminPatient();
  const [patient, setPatient] = useState<PatientApi | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!patientId) return;
      try {
        const list = await searchPatientsForAdmin(patientId);
        const found =
          list.find((p) => p.patient_id === patientId) ||
          (await searchPatientsForAdmin('')).find((p) => p.patient_id === patientId) ||
          null;
        if (cancelled) return;
        if (!found) {
          setError('Patient not found or not accessible.');
          setPatient(null);
          return;
        }
        setPatient(found);
        selectPatient(found);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load patient.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId, selectPatient]);

  const name = patient ? formatPatientDisplayName(patient) : selected?.displayName || 'Patient';

  const tools = [
    { href: '/app/intake', label: 'Intake / demographics' },
    { href: '/app/labs', label: 'Lab results' },
    { href: '/app/appointments', label: 'Appointments' },
    { href: '/app/insurance', label: 'Insurance' },
    { href: '/app/conditions', label: 'Chronic conditions' },
    { href: '/app/incidents', label: 'Incidents / visits' },
    { href: '/admin-portal/panel', label: 'Epic & facility ops' },
  ];

  return (
    <div className="admin-ops">
      <header className="admin-ops__header">
        <p className="admin-ops__crumb">
          <Link to="/admin-portal/patients">Patients</Link> / Chart
        </p>
        <h1>{name}</h1>
        {patient ? (
          <p>
            DOB {patient.date_of_birth || '—'} · {patient.email || 'no email'} ·{' '}
            {patient.phone || 'no phone'}
          </p>
        ) : null}
        {error ? <p className="admin-ops__error">{error}</p> : null}
        <div className="admin-ops__actions">
          <button type="button" onClick={clearPatient}>
            Clear selection
          </button>
        </div>
      </header>

      <section className="admin-ops__card-grid" aria-label="Chart tools">
        {tools.map((t) => (
          <Link key={t.href} className="admin-ops__card" to={t.href}>
            <strong>{t.label}</strong>
            <span>Opens with this patient selected for on-behalf edits</span>
          </Link>
        ))}
      </section>
    </div>
  );
};

export default AdminPatientHubPage;
