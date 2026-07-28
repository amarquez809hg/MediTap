import React, { useEffect, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { searchPatientsForAdmin, type PatientApi } from '../api';
import { useAdminPatient } from './AdminPatientContext';
import { formatPatientDisplayName } from './adminPatientStorage';
import './adminOps.css';

const AdminPatientsPage: React.FC = () => {
  const history = useHistory();
  const { selectPatient, selected } = useAdminPatient();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<PatientApi[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (query: string) => {
    setBusy(true);
    setError(null);
    try {
      const list = await searchPatientsForAdmin(query);
      setRows(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load patients.');
      setRows([]);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load('');
  }, []);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void load(q);
  };

  const openPatient = (p: PatientApi) => {
    selectPatient(p);
    history.push(`/admin-portal/patients/${p.patient_id}`);
  };

  return (
    <div className="admin-ops">
      <header className="admin-ops__header">
        <h1>Patients</h1>
        <p>Search charts and open them for on-behalf review and edits.</p>
        {selected ? (
          <p className="admin-ops__active">
            Active: <strong>{selected.displayName}</strong>{' '}
            <Link to={`/admin-portal/patients/${selected.patientId}`}>Open hub</Link>
          </p>
        ) : null}
      </header>

      <form className="admin-ops__search" onSubmit={onSearch}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name, email, phone, or patient id"
          aria-label="Search patients"
        />
        <button type="submit" disabled={busy}>
          {busy ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error ? <p className="admin-ops__error">{error}</p> : null}

      <div className="admin-ops__table-wrap">
        <table className="admin-ops__table">
          <thead>
            <tr>
              <th>Name</th>
              <th>DOB</th>
              <th>Email</th>
              <th>Phone</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.patient_id}>
                <td>{formatPatientDisplayName(p)}</td>
                <td>{p.date_of_birth || '—'}</td>
                <td>{p.email || '—'}</td>
                <td>{p.phone || '—'}</td>
                <td>
                  <button type="button" onClick={() => openPatient(p)}>
                    Open
                  </button>
                </td>
              </tr>
            ))}
            {!busy && rows.length === 0 ? (
              <tr>
                <td colSpan={5}>No patients found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPatientsPage;
