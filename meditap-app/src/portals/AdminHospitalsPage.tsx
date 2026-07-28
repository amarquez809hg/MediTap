import React, { useEffect, useState } from 'react';
import {
  createHospitalForAdmin,
  listHospitalsForAdmin,
  updateHospitalForAdmin,
  type HospitalApi,
} from '../api';
import './adminOps.css';

const AdminHospitalsPage: React.FC = () => {
  const [rows, setRows] = useState<HospitalApi[]>([]);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setBusy(true);
    setError(null);
    try {
      setRows(await listHospitalsForAdmin());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load hospitals.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await createHospitalForAdmin({
        name: name.trim(),
        city: city.trim() || undefined,
      });
      setName('');
      setCity('');
      setMessage('Hospital created.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed.');
    } finally {
      setBusy(false);
    }
  };

  const rename = async (h: HospitalApi) => {
    const next = window.prompt('Hospital name', h.name);
    if (!next || !next.trim() || next.trim() === h.name) return;
    setBusy(true);
    try {
      await updateHospitalForAdmin(h.hospital_id, { name: next.trim() });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-ops">
      <header className="admin-ops__header">
        <h1>Hospitals</h1>
        <p>List, create, and rename facilities used by intake and incidents.</p>
      </header>

      <form className="admin-ops__search" onSubmit={onCreate}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Hospital name"
          aria-label="Hospital name"
        />
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City (optional)"
          aria-label="City"
        />
        <button type="submit" disabled={busy || !name.trim()}>
          Add hospital
        </button>
      </form>

      {error ? <p className="admin-ops__error">{error}</p> : null}
      {message ? <p className="admin-ops__ok">{message}</p> : null}

      <div className="admin-ops__table-wrap">
        <table className="admin-ops__table">
          <thead>
            <tr>
              <th>Name</th>
              <th>City</th>
              <th>Region</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => (
              <tr key={h.hospital_id}>
                <td>{h.name}</td>
                <td>{h.city || '—'}</td>
                <td>{h.region || '—'}</td>
                <td>
                  <button type="button" onClick={() => void rename(h)} disabled={busy}>
                    Rename
                  </button>
                </td>
              </tr>
            ))}
            {!busy && rows.length === 0 ? (
              <tr>
                <td colSpan={4}>No hospitals yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminHospitalsPage;
