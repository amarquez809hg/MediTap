import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './Tab6.css';
import './Tab4.css';
import './Tab14.css';
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
  createTab6Incident,
  fetchTab6Data,
  mapIncidentApiToTab6Record,
  requestPatientIntakeStaffElevation,
  updateTab6Incident,
  type HospitalApi,
  type Tab6IncidentPayload,
} from '../api';
import IncidentRecordCard from '../incidents/IncidentRecordCard';
import type { IncidentRecord } from '../incidents/incidentModel';
import StaffPresetField from '../components/StaffPresetField';
import {
  INCIDENT_DETAILS_PRESETS,
  INCIDENT_LOCATION_OPTIONS,
  INCIDENT_OUTCOME_PRESETS,
  INCIDENT_RECORD_ID_PRESETS,
  INCIDENT_SEVERITY_OPTIONS,
  INCIDENT_TYPE_OPTIONS,
  suggestIncidentRecordCode,
} from '../incidents/incidentFieldLibrary';

type IncidentDraft = {
  serverId?: string;
  patientId: string;
  hospitalId: string;
  recordCode: string;
  incidentType: string;
  date: string;
  severity: string;
  location: string;
  outcome: string;
  details: string;
};

function toIsoOccurredAt(dateYmd: string): string {
  const d = dateYmd.trim() || new Date().toISOString().slice(0, 10);
  return `${d}T12:00:00Z`;
}

function recordToDraft(rec: IncidentRecord, patientId: string): IncidentDraft {
  return {
    serverId: rec.serverId,
    patientId,
    hospitalId: rec.hospitalId || '',
    recordCode: rec.id,
    incidentType: rec.type,
    date: rec.date.length >= 10 ? rec.date.slice(0, 10) : rec.date,
    severity:
      rec.severity === '—' || !rec.severity.trim() ? 'Medium' : rec.severity,
    location: rec.location === '—' ? '' : rec.location,
    outcome: rec.outcome === '—' ? '' : rec.outcome,
    details: rec.details === '—' ? '' : rec.details,
  };
}

function emptyDraft(patientId: string, hospitalId: string): IncidentDraft {
  return {
    patientId,
    hospitalId,
    recordCode: '',
    incidentType: '',
    date: new Date().toISOString().slice(0, 10),
    severity: 'Medium',
    location: '',
    outcome: '',
    details: '',
  };
}

function draftToCreatePayload(d: IncidentDraft): Tab6IncidentPayload {
  return {
    patient: d.patientId,
    hospital: d.hospitalId,
    occurred_at: toIsoOccurredAt(d.date),
    incident_type: d.incidentType.trim(),
    summary: d.details.trim(),
    severity: d.severity.trim() || undefined,
    location: d.location.trim() || undefined,
    outcome: d.outcome.trim() || undefined,
    record_code: d.recordCode.trim() || undefined,
  };
}

function draftToPatchPayload(d: IncidentDraft): Partial<Tab6IncidentPayload> {
  return {
    hospital: d.hospitalId,
    occurred_at: toIsoOccurredAt(d.date),
    incident_type: d.incidentType.trim(),
    summary: d.details.trim(),
    severity: d.severity.trim() || undefined,
    location: d.location.trim() || undefined,
    outcome: d.outcome.trim() || undefined,
    record_code: d.recordCode.trim() || undefined,
  };
}

