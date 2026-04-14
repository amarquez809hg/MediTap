import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IonContent, IonPage, IonSpinner } from '@ionic/react';
import './Tab7.css';
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
  createPatientLabPanel,
  deletePatientLabPanel,
  ensurePatientForCurrentSession,
  fetchPatientLabPanels,
  requestPatientIntakeStaffElevation,
  updatePatientLabPanel,
} from '../api';
import LabResultCard from '../labResults/LabResultCard';
import type { LabResultLineItem, LabResultRow } from '../labResults/labResultModel';
import { mapPatientLabPanelToRow } from '../labResults/labResultModel';
import {
  applyDatePreset,
  COLLECTED_DATE_PRESETS,
  CRITICAL_FLAG_OPTIONS,
  CUSTOM_SELECT_VALUE,
  DISPLAY_CODE_PRESETS,
  findAnalyteTemplate,
  GENERIC_VALUE_PRESETS,
  getAnalytesForPanel,
  INTERPRETATION_OPTIONS,
  LAB_PANEL_OPTIONS,
  LAB_STATUS_OPTIONS,
  LAB_UNIT_OPTIONS,
  MARK_AS_NEW_OPTIONS,
  REFERENCE_RANGE_CUSTOM,
  REFERENCE_RANGE_PRESETS,
  VALUE_PRESET_CUSTOM,
} from '../labResults/labResultFieldCatalog';

/** Placeholder so the analyte/unit “Other” select stays on the custom option before the user types. */
const OTHER_FIELD_PLACEHOLDER = '\u00a0';

type LabPanelDraft = {
  serverId?: string;
  displayCode: string;
  testName: string;
  collectedOn: string;
  status: string;
  isNew: boolean;
  components: LabResultLineItem[];
};

type PendingLabOpen = null | { kind: 'new' } | { kind: 'edit'; row: LabResultRow };

function emptyDraft(): LabPanelDraft {
  return {
    displayCode: '',
    testName: '',
    collectedOn: new Date().toISOString().slice(0, 10),
    status: 'Reviewed',
    isNew: true,
    components: [],
  };
}

function rowToDraft(row: LabResultRow): LabPanelDraft {
  return {
    serverId: row.serverId,
    displayCode: (row.displayCode ?? row.id ?? '').trim(),
    testName: row.testName,
    collectedOn: row.date,
    status: row.status,
    isNew: row.isNew,
    components: row.results.map((r) => ({ ...r })),
  };
}

function draftToRow(d: LabPanelDraft): LabResultRow {
  const id =
    d.displayCode.trim() ||
    (d.serverId ? `L-${d.serverId.replace(/-/g, '').slice(0, 8).toUpperCase()}` : 'new');
  return {
    id,
    serverId: d.serverId,
    displayCode: d.displayCode.trim() || null,
    testName: d.testName,
    date: d.collectedOn,
    status: d.status,
    isNew: d.isNew,
    results: d.components.map((c) => ({ ...c })),
  };
}

