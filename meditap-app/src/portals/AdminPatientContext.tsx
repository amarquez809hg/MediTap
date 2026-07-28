import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { logAdminActivityEvent } from '../api';
import {
  formatPatientDisplayName,
  readAdminSelectedPatient,
  writeAdminSelectedPatient,
  type AdminSelectedPatient,
} from './adminPatientStorage';

type AdminPatientContextValue = {
  selected: AdminSelectedPatient | null;
  selectPatient: (patient: {
    patient_id: string;
    given_name?: string | null;
    family_name?: string | null;
    email?: string | null;
  }) => void;
  clearPatient: () => void;
};

const AdminPatientContext = createContext<AdminPatientContextValue | undefined>(undefined);

export const AdminPatientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selected, setSelected] = useState<AdminSelectedPatient | null>(() =>
    readAdminSelectedPatient()
  );

  useEffect(() => {
    writeAdminSelectedPatient(selected);
  }, [selected]);

  const selectPatient = useCallback(
    (patient: {
      patient_id: string;
      given_name?: string | null;
      family_name?: string | null;
      email?: string | null;
    }) => {
      const next: AdminSelectedPatient = {
        patientId: patient.patient_id,
        displayName: formatPatientDisplayName(patient),
        email: patient.email,
      };
      setSelected(next);
      void logAdminActivityEvent('patient.select', next.patientId, {
        displayName: next.displayName,
      });
    },
    []
  );

  const clearPatient = useCallback(() => {
    setSelected(null);
  }, []);

  const value = useMemo(
    () => ({ selected, selectPatient, clearPatient }),
    [selected, selectPatient, clearPatient]
  );

  return (
    <AdminPatientContext.Provider value={value}>{children}</AdminPatientContext.Provider>
  );
};

export function useAdminPatient(): AdminPatientContextValue {
  const ctx = useContext(AdminPatientContext);
  if (!ctx) {
    return {
      selected: readAdminSelectedPatient(),
      selectPatient: (patient) => {
        writeAdminSelectedPatient({
          patientId: patient.patient_id,
          displayName: formatPatientDisplayName(patient),
          email: patient.email,
        });
      },
      clearPatient: () => writeAdminSelectedPatient(null),
    };
  }
  return ctx;
}