const Tab6: React.FC = () => {
  const { username, hasRealmRole } = useAuth();
  const recordEditorRole = getMeditapRecordEditorRole();
  const hasEditorRealmRole = hasRealmRole(recordEditorRole);

  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [hospitals, setHospitals] = useState<HospitalApi[]>([]);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [draft, setDraft] = useState<IncidentDraft | null>(null);
  const [isNewIncident, setIsNewIncident] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffSubmitting, setStaffSubmitting] = useState(false);
  const [staffModalError, setStaffModalError] = useState<string | null>(null);
  const [elevationNonce, setElevationNonce] = useState(0);
  const [pendingAfterStaff, setPendingAfterStaff] = useState<'new' | null>(
    null
  );
  const [deferOpenNewAfterStaff, setDeferOpenNewAfterStaff] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  const kcParsedTab6 = getAccessTokenPayload() ?? undefined;
  const patientSub =
    typeof kcParsedTab6?.sub === 'string' ? kcParsedTab6.sub : undefined;

  const canEditIncidents =
    hasEditorRealmRole || isMeditapIntakeElevationValidForPatient(patientSub);

  const defaultHospitalId = useMemo(
    () => hospitals[0]?.hospital_id || '',
    [hospitals]
  );

  const loadData = useCallback(async () => {
    setListError(null);
    setLoading(true);
    try {
      const { patientId: pid, hospitals: h, incidents: rows } =
        await fetchTab6Data(username);
      setPatientId(pid);
      setHospitals(h);
      setIncidents(rows.map(mapIncidentApiToTab6Record));
    } catch (e) {
      setListError(
        e instanceof Error ? e.message : 'Could not load incident records.'
      );
      setIncidents([]);
      setPatientId(null);
      setHospitals([]);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    void loadData();
  }, [loadData, refreshKey]);

  useEffect(() => {
    const onFocus = () => setRefreshKey((k) => k + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  useEffect(() => {
    if (deferOpenNewAfterStaff && canEditIncidents && patientId) {
      setDeferOpenNewAfterStaff(false);
      setIsNewIncident(true);
      setDraft(emptyDraft(patientId, defaultHospitalId));
      setSaveError(null);
    }
  }, [
    deferOpenNewAfterStaff,
    canEditIncidents,
    patientId,
    defaultHospitalId,
  ]);

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
      if (pendingAfterStaff === 'new') {
        setPendingAfterStaff(null);
        setDeferOpenNewAfterStaff(true);
      }
    } catch (err) {
      setStaffModalError(staffElevateErrorMessage(err));
    } finally {
      setStaffSubmitting(false);
    }
  };

  const handleLogNewIncident = () => {
    if (!patientId) return;
    if (!canEditIncidents) {
      setPendingAfterStaff('new');
      setStaffModalError(null);
      setStaffModalOpen(true);
      return;
    }
    setIsNewIncident(true);
    setDraft(emptyDraft(patientId, defaultHospitalId));
    setSaveError(null);
  };

  useEffect(() => {
    if (!consumeOpenAddEntry('/tab6')) return;
    if (canEditIncidents && patientId) {
      setIsNewIncident(true);
      setDraft(emptyDraft(patientId, defaultHospitalId));
      setSaveError(null);
    } else {
      handleLogNewIncident();
    }
  }, [canEditIncidents, patientId, defaultHospitalId, elevationNonce]);

  const openManageModal = (rec: IncidentRecord) => {
    if (!patientId) return;
    setIsNewIncident(false);
    setDraft(recordToDraft(rec, patientId));
    setSaveError(null);
  };

  const closeModal = () => {
    setDraft(null);
    setIsNewIncident(false);
    setSaveError(null);
    setPendingAfterStaff(null);
  };

  const updateDraft = <K extends keyof IncidentDraft>(
    field: K,
    value: IncidentDraft[K]
  ) => {
    setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const saveIncident = async () => {
    if (!draft || !canEditIncidents) return;
    if (!draft.hospitalId.trim()) {
      setSaveError('Select a facility / hospital.');
      return;
    }
    if (!draft.incidentType.trim() || !draft.details.trim()) {
      setSaveError('Incident type and detailed summary are required.');
      return;
    }
    setSaveError(null);
    setSaving(true);
    try {
      if (isNewIncident || !draft.serverId) {
        await createTab6Incident(draftToCreatePayload(draft));
      } else {
        await updateTab6Incident(draft.serverId, draftToPatchPayload(draft));
      }
      await loadData();
      closeModal();
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : 'Could not save incident.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="incident-records-container">
      <header className="incident-records-header">
        <div className="incident-records-header__title-block">
          <h1>
            <i className="fas fa-clipboard-list"></i> Incident Records
          </h1>
          {!canEditIncidents && (
            <p className="record-tab-readonly-hint">
              You can review incident history here. Logging or changing incidents requires staff
              sign-in (record editor role).
            </p>
          )}
        </div>
        <div className="incident-records-header__actions">
          <button
            type="button"
            className="book-btn incident-records-header__action-btn"
            onClick={handleLogNewIncident}
            disabled={!patientId && !loading}
          >
            <i className="fas fa-plus"></i> Log New Incident
          </button>
          <a
            href="/tab1"
            className="book-btn incident-records-header__action-btn"
          >
            <i className="fas fa-arrow-left"></i>
            Go back to dashboard
          </a>
        </div>
      </header>

      {listError && (
        <p className="tab6-inline-error" role="alert">
          {listError}
        </p>
      )}

      {!patientId && !loading && !listError && (
        <p className="tab6-inline-hint">
          No patient record is linked to this account yet. Add patient
          information first; then incident history will load here.
        </p>
      )}

      <main className="incident-records-main">
        {loading ? (
          <p className="tab6-inline-hint">Loading incidents…</p>
        ) : incidents.length > 0 ? (
          <div className="incidents-list">
            {incidents.map((incident) => (
              <IncidentRecordCard
                key={incident.serverId || incident.id}
                incident={incident}
                onManage={openManageModal}
              />
            ))}
          </div>
        ) : (
          <div className="record-tab-empty">
            <p>No incident records found for this patient.</p>
            <button
              type="button"
              className="book-btn record-tab-empty-cta"
              onClick={handleLogNewIncident}
              disabled={!patientId}
            >
              <i className="fas fa-plus" aria-hidden />
              Log New Incident
            </button>
          </div>
        )}
      </main>

      {draft && (
        <div
          className="appt-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="incident-modal-title"
        >
          <button
            type="button"
            className="appt-modal__backdrop"
            aria-label="Close dialog"
            onClick={closeModal}
          />
          <div className="appt-modal__panel">
            <div className="appt-modal__header">
              <h2 id="incident-modal-title">
                {isNewIncident ? 'Log New Incident' : 'Incident Management'}
              </h2>
              <button
                type="button"
                className="appt-modal__close"
                onClick={closeModal}
              >
                <i className="fas fa-times" aria-hidden />
              </button>
            </div>

            <p className="appt-modal__sub">
              {isNewIncident
                ? 'Staff can create an incident tied to this patient. Others can review details in read-only mode.'
                : 'Review or update this incident. Editing requires staff access.'}
            </p>

            {!canEditIncidents && (
              <div className="appt-modal__lock-banner">
                <p>
                  {isNewIncident
                    ? 'Sign in with staff credentials to log a new incident.'
                    : 'This incident is view-only until staff signs in.'}
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

            {canEditIncidents && (
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
              <StaffPresetField
                label="Record ID (display)"
                value={draft.recordCode}
                options={INCIDENT_RECORD_ID_PRESETS}
                onChange={(v) => updateDraft('recordCode', v)}
                onLibraryPick={(v) => {
                  if (v === 'Auto-generate on save') {
                    updateDraft(
                      'recordCode',
                      suggestIncidentRecordCode(incidents.length + 1)
                    );
                  } else {
                    updateDraft('recordCode', v);
                  }
                }}
                disabled={!canEditIncidents}
                inputPlaceholder="e.g. I-2024-005"
              />
              <div className="form-field">
                <label htmlFor="inc-severity">Severity</label>
                <select
                  id="inc-severity"
                  value={draft.severity}
                  onChange={(e) => updateDraft('severity', e.target.value)}
                  disabled={!canEditIncidents}
                >
                  {INCIDENT_SEVERITY_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <StaffPresetField
                className="appt-modal__field-wide"
                label="Incident type"
                value={draft.incidentType}
                options={INCIDENT_TYPE_OPTIONS}
                onChange={(v) => updateDraft('incidentType', v)}
                disabled={!canEditIncidents}
                inputPlaceholder="Describe the type of incident"
              />
              <div className="form-field">
                <label htmlFor="inc-date">Date</label>
                <input
                  id="inc-date"
                  type="date"
                  value={draft.date}
                  onChange={(e) => updateDraft('date', e.target.value)}
                  disabled={!canEditIncidents}
                />
              </div>
              <div className="form-field appt-modal__field-wide">
                <label htmlFor="inc-hospital">Facility / hospital</label>
                <select
                  id="inc-hospital"
                  value={draft.hospitalId}
                  onChange={(e) => updateDraft('hospitalId', e.target.value)}
                  disabled={!canEditIncidents}
                >
                  <option value="">Select hospital</option>
                  {hospitals.map((h) => (
                    <option key={h.hospital_id} value={h.hospital_id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
              <StaffPresetField
                className="appt-modal__field-wide"
                label="Location"
                value={draft.location}
                options={INCIDENT_LOCATION_OPTIONS}
                onChange={(v) => updateDraft('location', v)}
                disabled={!canEditIncidents}
                inputPlaceholder="Where the incident occurred"
              />
              <StaffPresetField
                className="appt-modal__field-wide"
                label="Outcome & treatment"
                value={draft.outcome}
                options={INCIDENT_OUTCOME_PRESETS}
                onChange={(v) => updateDraft('outcome', v)}
                disabled={!canEditIncidents}
                multiline
                inputPlaceholder="Disposition and treatment provided"
              />
              <StaffPresetField
                className="appt-modal__field-wide"
                label="Detailed summary"
                value={draft.details}
                options={INCIDENT_DETAILS_PRESETS}
                onChange={(v) => updateDraft('details', v)}
                disabled={!canEditIncidents}
                multiline
                inputPlaceholder="Narrative for the incident record"
              />
            </div>

            {saveError && (
              <p className="tab6-inline-error" style={{ marginTop: 12 }}>
                {saveError}
              </p>
            )}

            <div className="appt-modal__actions">
              <button
                type="button"
                className="clear-button"
                onClick={closeModal}
              >
                Close
              </button>
              <button
                type="button"
                className="save-button"
                disabled={!canEditIncidents || saving}
                onClick={() => void saveIncident()}
              >
                {saving
                  ? 'Saving…'
                  : isNewIncident
                    ? 'Create incident'
                    : 'Save changes'}
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
          aria-labelledby="tab6-staff-modal-title"
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
            <h2 id="tab6-staff-modal-title">Staff sign-in</h2>
            <p className="tab14-staff-modal__hint">
              {pendingAfterStaff === 'new'
                ? 'Enter staff credentials to log a new incident.'
                : 'Enter staff credentials to unlock incident editing.'}
            </p>
            <form onSubmit={(e) => void submitStaffModal(e)}>
              <div className="form-field">
                <label htmlFor="tab6-staff-user">Staff username</label>
                <input
                  id="tab6-staff-user"
                  name="username"
                  autoComplete="username"
                  value={staffUsername}
                  onChange={(e) => setStaffUsername(e.target.value)}
                  disabled={staffSubmitting}
                />
              </div>
              <div className="form-field">
                <label htmlFor="tab6-staff-pass">Password</label>
                <input
                  id="tab6-staff-pass"
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

export default Tab6;
