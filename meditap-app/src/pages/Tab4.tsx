import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './Tab4.css';
import { useAuth } from '../contexts/AuthContext';
import { getMeditapRecordEditorRole } from '../config/meditap-roles';
import { getAccessTokenPayload } from '../auth/accessTokenClaims';
import { consumeOpenAddEntry } from '../auth/openAddEntry';
import {
  clearMeditapIntakeElevation,
  isMeditapIntakeElevationValidForPatient,
  setMeditapIntakeElevationToken,
} from '../auth/staffElevationStorage';
import { staffElevateErrorMessage } from '../auth/staffElevateErrorMessage';
import {
  createPatientAppointment,
  requestPatientIntakeStaffElevation,
  updatePatientAppointment,
} from '../api';
import AppointmentCard from '../appointments/AppointmentCard';
import AppointmentPresetField from '../appointments/AppointmentPresetField';
import {
  APPOINTMENT_CLINICAL_NOTES_OPTIONS,
  APPOINTMENT_DEPARTMENT_OPTIONS,
  APPOINTMENT_DURATION_OPTIONS,
  APPOINTMENT_ID_AUTO_LABEL,
  APPOINTMENT_ID_PRESETS,
  APPOINTMENT_INSTRUCTIONS_OPTIONS,
  APPOINTMENT_LOCATION_OPTIONS,
  APPOINTMENT_REASON_OPTIONS,
  APPOINTMENT_SPECIALIST_OPTIONS,
  APPOINTMENT_STATUS_OPTIONS,
  APPOINTMENT_TIME_OPTIONS,
  APPOINTMENT_VISIT_TYPE_OPTIONS,
  buildAppointmentDatePresets,
  suggestAppointmentId,
} from '../appointments/appointmentFieldLibrary';
import {
  appointmentDraftToWriteBody,
  mapPatientAppointmentApiToRow,
} from '../appointments/appointmentModel';
import type { Appointment } from '../appointments/appointmentStorage';
import {
  emptyAppointmentDraft,
  NEW_APPOINTMENT_DRAFT_ID,
} from '../appointments/appointmentStorage';
import { usePatientAppointments } from '../appointments/usePatientAppointments';

