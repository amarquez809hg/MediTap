import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listPatientDocuments,
  type PatientDocumentApi,
} from '../api';
import GoBackButton from '../components/GoBackButton';
import { countReviewWarningsInSnapshot } from '../intake/intakeFieldReview';
import { ADMIN_PORTAL_HOME } from './portalPaths';
import './adminOps.css';

type QueueRow = PatientDocumentApi & { flaggedFieldCount: number };

/**
 * Cross-patient document vault queue for pending clinic review.
 * Surfaces PDF intake flagged-field counts from parse_snapshot.reviewWarnings.
 */
const AdminDocumentReviewQueuePage: React.FC = () => {
  const [documents, setDocuments] = useState<PatientDocumentApi[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listPatientDocuments();
      const pending = rows
        .filter((d) => d.status === 'pending_review' || d.status === 'reviewed')
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      setDocuments(pending);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load documents.');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows: QueueRow[] = useMemo(
    () =>
      documents.map((doc) => ({
        ...doc,
        flaggedFieldCount: countReviewWarningsInSnapshot(doc.parse_snapshot),
      })),
    [documents]
  );

  const visible = useMemo(
    () => (flaggedOnly ? rows.filter((r) => r.flaggedFieldCount > 0) : rows),
    [rows, flaggedOnly]
  );

  const flaggedTotal = useMemo(
    () => rows.reduce((n, r) => n + (r.flaggedFieldCount > 0 ? 1 : 0), 0),
    [rows]
  );

  return (
    <div className="admin-ops">
      <header className="admin-ops__header">
        <p className="admin-ops__crumb">Admin / Document review</p>
        <h1>Document review queue</h1>
        <p>
          Pending and reviewed uploads across patients. Flagged-field counts come
          from PDF intake warnings — open the patient hub, then Patient
          Information, to Accept / Reject in the staff review queue.
        </p>
        <div className="admin-ops__actions">
          <GoBackButton fallback={ADMIN_PORTAL_HOME} variant="plain" />
          <button type="button" disabled={loading} onClick={() => void load()}>
            Refresh
          </button>
          <button
            type="button"
            aria-pressed={flaggedOnly}
            onClick={() => setFlaggedOnly((v) => !v)}
          >
            {flaggedOnly ? 'Show all' : `Flagged only (${flaggedTotal})`}
          </button>
        </div>
      </header>

      {error ? <p className="admin-ops__error">{error}</p> : null}
      {loading ? <p className="admin-ops__docs-hint">Loading queue…</p> : null}
      {!loading && visible.length === 0 ? (
        <p className="admin-ops__docs-hint">
          {flaggedOnly
            ? 'No vault documents with flagged intake fields.'
            : 'No pending documents in the vault.'}
        </p>
      ) : null}

      {visible.length > 0 ? (
        <div className="admin-ops__table-wrap">
          <table className="admin-ops__table">
            <thead>
              <tr>
                <th>File</th>
                <th>Patient</th>
                <th>Uploaded</th>
                <th>By</th>
                <th>Status</th>
                <th>Parsed name</th>
                <th>Flagged fields</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((doc) => (
                <tr key={doc.document_id}>
                  <td>
                    <span title={doc.original_filename}>{doc.original_filename}</span>
                    <div className="admin-ops__docs-meta">
                      {(doc.size_bytes / 1024).toFixed(1)} KB
                      {doc.parse_snapshot &&
                      Object.keys(doc.parse_snapshot).length > 0
                        ? ' · has parse snapshot'
                        : ''}
                    </div>
                  </td>
                  <td>
                    <code>{String(doc.patient).slice(0, 8)}…</code>
                  </td>
                  <td>{new Date(doc.created_at).toLocaleString()}</td>
                  <td>{doc.uploaded_by_username || '—'}</td>
                  <td>{doc.status}</td>
                  <td>
                    {[doc.parsed_given_name, doc.parsed_family_name]
                      .filter(Boolean)
                      .join(' ') || '—'}
                  </td>
                  <td>
                    {doc.flaggedFieldCount > 0 ? (
                      <strong>{doc.flaggedFieldCount}</strong>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <Link to={`/admin-portal/patients/${doc.patient}`}>
                      Open hub
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
};

export default AdminDocumentReviewQueuePage;