const Tab7: React.FC = () => {
  const { username, hasRealmRole } = useAuth();
  const recordEditorRole = getMeditapRecordEditorRole();
  const hasEditorRealmRole = hasRealmRole(recordEditorRole);

  const [rows, setRows] = useState<LabResultRow[]>([]);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [draft, setDraft] = useState<LabPanelDraft | null>(null);
  const [isNewPanel, setIsNewPanel] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffSubmitting, setStaffSubmitting] = useState(false);
  const [staffModalError, setStaffModalError] = useState<string | null>(null);
  const [pendingLabOpen, setPendingLabOpen] = useState<PendingLabOpen>(null);
  const [elevationNonce, setElevationNonce] = useState(0);
  const [dateQuickKey, setDateQuickKey] = useState('');
  /** Bumped only when opening the lab modal so we sync preset-vs-custom picks without clobbering "Other". */
  const [labDraftSession, setLabDraftSession] = useState(0);
  const [displayCodePickCustom, setDisplayCodePickCustom] = useState(false);
  const [panelPickCustom, setPanelPickCustom] = useState(false);

  // Must read Keycloak `sub` every render — memoizing on [username] misses token refresh
  // and leaves elevation checks failing (Manage hidden though X-Meditap-Elevation is valid).
  const kcParsed = getKeycloak().tokenParsed as Record<string, unknown> | undefined;
  const patientSub = typeof kcParsed?.sub === 'string' ? kcParsed.sub : undefined;

  // Re-check elevation every render — JWT expiry is time-based.
  const canEditLabs =
    hasEditorRealmRole || isMeditapIntakeElevationValidForPatient(patientSub);

  const loadPanels = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const { patientId: pid, panels } = await fetchPatientLabPanels(username);
      setPatientId(pid);
      setRows(panels.map(mapPatientLabPanelToRow));
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Could not load lab results.');
      setRows([]);
      setPatientId(null);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    void loadPanels();
  }, [loadPanels]);

  useEffect(() => {
    if (!draft) return;
    setDisplayCodePickCustom(!DISPLAY_CODE_PRESETS.includes(draft.displayCode));
    setPanelPickCustom(
      draft.testName.trim() !== '' &&
        !(LAB_PANEL_OPTIONS as readonly string[]).includes(draft.testName)
    );
  }, [labDraftSession]);

  const closeDraft = () => {
    setDraft(null);
    setIsNewPanel(false);
    setSaveError(null);
    setDisplayCodePickCustom(false);
    setPanelPickCustom(false);
  };

  const beginNewPanel = useCallback(() => {
    setIsNewPanel(true);
    setDraft(emptyDraft());
    setSaveError(null);
    setLabDraftSession((n) => n + 1);
  }, []);

  const openEditPanel = useCallback((row: LabResultRow) => {
    setIsNewPanel(false);
    setDraft(rowToDraft(row));
    setSaveError(null);
    setLabDraftSession((n) => n + 1);
  }, []);

  const handleAddLabResult = () => {
    if (!canEditLabs) {
      setPendingLabOpen({ kind: 'new' });
      setStaffModalError(null);
      setStaffModalOpen(true);
      return;
    }
    beginNewPanel();
  };

  const handleManageRow = (row: LabResultRow) => {
    if (!canEditLabs) {
      setPendingLabOpen({ kind: 'edit', row });
      setStaffModalError(null);
      setStaffModalOpen(true);
      return;
    }
    openEditPanel(row);
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
      const pending = pendingLabOpen;
      setPendingLabOpen(null);
      if (pending?.kind === 'new') {
        beginNewPanel();
      } else if (pending?.kind === 'edit') {
        openEditPanel(pending.row);
      }
    } catch (err) {
      setStaffModalError(staffElevateErrorMessage(err));
    } finally {
      setStaffSubmitting(false);
    }
  };

  const updateDraftField = <K extends keyof LabPanelDraft>(key: K, value: LabPanelDraft[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  };

  const addComponentRow = () => {
    setDraft((d) =>
      d
        ? {
            ...d,
            components: [
              ...d.components,
              {
                name: '',
                value: 0,
                unit: '',
                range: '',
                critical: false,
              },
            ],
          }
        : d
    );
  };

  const updateComponent = (index: number, patch: Partial<LabResultLineItem>) => {
    setDraft((d) => {
      if (!d) return d;
      const next = [...d.components];
      next[index] = { ...next[index], ...patch };
      return { ...d, components: next };
    });
  };

  const removeComponent = (index: number) => {
    setDraft((d) =>
      d ? { ...d, components: d.components.filter((_, i) => i !== index) } : d
    );
  };

  const saveDraft = async () => {
    if (!draft) return;

    let pid = patientId;
    if (!pid) {
      const ensured = await ensurePatientForCurrentSession(username);
      if (ensured) {
        pid = ensured.patient_id;
        setPatientId(pid);
      }
    }
    if (!pid) {
      setSaveError(
        'Could not create or load your patient record. Stay signed in, ensure the API is reachable, or complete your profile on the patient information tab.'
      );
      return;
    }
    if (!canEditLabs) {
      setSaveError('Only staff (record editor role or staff sign-in) can save lab changes.');
      return;
    }
    if (!draft.testName.trim()) {
      setSaveError('Panel / test name is required.');
      return;
    }
    if (!draft.collectedOn.trim()) {
      setSaveError('Collection date is required.');
      return;
    }
    const normalized = draft.components.map((c) => ({
      name: c.name.trim(),
      value: Number(c.value),
      unit: c.unit.trim(),
      range: c.range.trim(),
      critical: !!c.critical,
      ...(c.interpretation?.trim()
        ? { interpretation: c.interpretation.trim() }
        : {}),
    }));
    for (let i = 0; i < normalized.length; i++) {
      const c = normalized[i];
      if (!c.name || Number.isNaN(c.value)) {
        setSaveError(`Component ${i + 1}: name and numeric value are required.`);
        return;
      }
    }
    setSaveError(null);
    setSaving(true);
    try {
      const body = {
        patient: pid,
        display_code: draft.displayCode.trim() || null,
        test_name: draft.testName.trim(),
        collected_on: draft.collectedOn,
        status: draft.status,
        is_new: draft.isNew,
        components: normalized,
      };
      if (isNewPanel) {
        await createPatientLabPanel(body);
      } else if (draft.serverId) {
        await updatePatientLabPanel(draft.serverId, body);
      } else {
        setSaveError('Missing panel id for update.');
        return;
      }
      await loadPanels();
      closeDraft();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save failed.';
      if (msg.includes('403')) {
        setSaveError(
          'Permission denied. If you used staff sign-in here, it may have expired—open staff sign-in again. Otherwise use a Keycloak account with the record editor realm role, or a Django superuser on the API.'
        );
      } else if (msg.includes('500')) {
        setSaveError(
          'Server error. If you just updated the app, run: docker compose exec backend python manage.py migrate'
        );
      } else {
        setSaveError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const removePanel = async () => {
    if (!draft?.serverId || isNewPanel || !canEditLabs) return;
    if (!window.confirm('Delete this lab panel from the patient record?')) return;
    setSaving(true);
    setSaveError(null);
    try {
      await deletePatientLabPanel(draft.serverId);
      await loadPanels();
      closeDraft();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Delete failed.';
      if (msg.includes('403')) {
        setSaveError('Permission denied. Staff sign-in required to delete.');
      } else {
        setSaveError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const staffHint =
    pendingLabOpen?.kind === 'new'
      ? 'Enter staff credentials to add a lab result.'
      : pendingLabOpen?.kind === 'edit'
        ? 'Enter staff credentials to edit lab results.'
        : 'Enter staff credentials to unlock lab editing.';

  const analyteChoices = useMemo(
    () => (draft ? getAnalytesForPanel(draft.testName) : []),
    [draft, draft?.testName]
  );

  const mapCatalogUnitToStored = (u: string) => (u === '(none)' ? '' : u);

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className="lab-results-container">
          <header className="lab-results-header">
            <div className="lab-results-header__title-block">
              <h1>
                <i className="fas fa-vial" aria-hidden />
                Lab Results
              </h1>
              {!canEditLabs && (
                <p className="lab-results-readonly-hint">
                  You can review your results here. Adding or changing panels requires staff
                  sign-in (record editor role).
                </p>
              )}
            </div>
            <div className="lab-results-header__actions">
              <button
                type="button"
                className="book-btn lab-results-header__action-btn"
                onClick={handleAddLabResult}
              >
                <i className="fas fa-plus" aria-hidden />
                Add Lab Result
              </button>
              <a href="/tab1" className="book-btn lab-results-header__action-btn">
                <i className="fas fa-arrow-left" aria-hidden />
                Go back to dashboard
              </a>
            </div>
          </header>

          {listError && (
            <p className="lab-results-banner lab-results-banner--error" role="alert">
              {listError}
            </p>
          )}

          <main className="lab-results-main">
            {loading ? (
              <div className="lab-results-loading">
                <IonSpinner name="crescent" />
                <p>Loading lab results…</p>
              </div>
            ) : rows.length > 0 ? (
              <div className="results-list">
                {rows.map((result) => (
                  <LabResultCard
                    key={result.serverId || result.id}
                    result={result}
                    canManage={canEditLabs}
                    onManage={() => handleManageRow(result)}
                  />
                ))}
              </div>
            ) : (
              <div className="lab-no-results">
                <p>No lab reports found in your record.</p>
                <button
                  type="button"
                  className="book-btn lab-results-empty-cta"
                  onClick={handleAddLabResult}
                >
                  <i className="fas fa-plus" aria-hidden />
                  Add Lab Result
                </button>
              </div>
            )}
          </main>
        </div>

        {draft && (
          <div className="appt-modal" role="dialog" aria-modal="true" aria-labelledby="lab-modal-title">
            <button
              type="button"
              className="appt-modal__backdrop"
              aria-label="Close lab panel dialog"
              onClick={closeDraft}
            />
            <div className="appt-modal__panel lab-panel-modal">
              <div className="appt-modal__header">
                <h2 id="lab-modal-title">
                  {isNewPanel ? 'Add Lab Result' : 'Manage Lab Result'}
                </h2>
                <button type="button" className="appt-modal__close" onClick={closeDraft}>
                  <i className="fas fa-times" aria-hidden />
                </button>
              </div>

              <p className="appt-modal__sub">
                {isNewPanel
                  ? 'Enter panel details and components. Saving requires staff access.'
                  : 'Update this panel. Saving requires staff access.'}
              </p>

              {!canEditLabs && (
                <div className="appt-modal__lock-banner">
                  <p>Sign in with staff credentials to add or change lab data.</p>
                  <button
                    type="button"
                    className="book-btn"
                    onClick={() => {
                      setStaffModalError(null);
                      setPendingLabOpen(
                        isNewPanel ? { kind: 'new' } : { kind: 'edit', row: draftToRow(draft) }
                      );
                      setStaffModalOpen(true);
                    }}
                  >
                    Staff sign-in
                  </button>
                </div>
              )}

              {canEditLabs && (
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
                <div className="form-field appt-modal__field-wide">
                  <label htmlFor="lab-display-code-select">Display code (optional)</label>
                  <select
                    id="lab-display-code-select"
                    className="lab-modal-select"
                    value={
                      displayCodePickCustom
                        ? CUSTOM_SELECT_VALUE
                        : DISPLAY_CODE_PRESETS.includes(draft.displayCode)
                          ? draft.displayCode
                          : CUSTOM_SELECT_VALUE
                    }
                    disabled={!canEditLabs}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === CUSTOM_SELECT_VALUE) {
                        setDisplayCodePickCustom(true);
                        updateDraftField('displayCode', '');
                      } else {
                        setDisplayCodePickCustom(false);
                        updateDraftField('displayCode', v);
                      }
                    }}
                  >
                    {DISPLAY_CODE_PRESETS.map((code) => (
                      <option key={code || 'blank'} value={code}>
                        {code || '(no display code)'}
                      </option>
                    ))}
                    <option value={CUSTOM_SELECT_VALUE}>Other (type below)…</option>
                  </select>
                  {(displayCodePickCustom ||
                    !DISPLAY_CODE_PRESETS.includes(draft.displayCode)) && (
                    <input
                      id="lab-display-code"
                      className="lab-modal-select-follow"
                      value={draft.displayCode}
                      onChange={(e) => updateDraftField('displayCode', e.target.value)}
                      disabled={!canEditLabs}
                      placeholder="e.g. L-2024-099"
                    />
                  )}
                </div>
                <div className="form-field appt-modal__field-wide">
                  <label htmlFor="lab-test-name-select">Panel / test name</label>
                  <select
                    id="lab-test-name-select"
                    className="lab-modal-select"
                    value={
                      panelPickCustom
                        ? CUSTOM_SELECT_VALUE
                        : (LAB_PANEL_OPTIONS as readonly string[]).includes(draft.testName)
                          ? draft.testName
                          : ''
                    }
                    disabled={!canEditLabs}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === CUSTOM_SELECT_VALUE) {
                        setPanelPickCustom(true);
                        updateDraftField('testName', '');
                      } else if (v === '') {
                        setPanelPickCustom(false);
                        updateDraftField('testName', '');
                      } else {
                        setPanelPickCustom(false);
                        updateDraftField('testName', v);
                      }
                    }}
                  >
                    <option value="">— Select common panel —</option>
                    {LAB_PANEL_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                    <option value={CUSTOM_SELECT_VALUE}>Other panel (type below)…</option>
                  </select>
                  {(panelPickCustom ||
                    (draft.testName.trim() !== '' &&
                      !(LAB_PANEL_OPTIONS as readonly string[]).includes(draft.testName))) && (
                    <input
                      id="lab-test-name"
                      className="lab-modal-select-follow"
                      value={draft.testName}
                      onChange={(e) => updateDraftField('testName', e.target.value)}
                      disabled={!canEditLabs}
                      placeholder="Type full panel name"
                    />
                  )}
                </div>
                <div className="form-field">
                  <label htmlFor="lab-collected">Collected date</label>
                  <input
                    id="lab-collected"
                    type="date"
                    value={draft.collectedOn}
                    onChange={(e) => updateDraftField('collectedOn', e.target.value)}
                    disabled={!canEditLabs}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="lab-date-quick">Quick date</label>
                  <select
                    id="lab-date-quick"
                    className="lab-modal-select"
                    value={dateQuickKey}
                    disabled={!canEditLabs}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDateQuickKey('');
                      const next = applyDatePreset(v);
                      if (next) updateDraftField('collectedOn', next);
                    }}
                  >
                    {COLLECTED_DATE_PRESETS.map((row) => (
                      <option key={row.value} value={row.value}>
                        {row.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="lab-status">Status</label>
                  <select
                    id="lab-status"
                    className="lab-modal-select"
                    value={draft.status}
                    onChange={(e) => updateDraftField('status', e.target.value)}
                    disabled={!canEditLabs}
                  >
                    {LAB_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="lab-is-new-select">Mark as new for patient</label>
                  <select
                    id="lab-is-new-select"
                    className="lab-modal-select"
                    value={draft.isNew ? 'yes' : 'no'}
                    onChange={(e) => updateDraftField('isNew', e.target.value === 'yes')}
                    disabled={!canEditLabs}
                  >
                    {MARK_AS_NEW_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="lab-components-editor">
                <div className="lab-components-editor__head">
                  <h3>Test components</h3>
                  <button
                    type="button"
                    className="book-btn lab-components-editor__add"
                    disabled={!canEditLabs}
                    onClick={addComponentRow}
                  >
                    <i className="fas fa-plus" aria-hidden />
                    Add component
                  </button>
                </div>
                {draft.components.length === 0 ? (
                  <p className="lab-components-editor__empty">
                    No line items yet. Use &quot;Add component&quot; or leave empty for a
                    pending panel.
                  </p>
                ) : (
                  draft.components.map((c, i) => {
                    const rowTemplate =
                      analyteChoices.find((a) => a.name === c.name) ?? findAnalyteTemplate(c.name);
                    const valuePresets =
                      rowTemplate?.valuePresets?.length && rowTemplate.valuePresets.length > 0
                        ? rowTemplate.valuePresets
                        : GENERIC_VALUE_PRESETS;
                    const valuePresetHit = valuePresets.some((p) => p === c.value);
                    const valueSelectVal = valuePresetHit
                      ? String(c.value)
                      : VALUE_PRESET_CUSTOM;
                    const nameHit = analyteChoices.some((a) => a.name === c.name);
                    const nameOtherMode =
                      c.name === OTHER_FIELD_PLACEHOLDER ||
                      (c.name.trim() !== '' && !nameHit);
                    const nameSelectVal = nameOtherMode
                      ? CUSTOM_SELECT_VALUE
                      : nameHit
                        ? c.name
                        : '';
                    const unitOpts = LAB_UNIT_OPTIONS as readonly string[];
                    const unitSelectVal =
                      c.unit === OTHER_FIELD_PLACEHOLDER
                        ? CUSTOM_SELECT_VALUE
                        : c.unit === ''
                          ? '(none)'
                          : unitOpts.includes(c.unit)
                            ? c.unit
                            : CUSTOM_SELECT_VALUE;
                    const rangeOpts = REFERENCE_RANGE_PRESETS as readonly string[];
                    const rangeSelectVal = rangeOpts.includes(c.range)
                      ? c.range
                      : REFERENCE_RANGE_CUSTOM;
                    return (
                      <div key={i} className="lab-component-row">
                        <div className="form-field appt-modal__field-wide">
                          <label htmlFor={`lab-comp-name-${i}`}>Name</label>
                          <select
                            id={`lab-comp-name-${i}`}
                            className="lab-modal-select"
                            value={nameSelectVal}
                            disabled={!canEditLabs}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === '') {
                                updateComponent(i, { name: '' });
                                return;
                              }
                              if (v === CUSTOM_SELECT_VALUE) {
                                updateComponent(i, { name: OTHER_FIELD_PLACEHOLDER });
                                return;
                              }
                              const t =
                                analyteChoices.find((a) => a.name === v) ??
                                findAnalyteTemplate(v);
                              if (t) {
                                const nextVal =
                                  t.valuePresets && t.valuePresets.length > 0
                                    ? t.valuePresets[0]
                                    : c.value;
                                updateComponent(i, {
                                  name: v,
                                  unit: mapCatalogUnitToStored(t.unit),
                                  range: t.range,
                                  value: nextVal,
                                });
                              } else {
                                updateComponent(i, { name: v });
                              }
                            }}
                          >
                            <option value="">— Select analyte —</option>
                            {analyteChoices.map((a) => (
                              <option key={a.name} value={a.name}>
                                {a.name}
                              </option>
                            ))}
                            <option value={CUSTOM_SELECT_VALUE}>Other (type below)…</option>
                          </select>
                          {nameSelectVal === CUSTOM_SELECT_VALUE && (
                            <input
                              id={`lab-comp-name-custom-${i}`}
                              className="lab-modal-select-follow"
                              value={c.name === OTHER_FIELD_PLACEHOLDER ? '' : c.name}
                              onChange={(e) => updateComponent(i, { name: e.target.value })}
                              disabled={!canEditLabs}
                              placeholder="Analyte name"
                            />
                          )}
                        </div>
                        <div className="form-field">
                          <label htmlFor={`lab-comp-value-${i}`}>Value</label>
                          <select
                            id={`lab-comp-value-${i}`}
                            className="lab-modal-select"
                            value={valueSelectVal}
                            disabled={!canEditLabs}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === VALUE_PRESET_CUSTOM) return;
                              const n = parseFloat(v);
                              updateComponent(i, { value: Number.isNaN(n) ? 0 : n });
                            }}
                          >
                            {valuePresets.map((p, pi) => (
                              <option key={`${i}-${p}-${pi}`} value={String(p)}>
                                {p}
                              </option>
                            ))}
                            <option value={VALUE_PRESET_CUSTOM}>Other value…</option>
                          </select>
                          {valueSelectVal === VALUE_PRESET_CUSTOM && (
                            <input
                              className="lab-modal-select-follow"
                              type="number"
                              step="any"
                              value={Number.isNaN(c.value) ? '' : c.value}
                              onChange={(e) =>
                                updateComponent(i, {
                                  value: parseFloat(e.target.value) || 0,
                                })
                              }
                              disabled={!canEditLabs}
                            />
                          )}
                        </div>
                        <div className="form-field">
                          <label htmlFor={`lab-comp-unit-${i}`}>Unit</label>
                          <select
                            id={`lab-comp-unit-${i}`}
                            className="lab-modal-select"
                            value={unitSelectVal}
                            disabled={!canEditLabs}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === CUSTOM_SELECT_VALUE) {
                                updateComponent(i, { unit: OTHER_FIELD_PLACEHOLDER });
                                return;
                              }
                              updateComponent(i, { unit: mapCatalogUnitToStored(v) });
                            }}
                          >
                            {LAB_UNIT_OPTIONS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                            <option value={CUSTOM_SELECT_VALUE}>Other (type below)…</option>
                          </select>
                          {unitSelectVal === CUSTOM_SELECT_VALUE && (
                            <input
                              className="lab-modal-select-follow"
                              value={c.unit === OTHER_FIELD_PLACEHOLDER ? '' : c.unit}
                              onChange={(e) => updateComponent(i, { unit: e.target.value })}
                              disabled={!canEditLabs}
                              placeholder="Unit"
                            />
                          )}
                        </div>
                        <div className="form-field appt-modal__field-wide">
                          <label htmlFor={`lab-comp-range-${i}`}>Reference range (display)</label>
                          <select
                            id={`lab-comp-range-${i}`}
                            className="lab-modal-select"
                            value={rangeSelectVal}
                            disabled={!canEditLabs}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === REFERENCE_RANGE_CUSTOM) {
                                const presetOnly = REFERENCE_RANGE_PRESETS.filter(
                                  (x) => x !== REFERENCE_RANGE_CUSTOM
                                ) as readonly string[];
                                updateComponent(i, {
                                  range: (presetOnly as readonly string[]).includes(c.range)
                                    ? ''
                                    : c.range,
                                });
                                return;
                              }
                              updateComponent(i, { range: v });
                            }}
                          >
                            {REFERENCE_RANGE_PRESETS.map((r) => (
                              <option key={r} value={r}>
                                {r === REFERENCE_RANGE_CUSTOM ? 'Other range (type below)…' : r}
                              </option>
                            ))}
                          </select>
                          {rangeSelectVal === REFERENCE_RANGE_CUSTOM && (
                            <input
                              className="lab-modal-select-follow"
                              value={c.range}
                              onChange={(e) => updateComponent(i, { range: e.target.value })}
                              disabled={!canEditLabs}
                              placeholder="e.g. 13.5–17.5"
                            />
                          )}
                        </div>
                        <div className="form-field">
                          <label htmlFor={`lab-comp-critical-${i}`}>Flagged / critical</label>
                          <select
                            id={`lab-comp-critical-${i}`}
                            className="lab-modal-select"
                            value={c.critical ? 'yes' : 'no'}
                            disabled={!canEditLabs}
                            onChange={(e) =>
                              updateComponent(i, { critical: e.target.value === 'yes' })
                            }
                          >
                            {CRITICAL_FLAG_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-field appt-modal__field-wide">
                          <label htmlFor={`lab-comp-interpret-${i}`}>Interpretation (optional)</label>
                          <select
                            id={`lab-comp-interpret-${i}`}
                            className="lab-modal-select"
                            value={c.interpretation ?? ''}
                            disabled={!canEditLabs}
                            onChange={(e) =>
                              updateComponent(i, {
                                interpretation: e.target.value || undefined,
                              })
                            }
                          >
                            {INTERPRETATION_OPTIONS.map((opt) => (
                              <option key={opt || 'blank'} value={opt}>
                                {opt || '(none)'}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          className="lab-component-row__remove"
                          disabled={!canEditLabs}
                          onClick={() => removeComponent(i)}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {saveError && (
                <p className="appt-modal__error-text" role="alert">
                  {saveError}
                </p>
              )}

              <div className="appt-modal__actions">
                {!isNewPanel && (
                  <button
                    type="button"
                    className="clear-button"
                    disabled={!canEditLabs || saving}
                    onClick={() => void removePanel()}
                  >
                    Delete panel
                  </button>
                )}
                <button type="button" className="clear-button" onClick={closeDraft}>
                  Close
                </button>
                <button
                  type="button"
                  className="save-button"
                  disabled={!canEditLabs || saving}
                  onClick={() => void saveDraft()}
                >
                  {saving ? 'Saving…' : isNewPanel ? 'Create lab panel' : 'Save changes'}
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
            aria-labelledby="tab7-staff-modal-title"
          >
            <button
              type="button"
              className="tab14-staff-modal__backdrop"
              aria-label="Close dialog"
              disabled={staffSubmitting}
              onClick={() => {
                if (!staffSubmitting) {
                  setStaffModalOpen(false);
                  setPendingLabOpen(null);
                }
              }}
            />
            <div className="tab14-staff-modal__panel">
              <h2 id="tab7-staff-modal-title">Staff sign-in</h2>
              <p className="tab14-staff-modal__hint">{staffHint}</p>
              <form onSubmit={(e) => void submitStaffModal(e)}>
                <div className="form-field">
                  <label htmlFor="tab7-staff-user">Staff username</label>
                  <input
                    id="tab7-staff-user"
                    name="username"
                    autoComplete="username"
                    value={staffUsername}
                    onChange={(e) => setStaffUsername(e.target.value)}
                    disabled={staffSubmitting}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="tab7-staff-pass">Password</label>
                  <input
                    id="tab7-staff-pass"
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
                      setPendingLabOpen(null);
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
      </IonContent>
    </IonPage>
  );
};

export default Tab7;
