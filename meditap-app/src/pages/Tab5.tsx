import React, { useCallback, useEffect, useState } from 'react';
import './Tab5.css';
import { GlassDateInput } from '../components/GlassDatePicker';
import { useAuth } from '../contexts/AuthContext';
import { getMeditapRecordEditorRole } from '../config/meditap-roles';
import { getKeycloak } from '../config/keycloak';
import {
  clearMeditapIntakeElevation,
  isMeditapIntakeElevationValidForPatient,
  setMeditapIntakeElevationToken,
} from '../auth/staffElevationStorage';
import { staffElevateErrorMessage } from '../auth/staffElevateErrorMessage';
import {
  deleteTab5ChronicDisease,
  fetchTab5ChronicConditions,
  requestPatientIntakeStaffElevation,
  saveTab5ChronicCondition,
  type Tab5ChronicCondition,
  type Tab5ChronicHospitalization,
} from '../api';
import ConditionCard from '../chronic/ConditionCard';

const emptyHospitalization = (): Tab5ChronicHospitalization => ({
  admissionDate: '',
  dischargeDate: '',
  reason: '',
  facility: '',
  physician: '',
});

const emptyConditionDraft = (): Tab5ChronicCondition => ({
  apiId: null,
  diseaseId: '',
  name: '',
  icdCode: '',
  diagnosisDate: '',
  severity: '',
  preExisting: false,
  currentTreatment: '',
  hospitalizations: [],
});

const CHRONIC_SEVERITY_OPTIONS = [
  { value: '', label: 'Select severity' },
  { value: 'Mild', label: 'Mild' },
  { value: 'Moderate', label: 'Moderate' },
  { value: 'Severe', label: 'Severe' },
  { value: 'Unknown', label: 'Unknown / not documented' },
] as const;

