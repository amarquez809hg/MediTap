import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './Tab4.css';
import { useAuth } from '../contexts/AuthContext';
import { getMeditapRecordEditorRole } from '../config/meditap-roles';
import { getAccessTokenPayload } from '../auth/accessTokenClaims';
import {
  clearMeditapIntakeElevation,
  isMeditapIntakeElevationValidForPatient,
  setMeditapIntakeElevationToken,
} from '../auth/staffElevationStorage';
import { staffElevateErrorMessage } from '../auth/staffElevateErrorMessage';
import { requestPatientIntakeStaffElevation } from '../api';
import AppointmentCard from '../appointments/AppointmentCard';
import type { Appointment } from '../appointments/appointmentStorage';
import {
  appointmentsStorageKey,
  emptyAppointmentDraft,
  loadAppointmentsFromStorage,
} from '../appointments/appointmentStorage';

const Tab4: React.FC = () => {
  const { username, hasRealmRole } = useAuth();
  const recordEditorRole = getMeditapRecordEditorRole();
  const hasEditorRealmRole = hasRealmRole(recordEditorRole);

  const storageKey = useMemo(() => appointmentsStorageKey(username), [username]);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsHydrated, setAppointmentsHydrated] = useState(false);
  const skipNextAppointmentsPersist = useRef(false);
  const [draftAppointment, setDraftAppointment] = useState<Appointment | null>(null);
  const [isNewAppointment, setIsNewAppointment] = useState(false);
  const [pendingAfterStaff, setPendingAfterStaff] = useState<'book' | null>(null);
  const [deferOpenNewAfterStaff, setDeferOpenNewAfterStaff] = useState(false);

  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffSubmitting, setStaffSubmitting] = useState(false);
  const [staffModalError, setStaffModalError] = useState<string | null>(null);
  const [elevationNonce, setElevationNonce] = useState(0);

  const kcParsedTab4 = getAccessTokenPayload() ?? undefined;
  const patientSub =
    typeof kcParsedTab4?.sub === 'string' ? kcParsedTab4.sub : undefined;

  const canEditAppointments =
    hasEditorRealmRole || isMeditapIntakeElevationValidForPatient(patientSub);

  const beginNewAppointmentDraft = useCallback(() => {
    setIsNewAppointment(true);
    setDraftAppointment(emptyAppointmentDraft());
  }, []);

  useEffect(() => {
    if (deferOpenNewAfterStaff && canEditAppointments) {
      setDeferOpenNewAfterStaff(false);
      beginNewAppointmentDraft();
    }
  }, [deferOpenNewAfterStaff, canEditAppointments, beginNewAppointmentDraft]);

  useEffect(() => {
    skipNextAppointmentsPersist.current = true;
    const stored = loadAppointmentsFromStorage(username);
    setAppointments(stored ?? []);
    setAppointmentsHydrated(true);
  }, [storageKey, username]);

  useEffect(() => {
    if (!appointmentsHydrated) return;
    if (skipNextAppointmentsPersist.current) {
      skipNextAppointmentsPersist.current = false;
      return;
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(appointments));
    } catch {
      /* quota / private mode */
    }
  }, [appointments, appointmentsHydrated, storageKey]);

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
      setElevationNonce((n) => n + 1);
      if (pendingAfterStaff === 'book') {
        setPendingAfterStaff(null);
        setDeferOpenNewAfterStaff(true);
      }
    } catch (err) {
      setStaffModalError(staffElevateErrorMessage(err));
    } finally {
      setStaffSubmitting(false);
    }
  };

  const openManageModal = (appt: Appointment) => {
    setIsNewAppointment(false);
    setDraftAppointment({ ...appt });
  };

  const handleBookNewAppointment = () => {
    if (!canEditAppointments) {
      setPendingAfterStaff('book');
      setStaffModalError(null);
      setStaffModalOpen(true);
      return;
    }
    beginNewAppointmentDraft();
  };

  const closeManageModal = () => {
    setDraftAppointment(null);
    setIsNewAppointment(false);
  };

  const updateDraft = (field: keyof Appointment, value: string) => {
    setDraftAppointment((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const saveAppointmentChanges = () => {
    if (!draftAppointment || !canEditAppointments) return;
    if (isNewAppointment) {
      const nextId =
        appointments.length > 0 ? Math.max(...appointments.map((a) => a.id)) + 1 : 1;
      const appointmentId =
        draftAppointment.appointmentId.trim() ||
        `APPT-${String(nextId).padStart(5, '0')}`;
      const newRow: Appointment = {
        ...draftAppointment,
        id: nextId,
        appointmentId,
      };
      setAppointments((prev) => [...prev, newRow]);
      setIsNewAppointment(false);
      setDraftAppointment(newRow);
      return;
    }
    setAppointments((prev) =>
      prev.map((row) => (row.id === draftAppointment.id ? draftAppointment : row))
    );
  };

  return (
    <div className="schedule-container">
      <header className="schedule-header">
        <h1><i className="fas fa-calendar-check"></i> Upcoming Appointments</h1>
        <div className="schedule-header__actions">
          <button
            type="button"
            className="book-btn schedule-header__action-btn"
            onClick={handleBookNewAppointment}
          >
            <i className="fas fa-plus" aria-hidden />
            Book New Appointment
          </button>
          <a
            href="/tab1"
            className="book-btn schedule-header__action-btn"
          >
            <i className="fas fa-arrow-left" aria-hidden />
            Go back to dashboard
          </a>
        </div>
      </header>

      <main className="schedule-main">
        {appointments.length > 0 ? (
          <div className="appointments-list">
            {appointments.map((appt) => (
              <AppointmentCard key={appt.id} appt={appt} onManage={openManageModal} />
            ))}
          </div>
        ) : (
          <div className="no-appointments">
            <p>You have no upcoming appointments.</p>
            <button
              type="button"
              className="book-btn large-book-btn"
              onClick={handleBookNewAppointment}
            >
              Book Now
            </button>
          </div>
        )}
      </main>

      {draftAppointment && (
        <div className="appt-modal" role="dialog" aria-modal="true" aria-labelledby="appt-modal-title">
          <button
            type="button"
            className="appt-modal__backdrop"
            aria-label="Close appointment modal"
            onClick={closeManageModal}
          />
          <div className="appt-modal__panel">
            <div className="appt-modal__header">
              <h2 id="appt-modal-title">
                {isNewAppointment ? 'Book New Appointment' : 'Appointment Management'}
              </h2>
              <button type="button" className="appt-modal__close" onClick={closeManageModal}>
                <i className="fas fa-times" aria-hidden />
              </button>
            </div>

            <p className="appt-modal__sub">
              {isNewAppointment
                ? 'Fill in appointment details. Staff access is required to create.'
                : 'Review complete appointment details. Editing requires staff access.'}
            </p>

            {!canEditAppointments && (
              <div className="appt-modal__lock-banner">
                <p>
                  {isNewAppointment
                    ? 'Sign in with staff credentials to create this appointment.'
                    : 'This appointment is view-only. Use staff sign-in to unlock editing.'}
                </p>
                <button
                  type="button"
                  className="book-btn"
                  onClick={() => {
                    setStaffModalError(null);
                    setStaffModalOpen(true);
                  }}
                >
                  Staff sign-in
                </button>
              </div>
            )}

            {canEditAppointments && (
              <div className="appt-modal__lock-banner appt-modal__lock-banner--active">
                <p>Staff editing is active for this patient session.</p>
                <button
                  type="button"
                  className="book-btn"
                  onClick={() => {
                    clearMeditapIntakeElevation();
                    setElevationNonce((n) => n + 1);
                  }}
                >
                  End staff mode
                </button>
              </div>
            )}

            <div className="appt-modal__form-grid">
              <div className="form-field">
                <label>Appointment ID</label>
                <input
                  value={draftAppointment.appointmentId}
                  onChange={(e) => updateDraft('appointmentId', e.target.value)}
                  disabled={!canEditAppointments}
                />
              </div>
              <div className="form-field">
                <label>Status</label>
                <select
                  value={draftAppointment.status}
                  onChange={(e) => updateDraft('status', e.target.value)}
                  disabled={!canEditAppointments}
                >
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className="form-field">
                <label>Specialist</label>
                <input
                  value={draftAppointment.specialist}
                  onChange={(e) => updateDraft('specialist', e.target.value)}
                  disabled={!canEditAppointments}
                />
              </div>
              <div className="form-field">
                <label>Department</label>
                <input
                  value={draftAppointment.department}
                  onChange={(e) => updateDraft('department', e.target.value)}
                  disabled={!canEditAppointments}
                />
              </div>
              <div className="form-field">
                <label>Date</label>
                <input
                  value={draftAppointment.date}
                  onChange={(e) => updateDraft('date', e.target.value)}
                  disabled={!canEditAppointments}
                />
              </div>
              <div className="form-field">
                <label>Time</label>
                <input
                  value={draftAppointment.time}
                  onChange={(e) => updateDraft('time', e.target.value)}
                  disabled={!canEditAppointments}
                />
              </div>
              <div className="form-field">
                <label>Visit Type</label>
                <select
                  value={draftAppointment.type}
                  onChange={(e) => updateDraft('type', e.target.value)}
                  disabled={!canEditAppointments}
                >
                  <option value="In-Office Visit">In-Office Visit</option>
                  <option value="Video Consultation">Video Consultation</option>
                  <option value="Phone Consultation">Phone Consultation</option>
                </select>
              </div>
              <div className="form-field">
                <label>Duration</label>
                <input
                  value={draftAppointment.duration}
                  onChange={(e) => updateDraft('duration', e.target.value)}
                  disabled={!canEditAppointments}
                />
              </div>
              <div className="form-field appt-modal__field-wide">
                <label>Location / Platform</label>
                <input
                  value={draftAppointment.location}
                  onChange={(e) => updateDraft('location', e.target.value)}
                  disabled={!canEditAppointments}
                />
              </div>
              <div className="form-field appt-modal__field-wide">
                <label>Reason for Visit</label>
                <textarea
                  value={draftAppointment.reasonForVisit}
                  onChange={(e) => updateDraft('reasonForVisit', e.target.value)}
                  disabled={!canEditAppointments}
                />
              </div>
              <div className="form-field appt-modal__field-wide">
                <label>Patient Instructions</label>
                <textarea
                  value={draftAppointment.patientInstructions}
                  onChange={(e) => updateDraft('patientInstructions', e.target.value)}
                  disabled={!canEditAppointments}
                />
              </div>
              <div className="form-field appt-modal__field-wide">
                <label>Clinical Notes</label>
                <textarea
                  value={draftAppointment.clinicalNotes}
                  onChange={(e) => updateDraft('clinicalNotes', e.target.value)}
                  disabled={!canEditAppointments}
                />
              </div>
            </div>

            <div className="appt-modal__actions">
              <button type="button" className="clear-button" onClick={closeManageModal}>
                Close
              </button>
              <button
                type="button"
                className="save-button"
                disabled={!canEditAppointments}
                onClick={saveAppointmentChanges}
              >
                {isNewAppointment ? 'Create appointment' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {staffModalOpen && (
        <div
          className="tab14-staff-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tab4-staff-modal-title"
        >
          <button
            type="button"
            className="tab14-staff-modal__backdrop"
            aria-label="Close dialog"
            disabled={staffSubmitting}
            onClick={() => {
              if (!staffSubmitting) {
                setStaffModalOpen(false);
                setPendingAfterStaff(null);
                setDeferOpenNewAfterStaff(false);
              }
            }}
          />
          <div className="tab14-staff-modal__panel">
            <h2 id="tab4-staff-modal-title">Staff sign-in</h2>
            <p className="tab14-staff-modal__hint">
              {pendingAfterStaff === 'book'
                ? 'Enter staff credentials to book a new appointment.'
                : 'Enter staff credentials to unlock appointment editing.'}
            </p>
            <form onSubmit={(e) => void submitStaffModal(e)}>
              <div className="form-field">
                <label htmlFor="tab4-staff-user">Staff username</label>
                <input
                  id="tab4-staff-user"
                  name="username"
                  autoComplete="username"
                  value={staffUsername}
                  onChange={(e) => setStaffUsername(e.target.value)}
                  disabled={staffSubmitting}
                />
              </div>
              <div className="form-field">
                <label htmlFor="tab4-staff-pass">Password</label>
                <input
                  id="tab4-staff-pass"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  disabled={staffSubmitting}
                />
              </div>
              {staffModalError && (
                <p className="tab14-staff-modal__error">{staffModalError}</p>
              )}
              <div className="tab14-staff-modal__actions">
                <button
                  type="button"
                  className="tab14-staff-modal__btn tab14-staff-modal__btn--secondary"
                  disabled={staffSubmitting}
                  onClick={() => {
                    setStaffModalOpen(false);
                    setPendingAfterStaff(null);
                    setDeferOpenNewAfterStaff(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="tab14-staff-modal__btn tab14-staff-modal__btn--primary"
                  disabled={staffSubmitting}
                >
                  {staffSubmitting ? 'Signing in…' : 'Unlock editing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tab4;