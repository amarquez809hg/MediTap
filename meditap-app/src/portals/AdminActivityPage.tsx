import React, { useEffect, useState } from 'react';
import { listAdminActivity, type AdminActivityApi } from '../api';
import './adminOps.css';

const AdminActivityPage: React.FC = () => {
  const [rows, setRows] = useState<AdminActivityApi[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setBusy(true);
    setError(null);
    try {
      setRows(await listAdminActivity());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load activity.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="admin-ops">
      <header className="admin-ops__header">
        <h1>Activity</h1>
        <p>Staff actions on patients, hospitals, and chart updates (ops trail).</p>
        <div className="admin-ops__actions">
          <button type="button" onClick={() => void load()} disabled={busy}>
            Refresh
          </button>
        </div>
      </header>

      {error ? <p className="admin-ops__error">{error}</p> : null}

      <div className="admin-ops__table-wrap">
        <table className="admin-ops__table">
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Patient</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.event_id}>
                <td>{new Date(r.created_at).toLocaleString()}</td>
                <td>{r.actor_username || '—'}</td>
                <td>
                  <code>{r.action}</code>
                </td>
                <td>{r.patient_label || r.patient || '—'}</td>
                <td>
                  <code className="admin-ops__detail">
                    {JSON.stringify(r.detail || {})}
                  </code>
                </td>
              </tr>
            ))}
            {!busy && rows.length === 0 ? (
              <tr>
                <td colSpan={5}>No activity yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminActivityPage;