const Tab5: React.FC = () => {
  const { username, hasRealmRole } = useAuth();
  const recordEditorRole = getMeditapRecordEditorRole();
  const hasEditorRealmRole = hasRealmRole(recordEditorRole);

  const [conditions, setConditions] = useState<Tab5ChronicCondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Tab5ChronicCondition | null>(null);
  const [isNewCondition, setIsNewCondition] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffSubmitting, setStaffSubmitting] = useState(false);
  const [staffModalError, setStaffModalError] = useState<string | null>(null);
  const [elevationNonce, setElevationNonce] = useState(0);
  const [pendingAfterStaff, setPendingAfterStaff] = useState<'add' | null>(null);
  const [deferOpenNewAfterStaff, setDeferOpenNewAfterStaff] = useState(false);

  const kcParsedTab5 = getKeycloak().tokenParsed as Record<string, unknown> | undefined;
  const patientSub =
    typeof kcParsedTab5?.sub === 'string' ? kcParsedTab5.sub : undefined;

  const canEdit =
    hasEditorRealmRole || isMeditapIntakeElevationValidForPatient(patientSub);

  const loadConditions = useCallback(async () => {
    setListError(null);
    setLoading(true);
    try {
      const rows = await fetchTab5ChronicConditions(username);
      setConditions(rows);
    } catch (e) {
      setListError(
        e instanceof Error ? e.message : 'Could not load chronic conditions.'
      );
      setConditions([]);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    void loadConditions();
  }, [loadConditions]);

  const beginNewConditionDraft = useCallback(() => {
    setIsNewCondition(true);
    setModalError(null);
    setDraft(emptyConditionDraft());
  }, []);

  useEffect(() => {
    if (deferOpenNewAfterStaff && canEdit) {
      setDeferOpenNewAfterStaff(false);
      beginNewConditionDraft();
    }
  }, [deferOpenNewAfterStaff, canEdit, beginNewConditionDraft]);

  const openManage = (c: Tab5ChronicCondition) => {
    setIsNewCondition(false);
    setModalError(null);
    setDraft({
      ...c,
      hospitalizations: c.hospitalizations.map((h) => ({ ...h })),
    });
  };

  const closeModal = () => {
    setDraft(null);
    setIsNewCondition(false);
    setModalError(null);
  };

  const handleAddNewClick = () => {
    if (!canEdit) {
      setPendingAfterStaff('add');
      setStaffModalError(null);
      setStaffModalOpen(true);
      return;
    }
    beginNewConditionDraft();
  };

  const updateDraft = (patch: Partial<Tab5ChronicCondition>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const updateHosp = (index: number, patch: Partial<Tab5ChronicHospitalization>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = [...prev.hospitalizations];
      next[index] = { ...next[index], ...patch };
      return { ...prev, hospitalizations: next };
    });
  };

  const addHospRow = () => {
    setDraft((prev) =>
      prev
        ? { ...prev, hospitalizations: [...prev.hospitalizations, emptyHospitalization()] }
        : prev
    );
  };

  const removeHospRow = (index: number) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = prev.hospitalizations.filter((_, i) => i !== index);
      return { ...prev, hospitalizations: next };
    });
  };

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
      if (pendingAfterStaff === 'add') {
        setPendingAfterStaff(null);
        setDeferOpenNewAfterStaff(true);
      }
    } catch (err) {
      setStaffModalError(staffElevateErrorMessage(err));
    } finally {
      setStaffSubmitting(false);
    }
  };

  const saveDraft = async () => {
    if (!draft || !canEdit) return;
    if (!(draft.name || '').trim()) {
      setModalError('Condition name is required.');
      return;
    }
    setModalError(null);
    setSaving(true);
    try {
      await saveTab5ChronicCondition(username, draft, isNewCondition);
      await loadConditions();
      closeModal();
    } catch (e) {
      setModalError(
        e instanceof Error ? e.message : 'Could not save chronic condition.'
      );
    } finally {
      setSaving(false);
    }
  };

  const removeCondition = async () => {
    if (!draft?.apiId || !canEdit) return;
    if (
      !window.confirm(
        'Delete this chronic condition from the patient record? This cannot be undone.'
      )
    ) {
      return;
    }
    setModalError(null);
    setSaving(true);
    try {
      await deleteTab5ChronicDisease(draft.apiId);
      await loadConditions();
      closeModal();
    } catch (e) {
      setModalError(
        e instanceof Error ? e.message : 'Could not delete chronic condition.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="chronic-conditions-container">
      <header className="chronic-conditions-header">
        <h1>
          <i className="fas fa-notes-medical" aria-hidden /> Chronic Conditions &amp;
          History
        </h1>
        <div className="chronic-conditions-header__actions">
          <button
            type="button"
            className="book-btn chronic-conditions-header__action-btn add-condition-btn"
            onClick={handleAddNewClick}
          >
            <i className="fas fa-plus" aria-hidden />
            Add New Condition
          </button>
          <a href="/tab1" className="book-btn chronic-conditions-header__action-btn">
            <i className="fas fa-arrow-left" aria-hidden />
            Go back to dashboard
          </a>
        </div>
      </header>

      <main className="chronic-conditions-main">
        {listError && (
          <p className="tab5-inline-error" role="alert">
            {listError}
          </p>
        )}
        {loading ? (
          <p className="tab5-loading">Loading conditions…</p>
        ) : conditions.length > 0 ? (
          <div className="conditions-list">
            {conditions.map((condition) => (
              <ConditionCard
                key={condition.apiId ?? condition.diseaseId}
                condition={condition}
                onManage={openManage}
              />
            ))}
          </div>
        ) : (
          <div className="no-conditions">
            <p>No chronic conditions recorded.</p>
            <button
              type="button"
              className="book-btn large-add-btn chronic-conditions-header__action-btn tab5-first-add-btn"
              onClick={handleAddNewClick}
            >
              Add First Condition
            </button>
          </div>
        )}
      </main>

      {draft && (
        <div
          className="cc-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cc-modal-title"
        >
          <button
            type="button"
            className="cc-modal__backdrop"
            aria-label="Close dialog"
            onClick={closeModal}
          />
          <div className="cc-modal__panel">
            <div className="cc-modal__header">
              <h2 id="cc-modal-title">
                {isNewCondition ? 'Add Chronic Condition' : 'Manage Chronic Condition'}
              </h2>
              <button type="button" className="cc-modal__close" onClick={closeModal}>
                <i className="fas fa-times" aria-hidden />
              </button>
            </div>

            <p className="cc-modal__sub">
              {isNewCondition
                ? 'Enter clinical details. Staff access is required to save.'
                : 'Review and update this condition. Staff access is required to edit.'}
            </p>

            {!canEdit && (
              <div className="cc-modal__lock-banner">
                <p>View-only. Use staff sign-in to add or change records.</p>
                <button
                  type="button"
                  className="book-btn"
                  onClick={() => {
                    setPendingAfterStaff(null);
                    setDeferOpenNewAfterStaff(false);
                    setStaffModalError(null);
                    setStaffModalOpen(true);
                  }}
                >
                  Staff sign-in
                </button>
              </div>
            )}

            {canEdit && (
              <div className="cc-modal__lock-banner cc-modal__lock-banner--active">
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

            {modalError && (
              <p className="tab5-inline-error" role="alert">
                {modalError}
              </p>
            )}

            <div className="cc-modal__form-grid">
              <div className="form-field cc-modal__field-wide">
                <label>Condition name</label>
                <input
                  value={draft.name}
                  onChange={(e) => updateDraft({ name: e.target.value })}
                  disabled={!canEdit}
                  placeholder="e.g. Type 2 Diabetes Mellitus"
                />
              </div>
              <div className="form-field">
                <label>ICD-10 code</label>
                <input
                  value={draft.icdCode}
                  onChange={(e) => updateDraft({ icdCode: e.target.value })}
                  disabled={!canEdit}
                  placeholder="e.g. E11.9"
                />
              </div>
              <div className="form-field">
                <label>Diagnosis date</label>
                <GlassDateInput
                  value={draft.diagnosisDate}
                  onChange={(iso) => updateDraft({ diagnosisDate: iso })}
                  max={new Date().toISOString().split('T')[0]}
                  disabled={!canEdit}
                />
              </div>
              <div className="form-field">
                <label>Severity</label>
                <select
                  value={draft.severity}
                  onChange={(e) => updateDraft({ severity: e.target.value })}
                  disabled={!canEdit}
                >
                  {CHRONIC_SEVERITY_OPTIONS.map((opt) => (
                    <option key={opt.value || 'x'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Pre-existing</label>
                <select
                  value={draft.preExisting ? 'yes' : 'no'}
                  onChange={(e) =>
                    updateDraft({ preExisting: e.target.value === 'yes' })
                  }
                  disabled={!canEdit}
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
              <div className="form-field cc-modal__field-wide">
                <label>Current treatment</label>
                <textarea
                  value={draft.currentTreatment}
                  onChange={(e) =>
                    updateDraft({ currentTreatment: e.target.value })
                  }
                  disabled={!canEdit}
                  placeholder="Medications, lifestyle, monitoring…"
                />
              </div>
            </div>

            <h3 className="cc-modal__section-title">Hospitalization history</h3>
            <p className="cc-modal__hint">
              Stored with this condition for display; backend uses the patient
              chronic-disease record&apos;s notes field (JSON block).
            </p>
            {draft.hospitalizations.map((h, index) => (
              <div key={index} className="cc-modal__hosp-block">
                <div className="cc-modal__form-grid">
                  <div className="form-field">
                    <label>Admission</label>
                    <GlassDateInput
                      value={h.admissionDate}
                      onChange={(iso) => updateHosp(index, { admissionDate: iso })}
                      max={new Date().toISOString().split('T')[0]}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="form-field">
                    <label>Discharge</label>
                    <GlassDateInput
                      value={h.dischargeDate}
                      onChange={(iso) => updateHosp(index, { dischargeDate: iso })}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="form-field cc-modal__field-wide">
                    <label>Reason</label>
                    <input
                      value={h.reason}
                      onChange={(e) =>
                        updateHosp(index, { reason: e.target.value })
                      }
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="form-field">
                    <label>Facility</label>
                    <input
                      value={h.facility}
                      onChange={(e) =>
                        updateHosp(index, { facility: e.target.value })
                      }
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="form-field">
                    <label>Physician</label>
                    <input
                      value={h.physician}
                      onChange={(e) =>
                        updateHosp(index, { physician: e.target.value })
                      }
                      disabled={!canEdit}
                    />
                  </div>
                </div>
                {canEdit && draft.hospitalizations.length > 0 && (
                  <button
                    type="button"
                    className="cc-modal__remove-hosp"
                    onClick={() => removeHospRow(index)}
                  >
                    Remove admission
                  </button>
                )}
              </div>
            ))}
            {canEdit && (
              <button
                type="button"
                className="cc-modal__add-hosp"
                onClick={addHospRow}
              >
                + Add hospitalization
              </button>
            )}

            <div className="cc-modal__actions">
              <button
                type="button"
                className="clear-button"
                onClick={closeModal}
                disabled={saving}
              >
                Close
              </button>
              {!isNewCondition && draft.apiId != null && (
                <button
                  type="button"
                  className="clear-button"
                  onClick={() => void removeCondition()}
                  disabled={!canEdit || saving}
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                className="save-button"
                disabled={!canEdit || saving}
                onClick={() => void saveDraft()}
              >
                {saving ? 'Saving…' : isNewCondition ? 'Create condition' : 'Save changes'}
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
          aria-labelledby="tab5-staff-modal-title"
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
            <h2 id="tab5-staff-modal-title">Staff sign-in</h2>
            <p className="tab14-staff-modal__hint">
              {pendingAfterStaff === 'add'
                ? 'Enter staff credentials to add a chronic condition.'
                : 'Enter staff credentials to unlock editing.'}
            </p>
            <form onSubmit={(e) => void submitStaffModal(e)}>
              <div className="form-field">
                <label htmlFor="tab5-staff-user">Staff username</label>
                <input
                  id="tab5-staff-user"
                  name="username"
                  autoComplete="username"
                  value={staffUsername}
                  onChange={(e) => setStaffUsername(e.target.value)}
                  disabled={staffSubmitting}
                />
              </div>
              <div className="form-field">
                <label htmlFor="tab5-staff-pass">Password</label>
                <input
                  id="tab5-staff-pass"
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

export default Tab5;
