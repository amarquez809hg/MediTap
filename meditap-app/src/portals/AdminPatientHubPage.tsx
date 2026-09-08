import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  applyPatientDocumentDemographics,
  fetchPatientDocumentBlobUrl,
  listPatientDocuments,
  searchPatientsForAdmin,
  updatePatientDocumentStatus,
  type PatientApi,
  type PatientDocumentApi,
} from '../api';
import { matchParsedIdentityToChart } from '../intake/intakeFieldReview';
import GoBackButton from '../components/GoBackButton';
import { useAdminPatient } from './AdminPatientContext';
import { formatPatientDisplayName } from './adminPatientStorage';
import { ADMIN_PORTAL_HOME } from './portalPaths';
import { ADMIN_PATIENT_VIEW_PATHS } from './adminPatientViewPaths';
import './adminOps.css';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'pending_review', label: 'Pending review' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'applied', label: 'Applied to chart' },
  { value: 'rejected', label: 'Rejected' },
];

const AdminPatientHubPage: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const { selectPatient, selected, clearPatient } = useAdminPatient();
  const [patient, setPatient] = useState<PatientApi | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<PatientDocumentApi[]>([]);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [docsLoading, setDocsLoading] = useState(false);

  const loadDocuments = useCallback(async (id: string) => {
    setDocsLoading(true);
    setDocsError(null);
    try {
      const rows = await listPatientDocuments(id);
      setDocuments(rows);
    } catch (e) {
      setDocsError(e instanceof Error ? e.message : 'Could not load documents.');
      setDocuments([]);
    } finally {
      setDocsLoading(false);
    }
  }, []);

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
        await loadDocuments(patientId);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load patient.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId, selectPatient, loadDocuments]);

  const name = patient ? formatPatientDisplayName(patient) : selected?.displayName || 'Patient';

  const tools = [
    { href: ADMIN_PATIENT_VIEW_PATHS.dashboard, label: 'Patient dashboard' },
    { href: ADMIN_PATIENT_VIEW_PATHS.intake, label: 'Intake / demographics' },
    { href: ADMIN_PATIENT_VIEW_PATHS.labs, label: 'Lab results' },
    { href: ADMIN_PATIENT_VIEW_PATHS.appointments, label: 'Appointments' },
    { href: ADMIN_PATIENT_VIEW_PATHS.insurance, label: 'Insurance' },
    { href: ADMIN_PATIENT_VIEW_PATHS.conditions, label: 'Chronic conditions' },
    { href: ADMIN_PATIENT_VIEW_PATHS.incidents, label: 'Incidents / visits' },
    { href: '/admin-portal/panel', label: 'Epic & facility ops' },
  ];

  const openDocument = async (doc: PatientDocumentApi) => {
    try {
      const url = await fetchPatientDocumentBlobUrl(doc.document_id);
      window.open(url, '_blank');
    } catch {
      setDocsError('Could not open document.');
    }
  };

  const onStatusChange = async (doc: PatientDocumentApi, status: string) => {
    try {
      const updated = await updatePatientDocumentStatus(doc.document_id, { status });
      setDocuments((prev) =>
        prev.map((row) => (row.document_id === doc.document_id ? updated : row))
      );
    } catch (e) {
      setDocsError(e instanceof Error ? e.message : 'Could not update status.');
    }
  };

  const onApplyDemographics = async (doc: PatientDocumentApi) => {
    if (!patient) return;
    const identity = matchParsedIdentityToChart({
      parsedGiven: doc.parsed_given_name,
      parsedFamily: doc.parsed_family_name,
      chartGiven: patient.given_name,
      chartFamily: patient.family_name,
    });
    let force = false;
    if (!identity.match) {
      const ok = window.confirm(
        `Identity check: PDF “${identity.parsedLabel || '(no name)'}” vs chart “${identity.chartLabel}”. Apply demographics anyway?`
      );
      if (!ok) return;
      force = true;
    }
    try {
      const result = await applyPatientDocumentDemographics(doc.document_id, { force });
      setDocuments((prev) =>
        prev.map((row) =>
          row.document_id === doc.document_id ? result.document : row
        )
      );
      setDocsError(null);
      window.alert(
        `Applied ${result.updated_fields.length} demographic field(s) to chart.`
      );
    } catch (e) {
      setDocsError(e instanceof Error ? e.message : 'Could not apply demographics.');
    }
  };

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
          <GoBackButton fallback={ADMIN_PORTAL_HOME} variant="plain" />
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

      <section className="admin-ops__docs" aria-label="Patient documents">
        <div className="admin-ops__docs-head">
          <h2>Document vault</h2>
          <button
            type="button"
            disabled={!patientId || docsLoading}
            onClick={() => patientId && void loadDocuments(patientId)}
          >
            Refresh
          </button>
        </div>
        <p className="admin-ops__docs-hint">
          Files patients (or staff) uploaded for clinic review. Apply demographics writes
          parsed name/DOB/contact fields onto this chart after an identity check.
        </p>
        {docsError ? <p className="admin-ops__error">{docsError}</p> : null}
        {docsLoading ? <p className="admin-ops__docs-hint">Loading documents…</p> : null}
        {!docsLoading && documents.length === 0 ? (
          <p className="admin-ops__docs-hint">No uploaded documents yet.</p>
        ) : null}
        {documents.length > 0 ? (
          <div className="admin-ops__table-wrap">
            <table className="admin-ops__table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Uploaded</th>
                  <th>By</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.document_id}>
                    <td>
                      <span title={doc.original_filename}>{doc.original_filename}</span>
                      <div className="admin-ops__docs-meta">
                        {(doc.size_bytes / 1024).toFixed(1)} KB
                      </div>
                    </td>
                    <td>{new Date(doc.created_at).toLocaleString()}</td>
                    <td>{doc.uploaded_by_username || '—'}</td>
                    <td>
                      <select
                        value={doc.status}
                        aria-label={`Status for ${doc.original_filename}`}
                        onChange={(e) => void onStatusChange(doc, e.target.value)}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button type="button" onClick={() => void openDocument(doc)}>
                        Open
                      </button>{' '}
                      <button
                        type="button"
                        disabled={
                          doc.status === 'applied' ||
                          !doc.parse_snapshot ||
                          Object.keys(doc.parse_snapshot || {}).length === 0
                        }
                        title={
                          doc.parse_snapshot &&
                          Object.keys(doc.parse_snapshot).length > 0
                            ? 'Apply parsed demographics to chart'
                            : 'No parse snapshot on this upload yet'
                        }
                        onClick={() => void onApplyDemographics(doc)}
                      >
                        Apply demographics
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default AdminPatientHubPage;
