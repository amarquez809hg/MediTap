import React, { useCallback, useEffect, useState } from 'react';
import {
  assignCardToPatient,
  bindPatientCardUid,
  listCardDirectory,
  type CardDirectoryRow,
  type IssuedSunCard,
} from '../cards/patientCardApi';
import GoBackButton from '../components/GoBackButton';
import { ADMIN_PORTAL_HOME } from './portalPaths';
import './adminOps.css';

const StaffCardAssignPage: React.FC = () => {
  const [rows, setRows] = useState<CardDirectoryRow[]>([]);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [issued, setIssued] = useState<IssuedSunCard | null>(null);
  const [uid, setUid] = useState('');
  const [counter, setCounter] = useState('');
  const [copied, setCopied] = useState(false);

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

  const onIssue = async (patientId: string) => {
    setBusyId(patientId);
    setError('');
    setCopied(false);
    try {
      const created = await assignCardToPatient(patientId);
      setIssued(created);
      setUid('');
      setCounter('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create a card.');
    } finally {
      setBusyId('');
    }
  };

  const onBind = async () => {
    if (!issued) return;
    setBusyId(issued.card_id);
    setError('');
    try {
      const parsed = counter.trim() === '' ? undefined : Number(counter);
      if (parsed !== undefined && Number.isNaN(parsed)) {
        setError('Counter must be a number.');
        return;
      }
      await bindPatientCardUid(issued.card_id, uid, parsed);
      setIssued(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the card UID.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="admin-ops">
      <header className="admin-ops__header">
        <h1>Profile cards</h1>
        <p>
          Assign card issues a new link for that patient and turns on the per-tap key. Put a
          blank card on the reader and run the command it shows. Other patients’ cards stay put.
        </p>
        <div className="admin-ops__actions">
          <GoBackButton fallback={ADMIN_PORTAL_HOME} variant="plain" />
        </div>
      </header>

      {error ? <p className="admin-ops__error">{error}</p> : null}

      {issued ? (
        <section className="admin-ops__active">
          <p>
            Card for <strong>{issued.patient_name}</strong>. Burn this onto a blank card, then paste
            the UID and counter the script prints.
          </p>
          <textarea readOnly rows={3} value={issued.burn_command} aria-label="Burn command" />
          <div className="admin-ops__actions">
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(issued.burn_command);
                setCopied(true);
              }}
            >
              {copied ? 'Copied' : 'Copy command'}
            </button>
          </div>
          <form
            className="admin-ops__search"
            onSubmit={(event) => {
              event.preventDefault();
              void onBind();
            }}
          >
            <input
              value={uid}
              onChange={(event) => setUid(event.target.value)}
              placeholder="Card UID"
              aria-label="Card UID"
            />
            <input
              value={counter}
              onChange={(event) => setCounter(event.target.value)}
              placeholder="Counter"
              aria-label="Read counter"
            />
            <button type="submit" disabled={Boolean(busyId) || !uid.trim()}>
              Save UID
            </button>
          </form>
        </section>
      ) : null}

      <div className="admin-ops__table-wrap">
        <table className="admin-ops__table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Login</th>
              <th>Email</th>
              <th>Cards</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const uids = row.cards.map((card) => card.card_uid).filter(Boolean);
              return (
                <tr key={row.patient_id}>
                  <td>
                    {row.family_name}, {row.given_name}
                    <div>{row.date_of_birth}</div>
                  </td>
                  <td>{row.username || '—'}</td>
                  <td>{row.email || '—'}</td>
                  <td>{uids.length ? uids.join(', ') : 'None'}</td>
                  <td>
                    <button
                      type="button"
                      disabled={Boolean(busyId)}
                      onClick={() => void onIssue(row.patient_id)}
                    >
                      {busyId === row.patient_id ? 'Assigning…' : 'Assign card'}
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
