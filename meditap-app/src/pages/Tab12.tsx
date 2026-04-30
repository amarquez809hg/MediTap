// src/pages/Tab12.tsx — Patient insurance from API + edit modal
import React, { useCallback, useEffect, useState } from 'react';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonPage,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import {
  bagAddOutline,
  shieldHalfOutline,
  idCardOutline,
  callOutline,
  mailOutline,
  personCircleOutline,
  calendarOutline,
  documentTextOutline,
  pricetagOutline,
  createOutline,
} from 'ionicons/icons';

import './Tab12.css';
import { useAuth } from '../contexts/AuthContext';
import { getAccessTokenPayload } from '../auth/accessTokenClaims';
import { getMeditapRecordEditorRole } from '../config/meditap-roles';
import {
  clearMeditapIntakeElevation,
  isMeditapIntakeElevationValidForPatient,
  setMeditapIntakeElevationToken,
} from '../auth/staffElevationStorage';
import { staffElevateErrorMessage } from '../auth/staffElevateErrorMessage';
import {
  fetchPatientInsuranceTabData,
  requestPatientIntakeStaffElevation,
  updateTab12InsuranceRow,
  type Tab12InsurancePolicyUi,
  type Tab12InsuranceRowMeta,
  type Tab12InsuranceView,
} from '../api';

function fullAppUrl(path: string) {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const seg = path.startsWith('/') ? path : `/${path}`;
  return `${window.location.origin}${base}${seg}`;
}

function emptyPolicyShell(): Tab12InsurancePolicyUi {
  return {
    memberId: '',
    policyId: '',
    planType: '',
    providerName: '',
    providerPhone: '',
    providerEmail: '',
    policyHolderName: '',
    coverageType: '',
    groupNumber: '',
    startDate: '',
    endDate: '',
    copayVPCP: '',
    copaySC: '',
    copayEUC: '',
    prescriptionDPI: '',
    healthPWA: '',
    inNetworkDAC: '',
    outofNetworkDAC: '',
    planContactInfo: '',
    deductible: '',
    maxOutOfPocket: '',
    status: '',
  };
}

