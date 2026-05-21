import { useCallback, useState } from 'react';
import { getMeditapRecordEditorRole } from '../config/meditap-roles';
import { useAuth } from '../contexts/AuthContext';
import { getAccessTokenPayload } from '../auth/accessTokenClaims';
import {
  isMeditapIntakeElevationValidForPatient,
  setMeditapIntakeElevationToken,
} from '../auth/staffElevationStorage';
import { staffElevateErrorMessage } from '../auth/staffElevateErrorMessage';
import { requestPatientIntakeStaffElevation } from '../api';

export function useStaffElevationGate() {
  const { hasRealmRole } = useAuth();
  const recordEditorRole = getMeditapRecordEditorRole();
  const hasEditorRealmRole = hasRealmRole(recordEditorRole);

  const tokenPayload = getAccessTokenPayload();
  const patientSub =
    typeof tokenPayload?.sub === 'string' ? tokenPayload.sub : undefined;

  const canEdit =
    hasEditorRealmRole || isMeditapIntakeElevationValidForPatient(patientSub);

  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffSubmitting, setStaffSubmitting] = useState(false);
  const [staffModalError, setStaffModalError] = useState<string | null>(null);
  const [staffHint, setStaffHint] = useState(
    'The patient stays signed in. Enter staff or admin credentials to continue.'
  );
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const closeStaffModal = useCallback(() => {
    if (staffSubmitting) return;
    setStaffModalOpen(false);
    setPendingAction(null);
    setStaffModalError(null);
  }, [staffSubmitting]);

  const submitStaffModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffModalError(null);
    setStaffSubmitting(true);
    try {
      const res = await requestPatientIntakeStaffElevation(
        staffUsername.trim(),
        staffPassword
      );
      setMeditapIntakeElevationToken(res.elevation_token);
      setStaffPassword('');
      setStaffModalOpen(false);
      const action = pendingAction;
      setPendingAction(null);
      action?.();
    } catch (err) {
      setStaffModalError(staffElevateErrorMessage(err));
    } finally {
      setStaffSubmitting(false);
    }
  };

  /** Run now if staff already unlocked; otherwise open staff sign-in first. */
  const gateEdit = useCallback(
    (action: () => void, hint?: string) => {
      if (hint) setStaffHint(hint);
      if (canEdit) {
        action();
        return;
      }
      setPendingAction(() => action);
      setStaffModalError(null);
      setStaffModalOpen(true);
    },
    [canEdit]
  );

  return {
    canEdit,
    gateEdit,
    staffModalOpen,
    staffHint,
    staffUsername,
    setStaffUsername,
    staffPassword,
    setStaffPassword,
    staffSubmitting,
    staffModalError,
    closeStaffModal,
    submitStaffModal,
  };
}
