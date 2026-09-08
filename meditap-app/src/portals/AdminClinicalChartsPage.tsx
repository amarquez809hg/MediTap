import React, { useEffect, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { searchPatientsForAdmin, type PatientApi } from '../api';
import GoBackButton from '../components/GoBackButton';
import { useAdminPatient } from './AdminPatientContext';
import { formatPatientDisplayName } from './adminPatientStorage';
import { ADMIN_PORTAL_HOME } from './portalPaths';
import { ADMIN_PATIENT_VIEW_PATHS } from './adminPatientViewPaths';
import './adminDashboard.css';
import './adminOps.css';

const CHART_SECTIONS = [
  {
    href: ADMIN_PATIENT_VIEW_PATHS.intake,
    label: 'Intake / demographics',
    desc: 'Names, contact, vitals, allergies, medications',
    icon: 'fa-id-card',
    tone: 'blue',
  },
  {
    href: ADMIN_PATIENT_VIEW_PATHS.labs,
    label: 'Lab results',
    desc: 'Panels and component values',
    icon: 'fa-flask',
    tone: 'violet',
  },
  {
    href: ADMIN_PATIENT_VIEW_PATHS.appointments,
    label: 'Appointments',
    desc: 'Upcoming and past visits',
    icon: 'fa-calendar-check',
    tone: 'teal',
  },
  {
    href: ADMIN_PATIENT_VIEW_PATHS.insurance,
    label: 'Insurance',
    desc: 'Coverage and payer details',
    icon: 'fa-file-medical',
    tone: 'orange',
  },
  {
    href: ADMIN_PATIENT_VIEW_PATHS.conditions,
    label: 'Chronic conditions',
    desc: 'Ongoing diagnoses',
    icon: 'fa-heartbeat',
    tone: 'green',
  },
  {
    href: ADMIN_PATIENT_VIEW_PATHS.incidents,
    label: 'Incidents / visits',
    desc: 'Hospital and urgent visits',
    icon: 'fa-ambulance',
    tone: 'blue',
  },
] as const;

/**
 * Clinical charts entry — admin profile overview before opening patient UI tabs.
 * Avoids dumping staff straight into intake.
 */
const AdminClinicalChartsPage: React.FC = () => {
  const history = useHistory();
  const { selected, selectPatient, clearPatient } = useAdminPatient();
  const [patient, setPatient] = useState<PatientApi | null>(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<PatientApi[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!selected?.patientId) {
        setPatient(null);
        return;
      }
      try {
        const list = await searchPatientsForAdmin(selected.patientId);
        const found =
          list.find((p) => p.patient_id === selected.patientId) ||
          (await searchPatientsForAdmin('')).find(
            (p) => p.patient_id === selected.patientId
          ) ||
          null;
        if (!cancelled) setPatient(found);
      } catch {
        if (!cancelled) setPatient(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected?.patientId]);

  const runSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setResults(await searchPatientsForAdmin(q.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not search patients.');
      setResults([]);
    } finally {
      setBusy(false);
    }
  };

  const choosePatient = (p: PatientApi) => {
    selectPatient(p);
    setPatient(p);
    setResults([]);
    setQ('');
  };

  const openHub = () => {
    if (!selected?.patientId) return;
    history.push(`/admin-portal/patients/${selected.patientId}`);
  };

  const displayName = patient
    ? formatPatientDisplayName(patient)
    : selected?.displayName || 'Patient';

  return (
    <div className="admin-home admin-charts">
      <header className="admin-home__hero">
        <div>
          <p className="admin-charts__crumb">
            <Link to={ADMIN_PORTAL_HOME}>Dashboard</Link> / Clinical charts
          </p>
          <h1>Clinical charts</h1>
          <p>
            Review the patient profile here first, then open a chart section. This keeps staff
            work inside the admin portal until you choose a tool.
          </p>
        </div>
        <div className="admin-charts__hero-actions">
          <GoBackButton fallback={ADMIN_PORTAL_HOME} variant="plain" />
        </div>
      </header>

      {!selected ? (
        <section className="admin-home__panel admin-charts__picker" aria-label="Select patient">
          <div className="admin-home__panel-head">
            <h2>Select a patient</h2>
          </div>
          <p className="admin-home__muted">
            Choose whose chart you want to review before opening intake or other clinical tools.
          </p>
          <form className="admin-ops__search admin-charts__search" onSubmit={runSearch}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, email, phone, or patient id"
              aria-label="Search patients for clinical charts"
            />
            <button type="submit" disabled={busy}>
              {busy ? 'Searching…' : 'Search'}
            </button>
          </form>
          {error ? <p className="admin-ops__error">{error}</p> : null}
          {results.length > 0 ? (
            <ul className="admin-home__queue">
              {results.slice(0, 12).map((p) => (
                <li key={p.patient_id}>
                  <div>
                    <strong>{formatPatientDisplayName(p)}</strong>
                    <span>
                      {[p.date_of_birth, p.email, p.phone].filter(Boolean).join(' · ') ||
                        'No contact on file'}
                    </span>
                  </div>
                  <button type="button" onClick={() => choosePatient(p)}>
                    Select
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="admin-home__empty" style={{ paddingTop: '1.5rem' }}>
              <i className="fas fa-user-injured" aria-hidden />
              <p>
                Search above, or open{' '}
                <Link to="/admin-portal/patients">Patients</Link> to browse the directory.
              </p>
            </div>
          )}
        </section>
      ) : (
        <div className="admin-charts__layout">
          <section className="admin-home__panel admin-charts__profile" aria-label="Patient profile">
            <div className="admin-home__panel-head">
              <h2>Patient profile</h2>
              <button type="button" className="admin-home__text-btn" onClick={clearPatient}>
                Change patient
              </button>
            </div>

            <div className="admin-charts__identity">
              <span className="admin-charts__avatar" aria-hidden>
                {(displayName.replace(/[^A-Za-z]/g, ' ').trim().split(/\s+/)[0]?.[0] || 'P') +
                  (displayName.replace(/[^A-Za-z]/g, ' ').trim().split(/\s+/)[1]?.[0] || '')}
              </span>
              <div>
                <strong>{displayName}</strong>
                <span>
                  MRN · {selected.patientId.slice(0, 8).toUpperCase()}
                  {patient?.email ? ` · ${patient.email}` : ''}
                </span>
              </div>
            </div>

            <dl className="admin-home__patient-dl">
              <div>
                <dt>Date of birth</dt>
                <dd>{patient?.date_of_birth || '—'}</dd>
              </div>
              <div>
                <dt>Sex at birth</dt>
                <dd>{patient?.sex_at_birth || '—'}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{patient?.phone || '—'}</dd>
              </div>
              <div>
                <dt>Preferred language</dt>
                <dd>{patient?.preferred_language || '—'}</dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>{patient?.address || '—'}</dd>
              </div>
              <div>
                <dt>Blood type</dt>
                <dd>{patient?.blood_type || '—'}</dd>
              </div>
            </dl>

            <div className="admin-charts__profile-actions">
              <button type="button" className="admin-home__primary-btn" onClick={openHub}>
                Open full patient hub
                <i className="fas fa-arrow-right" aria-hidden />
              </button>
              <Link className="admin-home__ghost-btn" to={ADMIN_PATIENT_VIEW_PATHS.intake}>
                Open intake form
              </Link>
              <Link className="admin-home__ghost-btn" to={ADMIN_PATIENT_VIEW_PATHS.dashboard}>
                Open patient dashboard
              </Link>
            </div>
          </section>

          <section className="admin-home__panel" aria-label="Chart sections">
            <div className="admin-home__panel-head">
              <h2>Open a chart section</h2>
            </div>
            <p className="admin-home__muted" style={{ marginBottom: '0.85rem' }}>
              These open the clinical editors with this patient selected for on-behalf work.
            </p>
            <div className="admin-home__quick-grid">
              {CHART_SECTIONS.map((section) => (
                <Link
                  key={section.href}
                  to={section.href}
                  className={`admin-home__quick admin-home__quick--${section.tone}`}
                >
                  <span className="admin-home__quick-icon" aria-hidden>
                    <i className={`fas ${section.icon}`} />
                  </span>
                  <strong>{section.label}</strong>
                  <span>{section.desc}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default AdminClinicalChartsPage;