const Tab12: React.FC = () => {
  const { username, hasRealmRole } = useAuth();
  const recordEditorRole = getMeditapRecordEditorRole();
  const hasEditorRealmRole = hasRealmRole(recordEditorRole);
  const [view, setView] = useState<Tab12InsuranceView | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editMeta, setEditMeta] = useState<Tab12InsuranceRowMeta | null>(null);
  const [draft, setDraft] = useState<Tab12InsurancePolicyUi>(emptyPolicyShell);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffSubmitting, setStaffSubmitting] = useState(false);
  const [staffModalError, setStaffModalError] = useState<string | null>(null);
  const [pendingInsuranceEdit, setPendingInsuranceEdit] = useState<{
    meta: Tab12InsuranceRowMeta;
    policy: Tab12InsurancePolicyUi;
  } | null>(null);
  const [, setElevationNonce] = useState(0);

  const kcParsed = getAccessTokenPayload() ?? undefined;
  const patientSub = typeof kcParsed?.sub === 'string' ? kcParsed.sub : undefined;
  const canEditInsurance =
    hasEditorRealmRole || isMeditapIntakeElevationValidForPatient(patientSub);
  const insuranceFieldsLocked = !canEditInsurance;

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchPatientInsuranceTabData(username ?? null);
      setView(data);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load insurance.');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  /**
   * Full navigation: sidebar links use <a href> (full load) into this tab, but
   * history.replace alone can leave Ionic's stacked IonPage visible. Assigning
   * location forces a clean load of the dashboard / patient form.
   */
  const openEdit = (meta: Tab12InsuranceRowMeta, policy: Tab12InsurancePolicyUi) => {
    setEditMeta(meta);
    setDraft({ ...policy });
    setSaveError(null);
    setEditOpen(true);
  };

  const tryOpenEdit = (meta: Tab12InsuranceRowMeta, policy: Tab12InsurancePolicyUi) => {
    if (!canEditInsurance) {
      setPendingInsuranceEdit({ meta, policy });
      setStaffModalError(null);
      setStaffModalOpen(true);
      return;
    }
    openEdit(meta, policy);
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
      const pending = pendingInsuranceEdit;
      setPendingInsuranceEdit(null);
      if (pending) {
        openEdit(pending.meta, pending.policy);
      }
    } catch (err) {
      setStaffModalError(staffElevateErrorMessage(err));
    } finally {
      setStaffSubmitting(false);
    }
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditMeta(null);
    setSaveError(null);
  };

  const saveEdit = async () => {
    if (!editMeta) return;
    if (!canEditInsurance) {
      setSaveError(
        'Staff sign-in or record editor role is required to save insurance changes.'
      );
      return;
    }
    setSaveError(null);
    setSaving(true);
    try {
      await updateTab12InsuranceRow({ meta: editMeta, policy: draft });
      closeEdit();
      await loadData();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const updateDraft = <K extends keyof Tab12InsurancePolicyUi>(
    key: K,
    value: Tab12InsurancePolicyUi[K]
  ) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const renderPolicyDetails = (
    policy: Tab12InsurancePolicyUi,
    patientDisplayName: string,
    meta: Tab12InsuranceRowMeta
  ) => (
    <IonList lines="full" className="detail-list ion-margin-bottom">
      <IonItem>
        <IonIcon slot="start" icon={idCardOutline} color="medium" />
        <IonLabel>Member ID</IonLabel>
        <IonNote slot="end" className="detail-value">
          {policy.memberId}
        </IonNote>
      </IonItem>

      <IonItem>
        <IonIcon slot="start" icon={personCircleOutline} color="medium" />
        <IonLabel>Member name</IonLabel>
        <IonNote slot="end" className="detail-value">
          {policy.policyHolderName || patientDisplayName}
        </IonNote>
      </IonItem>

      <IonItem>
        <IonIcon slot="start" icon={bagAddOutline} color="medium" />
        <IonLabel>Insurance carrier</IonLabel>
        <IonNote slot="end" className="detail-value">
          {policy.providerName}
        </IonNote>
      </IonItem>

      <IonItem>
        <IonIcon slot="start" icon={callOutline} color="medium" />
        <IonLabel>Carrier phone</IonLabel>
        <IonNote slot="end" className="detail-value">
          {policy.providerPhone}
        </IonNote>
      </IonItem>

      <IonItem>
        <IonIcon slot="start" icon={mailOutline} color="medium" />
        <IonLabel>Carrier email</IonLabel>
        <IonNote slot="end" className="detail-value">
          {policy.providerEmail}
        </IonNote>
      </IonItem>

      <IonItem>
        <IonIcon slot="start" icon={bagAddOutline} color="medium" />
        <IonLabel>Plan type</IonLabel>
        <IonNote slot="end" className="detail-value">
          {policy.planType}
        </IonNote>
      </IonItem>

      <IonItem>
        <IonIcon slot="start" icon={pricetagOutline} color="medium" />
        <IonLabel>Co-pay (primary care)</IonLabel>
        <IonNote slot="end" className="detail-value">
          {policy.copayVPCP}
        </IonNote>
      </IonItem>

      <IonItem>
        <IonIcon slot="start" icon={pricetagOutline} color="medium" />
        <IonLabel>Co-pay (specialty)</IonLabel>
        <IonNote slot="end" className="detail-value">
          {policy.copaySC}
        </IonNote>
      </IonItem>

      <IonItem>
        <IonIcon slot="start" icon={pricetagOutline} color="medium" />
        <IonLabel>Co-pay (emergency / urgent care)</IonLabel>
        <IonNote slot="end" className="detail-value">
          {policy.copayEUC}
        </IonNote>
      </IonItem>

      <IonItem>
        <IonIcon slot="start" icon={personCircleOutline} color="medium" />
        <IonLabel>Prescription drug plan</IonLabel>
        <IonNote slot="end" className="detail-value">
          {policy.prescriptionDPI}
        </IonNote>
      </IonItem>

      <IonItem>
        <IonIcon slot="start" icon={documentTextOutline} color="medium" />
        <IonLabel>Plan website</IonLabel>
        <IonNote slot="end" className="detail-value">
          {policy.healthPWA}
        </IonNote>
      </IonItem>

      <IonItem>
        <IonIcon slot="start" icon={idCardOutline} color="medium" />
        <IonLabel>In-network deductible / coinsurance</IonLabel>
        <IonNote slot="end" className="detail-value">
          {policy.inNetworkDAC}
        </IonNote>
      </IonItem>

      <IonItem>
        <IonIcon slot="start" icon={idCardOutline} color="medium" />
        <IonLabel>Out-of-network deductible / coinsurance</IonLabel>
        <IonNote slot="end" className="detail-value">
          {policy.outofNetworkDAC}
        </IonNote>
      </IonItem>

      <IonItem>
        <IonIcon slot="start" icon={idCardOutline} color="medium" />
        <IonLabel>Plan contact information</IonLabel>
        <IonNote slot="end" className="detail-value">
          {policy.planContactInfo}
        </IonNote>
      </IonItem>

      <IonItem>
        <IonIcon slot="start" icon={calendarOutline} color="medium" />
        <IonLabel>Policy period</IonLabel>
        <IonNote slot="end" className="detail-value">
          {policy.startDate || '—'} — {policy.endDate || 'Ongoing'}
        </IonNote>
      </IonItem>

      <IonItem>
        <IonIcon slot="start" icon={pricetagOutline} color="medium" />
        <IonLabel>Deductible</IonLabel>
        <IonNote slot="end" className="detail-value">
          {policy.deductible}
        </IonNote>
      </IonItem>

      <IonItem>
        <IonIcon slot="start" icon={pricetagOutline} color="medium" />
        <IonLabel>Max out-of-pocket</IonLabel>
        <IonNote slot="end" className="detail-value">
          {policy.maxOutOfPocket}
        </IonNote>
      </IonItem>

      <IonItem>
        <IonIcon slot="start" icon={shieldHalfOutline} color="medium" />
        <IonLabel>Status</IonLabel>
        <IonNote slot="end" className="detail-value">
          {policy.status}
        </IonNote>
      </IonItem>

      <IonItem lines="none" className="tab12-edit-inline">
        <IonButton
          expand="block"
          fill="outline"
          size="small"
          onClick={() => tryOpenEdit(meta, policy)}
        >
          <IonIcon slot="start" icon={createOutline} />
          Edit this policy
        </IonButton>
      </IonItem>
    </IonList>
  );

  const primary = view?.rows[0];
  const secondary = view?.rows[1];

  return (
    <IonPage className="ct-page ct-tab12">
      <IonContent fullscreen>
        <div className="patient-insurance-container">
          <header className="patient-insurance-header">
            <h1>
              <i className="fas fa-shield-alt" aria-hidden />
              Patient Insurance
            </h1>
            <div className="patient-insurance-header__actions">
              <a
                href={fullAppUrl('/tab14')}
                className="add-policy-header-btn patient-insurance-header__action-btn"
              >
                <i className="fas fa-plus" aria-hidden />
                Add new policy
              </a>
              <a
                href={fullAppUrl('/tab1')}
                className="book-btn patient-insurance-header__action-btn"
              >
                <i className="fas fa-arrow-left" aria-hidden />
                Go back to dashboard
              </a>
            </div>
          </header>

          {loading && (
            <main className="patient-insurance-main">
              <div className="tab12-center">
                <IonSpinner name="crescent" />
                <p>Loading insurance…</p>
              </div>
            </main>
          )}

          {!loading && loadError && (
            <main className="patient-insurance-main">
              <p className="tab12-error" role="alert">
                {loadError}
              </p>
            </main>
          )}

          {!loading && !loadError && view && (
            <main className="patient-insurance-main">
              {!canEditInsurance && (
                <p className="tab12-readonly-hint">
                  You can review coverage here. Editing saved policies requires staff sign-in
                  (record editor role) or use Patient Information with staff access to add
                  policies.
                </p>
              )}
              {canEditInsurance && (
                <div className="tab12-staff-banner">
                  <p>Staff editing is active for this session (or you have the record editor role).</p>
                  {!hasEditorRealmRole && (
                    <IonButton
                      size="small"
                      fill="outline"
                      onClick={() => {
                        clearMeditapIntakeElevation();
                        setElevationNonce((n) => n + 1);
                      }}
                    >
                      End staff mode
                    </IonButton>
                  )}
                </div>
              )}
              <div className="insurance-header">
                <IonIcon
                  icon={shieldHalfOutline}
                  className="insurance-main-icon ion-margin-bottom"
                />
                <h2 className="insurance-header__name">{view.patientName}</h2>
                <p className="ion-text-medium">DOB: {view.dateOfBirth}</p>
              </div>

              <div className="tab12-edit-policy-wrap">
                <IonButton
                  expand="block"
                  fill="outline"
                  color="primary"
                  disabled={!primary}
                  onClick={() =>
                    primary && tryOpenEdit(primary.meta, primary.policy)
                  }
                >
                  <IonIcon slot="start" icon={createOutline} />
                  Edit policy
                </IonButton>
              </div>

              {view.rows.length === 0 && (
                <p className="ion-text-center tab12-hint tab12-hint--spaced">
                  No insurance on file yet. Use{' '}
                  <strong>Add new policy</strong> in the header to open Patient
                  Information and save coverage there, or ask your care team to
                  add it.
                </p>
              )}

              {primary && (
                <>
                  <div className="section-banner">
                    <p>PRIMARY INSURANCE POLICY</p>
                  </div>
                  {renderPolicyDetails(
                    primary.policy,
                    view.patientName,
                    primary.meta
                  )}
                </>
              )}

              {secondary && (
                <>
                  <div className="section-banner">
                    <p>SECONDARY INSURANCE POLICY</p>
                  </div>
                  {renderPolicyDetails(
                    secondary.policy,
                    view.patientName,
                    secondary.meta
                  )}
                </>
              )}

              {view.rows.length > 2 && (
                <p className="tab12-hint tab12-hint--spaced">
                  Additional policies ({view.rows.length - 2}) are on file;
                  only the first two are shown here. Remove extras in Patient
                  Information if needed.
                </p>
              )}
            </main>
          )}
        </div>
      </IonContent>

      <IonModal isOpen={editOpen} onDidDismiss={closeEdit}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Edit insurance</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={closeEdit}>Close</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {saveError && (
            <p className="tab12-error" role="alert">
              {saveError}
            </p>
          )}
          <p className="tab12-hint">
            Carrier name and policy ID are tied to your enrollment record; change
            those on the Patient Information tab if needed.
          </p>
          <IonList>
            <IonItem>
              <IonLabel position="stacked">Insurance carrier (read-only)</IonLabel>
              <IonInput value={draft.providerName} readonly />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Policy / plan ID (read-only)</IonLabel>
              <IonInput value={draft.policyId} readonly />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Member ID</IonLabel>
              <IonInput
                readonly={insuranceFieldsLocked}
                value={draft.memberId}
                onIonInput={(e) =>
                  updateDraft('memberId', e.detail.value ?? '')
                }
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Member / subscriber name</IonLabel>
              <IonInput
                readonly={insuranceFieldsLocked}
                value={draft.policyHolderName}
                onIonInput={(e) =>
                  updateDraft('policyHolderName', e.detail.value ?? '')
                }
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Plan type</IonLabel>
              <IonInput
                readonly={insuranceFieldsLocked}
                value={draft.planType}
                onIonInput={(e) =>
                  updateDraft('planType', e.detail.value ?? '')
                }
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Group number</IonLabel>
              <IonInput
                readonly={insuranceFieldsLocked}
                value={draft.groupNumber}
                onIonInput={(e) =>
                  updateDraft('groupNumber', e.detail.value ?? '')
                }
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Coverage type (e.g. PPO)</IonLabel>
              <IonInput
                readonly={insuranceFieldsLocked}
                value={draft.coverageType}
                onIonInput={(e) =>
                  updateDraft('coverageType', e.detail.value ?? '')
                }
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Carrier phone</IonLabel>
              <IonInput
                readonly={insuranceFieldsLocked}
                value={draft.providerPhone}
                onIonInput={(e) =>
                  updateDraft('providerPhone', e.detail.value ?? '')
                }
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Carrier email</IonLabel>
              <IonInput
                readonly={insuranceFieldsLocked}
                type="email"
                value={draft.providerEmail}
                onIonInput={(e) =>
                  updateDraft('providerEmail', e.detail.value ?? '')
                }
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Plan website</IonLabel>
              <IonInput
                readonly={insuranceFieldsLocked}
                value={draft.healthPWA}
                onIonInput={(e) =>
                  updateDraft('healthPWA', e.detail.value ?? '')
                }
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Co-pay — primary care</IonLabel>
              <IonInput
                readonly={insuranceFieldsLocked}
                value={draft.copayVPCP}
                onIonInput={(e) =>
                  updateDraft('copayVPCP', e.detail.value ?? '')
                }
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Co-pay — specialty</IonLabel>
              <IonInput
                readonly={insuranceFieldsLocked}
                value={draft.copaySC}
                onIonInput={(e) => updateDraft('copaySC', e.detail.value ?? '')}
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Co-pay — ER / urgent care</IonLabel>
              <IonInput
                readonly={insuranceFieldsLocked}
                value={draft.copayEUC}
                onIonInput={(e) =>
                  updateDraft('copayEUC', e.detail.value ?? '')
                }
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Prescription plan</IonLabel>
              <IonTextarea
                readonly={insuranceFieldsLocked}
                autoGrow
                value={draft.prescriptionDPI}
                onIonInput={(e) =>
                  updateDraft('prescriptionDPI', e.detail.value ?? '')
                }
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">In-network deductible / coinsurance</IonLabel>
              <IonTextarea
                readonly={insuranceFieldsLocked}
                autoGrow
                value={draft.inNetworkDAC}
                onIonInput={(e) =>
                  updateDraft('inNetworkDAC', e.detail.value ?? '')
                }
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Out-of-network deductible / coinsurance</IonLabel>
              <IonTextarea
                readonly={insuranceFieldsLocked}
                autoGrow
                value={draft.outofNetworkDAC}
                onIonInput={(e) =>
                  updateDraft('outofNetworkDAC', e.detail.value ?? '')
                }
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Plan contact information</IonLabel>
              <IonTextarea
                readonly={insuranceFieldsLocked}
                autoGrow
                value={draft.planContactInfo}
                onIonInput={(e) =>
                  updateDraft('planContactInfo', e.detail.value ?? '')
                }
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Start date (YYYY-MM-DD)</IonLabel>
              <IonInput
                readonly={insuranceFieldsLocked}
                value={draft.startDate}
                onIonInput={(e) =>
                  updateDraft('startDate', e.detail.value ?? '')
                }
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">End date (YYYY-MM-DD)</IonLabel>
              <IonInput
                readonly={insuranceFieldsLocked}
                value={draft.endDate}
                onIonInput={(e) =>
                  updateDraft('endDate', e.detail.value ?? '')
                }
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Deductible</IonLabel>
              <IonInput
                readonly={insuranceFieldsLocked}
                value={draft.deductible}
                onIonInput={(e) =>
                  updateDraft('deductible', e.detail.value ?? '')
                }
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Max out-of-pocket</IonLabel>
              <IonInput
                readonly={insuranceFieldsLocked}
                value={draft.maxOutOfPocket}
                onIonInput={(e) =>
                  updateDraft('maxOutOfPocket', e.detail.value ?? '')
                }
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Status</IonLabel>
              <IonInput
                readonly={insuranceFieldsLocked}
                value={draft.status}
                onIonInput={(e) =>
                  updateDraft('status', e.detail.value ?? '')
                }
              />
            </IonItem>
          </IonList>
          <IonButton
            expand="block"
            className="ion-margin-top"
            onClick={() => void saveEdit()}
            disabled={!canEditInsurance || saving}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </IonButton>
        </IonContent>
      </IonModal>

      {staffModalOpen && (
        <div
          className="tab14-staff-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tab12-staff-modal-title"
        >
          <button
            type="button"
            className="tab14-staff-modal__backdrop"
            aria-label="Close dialog"
            disabled={staffSubmitting}
            onClick={() => {
              if (!staffSubmitting) {
                setStaffModalOpen(false);
                setPendingInsuranceEdit(null);
              }
            }}
          />
          <div className="tab14-staff-modal__panel">
            <h2 id="tab12-staff-modal-title">Staff sign-in</h2>
            <p className="tab14-staff-modal__hint">
              Enter staff credentials to unlock insurance edits for this patient session.
            </p>
            <form onSubmit={(e) => void submitStaffModal(e)}>
              <div className="form-field">
                <label htmlFor="tab12-staff-user">Staff username</label>
                <input
                  id="tab12-staff-user"
                  name="username"
                  autoComplete="username"
                  value={staffUsername}
                  onChange={(e) => setStaffUsername(e.target.value)}
                  disabled={staffSubmitting}
                />
              </div>
              <div className="form-field">
                <label htmlFor="tab12-staff-pass">Password</label>
                <input
                  id="tab12-staff-pass"
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
                    setPendingInsuranceEdit(null);
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
    </IonPage>
  );
};

export default Tab12;
