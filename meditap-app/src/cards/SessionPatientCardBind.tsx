import React, { useEffect, useState } from 'react';
import { ensurePatientForCurrentSession } from '../api';
import { useAuth } from '../contexts/AuthContext';
import PatientCardBindPanel from './PatientCardBindPanel';

/** Card bind controls for the signed-in patient's own chart. */
const SessionPatientCardBind: React.FC = () => {
  const { username } = useAuth();
  const [patientId, setPatientId] = useState('');

  useEffect(() => {
    let cancelled = false;
    void ensurePatientForCurrentSession(username).then((patient) => {
      if (!cancelled) setPatientId(patient?.patient_id || '');
    });
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (!patientId) return null;
  return <PatientCardBindPanel patientId={patientId} />;
};

export default SessionPatientCardBind;
