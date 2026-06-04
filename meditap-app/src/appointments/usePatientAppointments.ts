import { useEffect, useState } from 'react';
import {
  createPatientAppointment,
  fetchPatientAppointments,
  formatSessionOrTokenErrorForUi,
} from '../api';
import {
  appointmentDraftToWriteBody,
  mapPatientAppointmentApiToRow,
} from './appointmentModel';
import type { Appointment } from './appointmentStorage';
import {
  clearAppointmentsLocalStorage,
  loadLegacyAppointmentsFromStorage,
} from './appointmentStorage';

type UsePatientAppointmentsOptions = {
  /** When true and API is empty, import legacy localStorage rows (staff create). */
  migrateLegacyIfEmpty?: boolean;
};

export function usePatientAppointments(
  username: string | null,
  refreshKey = 0,
  options: UsePatientAppointmentsOptions = {}
) {
  const { migrateLegacyIfEmpty = false } = options;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const { patientId: pid, appointments: rows } =
          await fetchPatientAppointments(username);
        if (cancelled) return;

        setPatientId(pid);
        let mapped = rows.map(mapPatientAppointmentApiToRow);

        if (
          migrateLegacyIfEmpty &&
          mapped.length === 0 &&
          pid &&
          typeof window !== 'undefined'
        ) {
          const legacy = loadLegacyAppointmentsFromStorage(username);
          if (legacy?.length) {
            const created: Appointment[] = [];
            for (const row of legacy) {
              const saved = await createPatientAppointment(
                appointmentDraftToWriteBody(pid, row)
              );
              created.push(mapPatientAppointmentApiToRow(saved));
            }
            mapped = created;
            clearAppointmentsLocalStorage(username);
          }
        }

        setAppointments(mapped);
      } catch (e) {
        if (!cancelled) {
          setAppointments([]);
          setError(
            formatSessionOrTokenErrorForUi(
              e instanceof Error ? e.message : 'Could not load appointments.'
            )
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [username, refreshKey, migrateLegacyIfEmpty]);

  return {
    appointments,
    setAppointments,
    patientId,
    loading,
    error,
  };
}
