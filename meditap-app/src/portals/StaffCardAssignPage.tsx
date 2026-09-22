import React, { useCallback, useEffect, useState } from 'react';
import {
  assignCardToPatient,
  listCardDirectory,
  type CardDirectoryRow,
} from '../cards/patientCardApi';
import GoBackButton from '../components/GoBackButton';
import { ADMIN_PORTAL_HOME } from './portalPaths';
import './adminOps.css';

const StaffCardAssignPage: React.FC = () => {
  const [rows, setRows] = useState<CardDirectoryRow[]>([]);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    const list = await listCardDirectory();
    setRows(list);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void load().catch((e: unknown) => {
      if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load patients.');
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const onAssign = async (patientId: string) => {
    setBusyId(patientId);
    setError('');
    setNotice('');
    try {
      await assignCardToPatient(patientId);
      const person = rows.find((row) => row.patient_id === patientId);
      const name = person ? `${person.given_name} ${person.family_name}`.trim() : 'that patient';
      setNotice(`The card now opens ${name}. The next tap shows their chart.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not assign the card.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="admin-ops">
      <header className="admin-ops__header">
        <h1>Profile cards</h1>
        <p>
          Pick a patient. The card already on the reader keeps its link, and the next tap opens
          that patient’s chart without a sign-in.
        </p>
        <div className="admin-ops__actions">
          <GoBackButton fallback={ADMIN_PORTAL_HOME} variant="plain" />
        </div>
      </header>

      {error ? <p className="admin-ops__error">{error}</p> : null}
      {notice ? <p className="admin-ops__active">{notice}</p> : null}

      <div className="admin-ops__table-wrap">
        <table className="admin-ops__table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Login</th>
              <th>Email</th>
              <th>Card</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const assigned = row.cards.some((card) => card.card_uid);
              const uid = row.cards.find((card) => card.card_uid)?.card_uid;
              return (
                <tr key={row.patient_id}>
                  <td>
                    {row.family_name}, {row.given_name}
                    <div>{row.date_of_birth}</div>
                  </td>
                  <td>{row.username || '—'}</td>
                  <td>{row.email || '—'}</td>
                  <td>{assigned ? uid : 'Not assigned'}</td>
                  <td>
                    <button
                      type="button"
                      disabled={Boolean(busyId) || assigned}
                      onClick={() => void onAssign(row.patient_id)}
                    >
                      {assigned ? 'Assigned' : busyId === row.patient_id ? 'Assigning…' : 'Assign card'}
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5}>No patients yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StaffCardAssignPage;