const Tab4: React.FC = () => {
  const { username, hasRealmRole } = useAuth();
  const recordEditorRole = getMeditapRecordEditorRole();
  const hasEditorRealmRole = hasRealmRole(recordEditorRole);

  const [draftAppointment, setDraftAppointment] = useState<Appointment | null>(null);
  const [isNewAppointment, setIsNewAppointment] = useState(false);
  const [pendingAfterStaff, setPendingAfterStaff] = useState<'book' | null>(null);
  const [deferOpenNewAfterStaff, setDeferOpenNewAfterStaff] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  const {
    appointments,
    setAppointments,
    patientId,
    loading,
    error: loadError,
  } = usePatientAppointments(username, elevationNonce, {
    migrateLegacyIfEmpty: canEditAppointments,
  });

  const appointmentDatePresets = useMemo(() => buildAppointmentDatePresets(), []);

  const beginNewAppointmentDraft = useCallback(() => {
    setIsNewAppointment(true);
    setDraftAppointment(emptyAppointmentDraft());
    setSaveError(null);
  }, []);

  useEffect(() => {
    if (deferOpenNewAfterStaff && canEditAppointments) {
      setDeferOpenNewAfterStaff(false);
      beginNewAppointmentDraft();
    }
  }, [deferOpenNewAfterStaff, canEditAppointments, beginNewAppointmentDraft]);

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
    setSaveError(null);
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

  useEffect(() => {
    if (!consumeOpenAddEntry('/tab4')) return;
    if (canEditAppointments) beginNewAppointmentDraft();
    else handleBookNewAppointment();
  }, [canEditAppointments, elevationNonce, beginNewAppointmentDraft]);

  const closeManageModal = () => {
    setDraftAppointment(null);
    setIsNewAppointment(false);
    setSaveError(null);
  };

  const updateDraft = (field: keyof Appointment, value: string) => {
    setDraftAppointment((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const saveAppointmentChanges = async () => {
    if (!draftAppointment || !canEditAppointments || !patientId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const body = appointmentDraftToWriteBody(patientId, draftAppointment);
      if (
        isNewAppointment ||
        !draftAppointment.id ||
        draftAppointment.id === NEW_APPOINTMENT_DRAFT_ID
      ) {
        const nextSeq = appointments.length + 1;
        if (!body.appointmentId) {
          body.appointmentId = suggestAppointmentId(nextSeq);
        }
        const created = await createPatientAppointment(body);
        const row = mapPatientAppointmentApiToRow(created);
        setAppointments((prev) => [...prev, row]);
        setIsNewAppointment(false);
        setDraftAppointment(row);
        return;
      }
      const updated = await updatePatientAppointment(draftAppointment.id, body);
      const row = mapPatientAppointmentApiToRow(updated);
      setAppointments((prev) =>
        prev.map((item) => (item.id === draftAppointment.id ? row : item))
      );
      setDraftAppointment(row);
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : 'Could not save appointment.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="schedule-container">
      <header className="schedule-header">
        <div className="schedule-header__title-block">
          <h1><i className="fas fa-calendar-check"></i> Upcoming Appointments</h1>
          {!canEditAppointments && (
            <p className="record-tab-readonly-hint">
              You can review upcoming appointments here. Booking or changing appointments
              requires staff sign-in (record editor role).
            </p>
          )}
        </div>
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
        {loadError && (
          <p className="record-tab-readonly-hint" role="alert">
            {loadError}
          </p>
        )}
        {loading ? (
          <p className="record-tab-empty">Loading appointments…</p>
        ) : appointments.length > 0 ? (
          <div className="appointments-list">
            {appointments.map((appt) => (
              <AppointmentCard key={appt.id} appt={appt} onManage={openManageModal} />
            ))}
          </div>
        ) : (
          <div className="record-tab-empty">
            <p>You have no upcoming appointments.</p>
            <button
              type="button"
              className="book-btn record-tab-empty-cta"
              onClick={handleBookNewAppointment}
            >
              <i className="fas fa-plus" aria-hidden />
              Book New Appointment
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
                ? 'Fill in appointment details. Staff access is required to create. Use Quick pick from library on each field for common values, or type your own.'
                : 'Review complete appointment details. Editing requires staff access. Use Quick pick from library for common values.'}
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

            {saveError && (
              <p className="tab14-staff-modal__error" role="alert">
                {saveError}
              </p>
            )}

            <div className="appt-modal__form-grid">
              <AppointmentPresetField
                label="Appointment ID"
                value={draftAppointment.appointmentId}
                options={APPOINTMENT_ID_PRESETS}
                onChange={(v) => {
                  if (v === APPOINTMENT_ID_AUTO_LABEL) {
                    updateDraft(
                      'appointmentId',
                      suggestAppointmentId(appointments.length + 1)
                    );
                    return;
                  }
                  updateDraft('appointmentId', v);
                }}
                disabled={!canEditAppointments}
                inputPlaceholder="e.g. APPT-24001 or leave blank to auto-generate"
              />
              <div className="form-field">
                <label htmlFor="appt-status">Status</label>
                <select
                  id="appt-status"
                  value={draftAppointment.status}
                  onChange={(e) => updateDraft('status', e.target.value)}
                  disabled={!canEditAppointments}
                >
                  {APPOINTMENT_STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <AppointmentPresetField
                label="Specialist"
                value={draftAppointment.specialist}
                options={APPOINTMENT_SPECIALIST_OPTIONS}
                onChange={(v) => updateDraft('specialist', v)}
                disabled={!canEditAppointments}
                inputPlaceholder="Provider name"
              />
              <AppointmentPresetField
                label="Department"
                value={draftAppointment.department}
                options={APPOINTMENT_DEPARTMENT_OPTIONS}
                onChange={(v) => updateDraft('department', v)}
                disabled={!canEditAppointments}
                inputPlaceholder="Clinic department"
              />
              <AppointmentPresetField
                label="Date"
                value={draftAppointment.date}
                options={appointmentDatePresets}
                onChange={(v) => updateDraft('date', v)}
                disabled={!canEditAppointments}
                inputPlaceholder="e.g. Wednesday, Nov 27"
              />
              <AppointmentPresetField
                label="Time"
                value={draftAppointment.time}
                options={APPOINTMENT_TIME_OPTIONS}
                onChange={(v) => updateDraft('time', v)}
                disabled={!canEditAppointments}
                inputPlaceholder="e.g. 10:00 AM"
              />
              <div className="form-field">
                <label htmlFor="appt-visit-type">Visit Type</label>
                <select
                  id="appt-visit-type"
                  value={draftAppointment.type}
                  onChange={(e) => updateDraft('type', e.target.value)}
                  disabled={!canEditAppointments}
                >
                  {APPOINTMENT_VISIT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <AppointmentPresetField
                label="Duration"
                value={draftAppointment.duration}
                options={APPOINTMENT_DURATION_OPTIONS}
                onChange={(v) => updateDraft('duration', v)}
                disabled={!canEditAppointments}
                inputPlaceholder="e.g. 30 min"
              />
              <AppointmentPresetField
                className="appt-modal__field-wide"
                label="Location / Platform"
                value={draftAppointment.location}
                options={APPOINTMENT_LOCATION_OPTIONS}
                onChange={(v) => updateDraft('location', v)}
                disabled={!canEditAppointments}
                inputPlaceholder="Clinic site or telehealth room"
              />
              <AppointmentPresetField
                className="appt-modal__field-wide"
                label="Reason for Visit"
                value={draftAppointment.reasonForVisit}
                options={APPOINTMENT_REASON_OPTIONS}
                onChange={(v) => updateDraft('reasonForVisit', v)}
                disabled={!canEditAppointments}
                multiline
                inputPlaceholder="Chief complaint or visit purpose"
              />
              <AppointmentPresetField
                className="appt-modal__field-wide"
                label="Patient Instructions"
                value={draftAppointment.patientInstructions}
                options={APPOINTMENT_INSTRUCTIONS_OPTIONS}
                onChange={(v) => updateDraft('patientInstructions', v)}
                disabled={!canEditAppointments}
                multiline
                inputPlaceholder="Pre-visit instructions for the patient"
              />
              <AppointmentPresetField
                className="appt-modal__field-wide"
                label="Clinical Notes"
                value={draftAppointment.clinicalNotes}
                options={APPOINTMENT_CLINICAL_NOTES_OPTIONS}
                onChange={(v) => updateDraft('clinicalNotes', v)}
                disabled={!canEditAppointments}
                multiline
                inputPlaceholder="Internal clinical notes"
              />
            </div>

            <div className="appt-modal__actions">
              <button type="button" className="clear-button" onClick={closeManageModal}>
                Close
              </button>
              <button
                type="button"
                className="save-button"
                disabled={!canEditAppointments || saving || !patientId}
                onClick={() => void saveAppointmentChanges()}
              >
                {saving
                  ? 'Saving…'
                  : isNewAppointment
                    ? 'Create appointment'
                    : 'Save Changes'}
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
