import React, { useCallback, useEffect, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonNote,
  IonButton,
  IonGrid,
  IonRow,
  IonCol,
  IonModal,
  IonInput,
  IonButtons,
  useIonRouter,
} from '@ionic/react';
import {
  keyOutline,
  accessibilityOutline,
  peopleOutline,
  atCircleOutline,
  analyticsOutline,
  archiveOutline,
  alertCircle,
  bagAddOutline,
  easelOutline,
  fileTrayFullOutline,
  eyedropOutline,
  optionsOutline,
  optionsSharp,
  pencilOutline,
  statsChartOutline,
  chevronForwardOutline,
  chevronDownOutline,
  addOutline,
  settingsOutline,
} from 'ionicons/icons';

import './Tab13.css';
import './Tab14.css';
import { useAuth } from '../contexts/AuthContext';
import { getKeycloak } from '../config/keycloak';
import { getMeditapRecordEditorRole } from '../config/meditap-roles';
import {
  clearMeditapIntakeElevation,
  isMeditapIntakeElevationValidForPatient,
  setMeditapIntakeElevationToken,
} from '../auth/staffElevationStorage';
import { staffElevateErrorMessage } from '../auth/staffElevateErrorMessage';
import {
  ensureHospital,
  fetchEpicOAuthConfig,
  fetchPatientEpicLinkForSession,
  formatSessionOrTokenErrorForUi,
  patchPatientEpicLink,
  prepareEpicPatientAuthorize,
  requestPatientIntakeStaffElevation,
  type EpicOAuthConfigApi,
  type EpicPatientLinkApi,
} from '../api';

function fullAppUrl(path: string) {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const seg = path.startsWith('/') ? path : `/${path}`;
  return `${window.location.origin}${base}${seg}`;
}

const Tab13: React.FC = () => {
  const ionRouter = useIonRouter();
  const { hasRealmRole, username } = useAuth();
  const recordEditorRole = getMeditapRecordEditorRole();
  const hasEditorRealmRole = hasRealmRole(recordEditorRole);
  const kcParsed = getKeycloak().tokenParsed as Record<string, unknown> | undefined;
  const patientSub = typeof kcParsed?.sub === 'string' ? kcParsed.sub : undefined;
  const canEditAdmin =
    hasEditorRealmRole || isMeditapIntakeElevationValidForPatient(patientSub);

  const [openSection, setOpenSection] = useState<string | null>('MEDITAP DASHBOARD');

  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffSubmitting, setStaffSubmitting] = useState(false);
  const [staffModalError, setStaffModalError] = useState<string | null>(null);
  const [, setElevationNonce] = useState(0);

  const [hospitalModalOpen, setHospitalModalOpen] = useState(false);
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalSaving, setHospitalSaving] = useState(false);
  const [hospitalMessage, setHospitalMessage] = useState<string | null>(null);

  const [epicCfg, setEpicCfg] = useState<EpicOAuthConfigApi | null>(null);
  const [epicPatientId, setEpicPatientId] = useState<string | null>(null);
  const [epicLink, setEpicLink] = useState<EpicPatientLinkApi | null>(null);
  const [epicLoading, setEpicLoading] = useState(false);
  const [epicErr, setEpicErr] = useState<string | null>(null);
  const [epicManualId, setEpicManualId] = useState('');
  const [epicSavingManual, setEpicSavingManual] = useState(false);

  const reloadEpic = useCallback(async () => {
    setEpicLoading(true);
    setEpicErr(null);
    try {
      const [cfg, pl] = await Promise.all([
        fetchEpicOAuthConfig(),
        fetchPatientEpicLinkForSession(username),
      ]);
      setEpicCfg(cfg);
      setEpicPatientId(pl.patientId);
      setEpicLink(pl.link);
    } catch (e) {
      setEpicErr(
        formatSessionOrTokenErrorForUi(
          e instanceof Error ? e.message : 'Could not load Epic link status.'
        )
      );
    } finally {
      setEpicLoading(false);
    }
  }, [username]);

  useEffect(() => {
    void reloadEpic();
  }, [reloadEpic]);

  const toggleSection = (sectionName: string) => {
    setOpenSection(openSection === sectionName ? null : sectionName);
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
    } catch (err) {
      setStaffModalError(staffElevateErrorMessage(err));
    } finally {
      setStaffSubmitting(false);
    }
  };

  const navigateToAdminSection = (path: string) => {
    if (!canEditAdmin) {
      setStaffModalError(null);
      setStaffModalOpen(true);
      return;
    }
    const routes: Record<string, string> = {
      'patient-name': '/tab14',
      'patient-id': '/tab14',
      'patient-email': '/tab14',
      'bmi-score': '/tab1',
      'last-visit': '/tab1',
      'known-allergies': '/tab14',
      'active-meds': '/tab14',
      appointments: '/tab4',
      pending: '/tab7',
      meds: '/tab14',
      'cond-1': '/tab5',
      'cond-2': '/tab5',
      'add-cond': '/tab5',
      'lab-1': '/tab7',
      'add-lab': '/tab7',
    };
    const target = routes[path];
    if (target) {
      ionRouter.push(target, 'forward', 'replace');
    }
  };

  const sections = [
    {
      title: 'MEDITAP DASHBOARD',
      items: [
        { label: 'Patient Name', icon: accessibilityOutline, path: 'patient-name' },
        { label: 'Patient ID', icon: peopleOutline, path: 'patient-id' },
        { label: 'Patient e-mail', icon: atCircleOutline, path: 'patient-email' },
        { label: 'BMI Score', icon: analyticsOutline, path: 'bmi-score' },
        { label: 'Last Visit', icon: archiveOutline, path: 'last-visit' },
        { label: 'Known Allergies', icon: alertCircle, path: 'known-allergies' },
        { label: 'Active Meds', icon: bagAddOutline, path: 'active-meds' },
      ],
    },
    {
      title: 'QUICK STATUS',
      items: [
        { label: 'Appointments', icon: easelOutline, path: 'appointments' },
        { label: 'Results Pending', icon: fileTrayFullOutline, path: 'pending' },
        { label: 'Medications', icon: eyedropOutline, path: 'meds' },
      ],
    },
    {
      title: 'CHRONIC CONDITIONS',
      items: [
        { label: 'Modify Condition 1', icon: optionsOutline, path: 'cond-1' },
        { label: 'Modify Condition 2', icon: optionsSharp, path: 'cond-2' },
        { label: 'Add New Condition', icon: pencilOutline, path: 'add-cond' },
      ],
    },
    {
      title: 'LAB RESULTS',
      items: [
        { label: 'Modify Lab Result 1', icon: statsChartOutline, path: 'lab-1' },
        { label: 'Log New Lab Result', icon: pencilOutline, path: 'add-lab' },
      ],
    },
  ];

  return (
    <IonPage className="ct-page ct-tab13">
      <IonContent fullscreen>
        <div className="admin-panel-container">
          <header className="admin-panel-header">
            <h1>
              <i className="fas fa-user-shield" aria-hidden />
              Admin Panel
            </h1>
            <div className="admin-panel-header__actions">
              <a
                href={fullAppUrl('/tab1')}
                className="book-btn patient-insurance-header__action-btn"
              >
                <i className="fas fa-arrow-left" aria-hidden />
                Go back to dashboard
              </a>
            </div>
          </header>

          <main className="admin-panel-main">
            <div className="admin-header">
              <IonIcon icon={keyOutline} className="admin-main-icon" />
              <p>Shortcuts to patient data tabs. Destructive API actions require staff access.</p>
            </div>

            {!canEditAdmin && (
              <p className="tab13-readonly-hint">
                Sign in with staff credentials to use admin shortcuts and add hospitals.
              </p>
            )}
            {canEditAdmin && (
              <div className="tab13-staff-banner">
                <p className="tab13-staff-banner__text">
                  Staff mode active (or record editor role). Hospital creation uses the live API.
                </p>
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

            <IonGrid>
              <IonRow>
                <IonCol size="12" sizeMd="6">
                  <IonButton
                    expand="block"
                    fill="outline"
                    onClick={() => {
                      if (!canEditAdmin) {
                        setStaffModalOpen(true);
                        return;
                      }
                      setHospitalMessage(null);
                      setHospitalName('');
                      setHospitalModalOpen(true);
                    }}
                  >
                    <IonIcon slot="start" icon={addOutline} /> ADD HOSPITAL
                  </IonButton>
                </IonCol>
                <IonCol size="12" sizeMd="6">
                  <IonButton
                    expand="block"
                    fill="outline"
                    onClick={() =>
                      window.alert(
                        'Operational logs are not connected to an API in this build. Use Django admin or server logging.'
                      )
                    }
                  >
                    <IonIcon slot="start" icon={settingsOutline} /> LOGS
                  </IonButton>
                </IonCol>
              </IonRow>
            </IonGrid>

            <section className="tab13-epic-card" aria-labelledby="tab13-epic-title">
              <h2 id="tab13-epic-title">Epic FHIR (read-only sandbox)</h2>
              <p>
                Link the current MediTap patient chart to an Epic sandbox patient for SMART OAuth
                demos. The backend does not store Epic access tokens—only linkage metadata after a
                successful code exchange.
              </p>
              {epicLoading && <p className="tab13-epic-card__meta">Loading…</p>}
              {epicErr && <p className="tab13-epic-card__meta">{epicErr}</p>}
              {!epicLoading && epicCfg && (
                <>
                  <p className="tab13-epic-card__meta">
                    OAuth ready: {epicCfg.integration_enabled ? 'yes' : 'no'}
                    {epicCfg.hint ? ` — ${epicCfg.hint}` : ''}
                  </p>
                  {!epicPatientId && (
                    <p className="tab13-epic-card__meta">
                      No MediTap patient record matches this sign-in yet. Complete intake (Tab 14) or
                      ensure a patient row exists before linking.
                    </p>
                  )}
                  {epicLink && (
                    <p className="tab13-epic-card__meta">
                      Status: <strong>{epicLink.status}</strong>
                      {epicLink.epic_patient_fhir_id
                        ? ` · Epic Patient.id: ${epicLink.epic_patient_fhir_id}`
                        : ''}
                    </p>
                  )}
                  <div className="tab13-epic-card__actions">
                    <IonButton
                      size="small"
                      disabled={
                        !epicCfg.integration_enabled || !epicPatientId || epicLoading
                      }
                      onClick={() => {
                        void (async () => {
                          if (!epicPatientId) return;
                          try {
                            const { authorize_url } =
                              await prepareEpicPatientAuthorize(epicPatientId);
                            window.location.assign(authorize_url);
                          } catch (e) {
                            setEpicErr(
                              formatSessionOrTokenErrorForUi(
                                e instanceof Error ? e.message : 'Could not start Epic OAuth.'
                              )
                            );
                          }
                        })();
                      }}
                    >
                      Connect Epic (sandbox)
                    </IonButton>
                    <IonButton
                      size="small"
                      fill="outline"
                      disabled={epicLoading}
                      onClick={() => void reloadEpic()}
                    >
                      Refresh status
                    </IonButton>
                    {epicPatientId && epicLink?.status === 'connected' && (
                      <IonButton
                        size="small"
                        fill="clear"
                        color="medium"
                        disabled={!canEditAdmin || epicLoading}
                        onClick={() => {
                          void (async () => {
                            if (!epicPatientId) return;
                            try {
                              const next = await patchPatientEpicLink(epicPatientId, {
                                status: 'disconnected',
                                epic_patient_fhir_id: '',
                              });
                              setEpicLink(next);
                              setEpicManualId('');
                            } catch (e) {
                              setEpicErr(
                                formatSessionOrTokenErrorForUi(
                                  e instanceof Error ? e.message : 'Could not clear link.'
                                )
                              );
                            }
                          })();
                        }}
                      >
                        Clear link
                      </IonButton>
                    )}
                  </div>
                  {canEditAdmin && epicPatientId && (
                    <div style={{ marginTop: 14, width: '100%' }}>
                      <IonItem lines="none" className="tab13-epic-manual">
                        <IonLabel position="stacked">Demo: Epic Patient.id (manual)</IonLabel>
                        <IonInput
                          value={epicManualId}
                          placeholder="e.g. eH-XXXXXXXX"
                          onIonInput={(e) => setEpicManualId(e.detail.value ?? '')}
                        />
                      </IonItem>
                      <IonButton
                        size="small"
                        className="ion-margin-top"
                        disabled={epicSavingManual || !epicManualId.trim()}
                        onClick={() => {
                          void (async () => {
                            if (!epicPatientId) return;
                            setEpicSavingManual(true);
                            setEpicErr(null);
                            try {
                              const next = await patchPatientEpicLink(epicPatientId, {
                                epic_patient_fhir_id: epicManualId.trim(),
                                status: 'connected',
                              });
                              setEpicLink(next);
                              setEpicManualId('');
                            } catch (e) {
                              setEpicErr(
                                formatSessionOrTokenErrorForUi(
                                  e instanceof Error ? e.message : 'Could not save manual id.'
                                )
                              );
                            } finally {
                              setEpicSavingManual(false);
                            }
                          })();
                        }}
                      >
                        {epicSavingManual ? 'Saving…' : 'Save manual id'}
                      </IonButton>
                    </div>
                  )}
                  <p className="tab13-epic-card__meta" style={{ marginTop: 12 }}>
                    Redirect URI for Epic on FHIR:{' '}
                    <code>{epicCfg.redirect_uri ?? '(configure backend)'}</code>
                  </p>
                </>
              )}
            </section>

            {sections.map((section) => (
              <div key={section.title} className="collapsible-container">
                <div
                  className={`section-banner clickable ${openSection === section.title ? 'active' : ''}`}
                  onClick={() => toggleSection(section.title)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleSection(section.title);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <p>{section.title}</p>
                  <IonIcon
                    icon={openSection === section.title ? chevronDownOutline : chevronForwardOutline}
                    className="toggle-icon"
                  />
                </div>

                <div className={`collapsible-content ${openSection === section.title ? 'is-open' : ''}`}>
                  <IonList lines="none" className="admin-list">
                    {section.items.map((item, idx) => (
                      <IonItem key={idx} button onClick={() => navigateToAdminSection(item.path)}>
                        <IonIcon slot="start" icon={item.icon} color="medium" />
                        <IonLabel>{item.label}</IonLabel>
                        <IonNote slot="end">
                          <IonIcon icon={chevronForwardOutline} />
                        </IonNote>
                      </IonItem>
                    ))}
                  </IonList>
                </div>
              </div>
            ))}
          </main>
        </div>
      </IonContent>

      <IonModal isOpen={hospitalModalOpen} onDidDismiss={() => setHospitalModalOpen(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Add hospital</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setHospitalModalOpen(false)}>Close</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {hospitalMessage && <p>{hospitalMessage}</p>}
          <IonItem>
            <IonLabel position="stacked">Facility name</IonLabel>
            <IonInput
              value={hospitalName}
              onIonInput={(e) => setHospitalName(e.detail.value ?? '')}
            />
          </IonItem>
          <IonButton
            expand="block"
            className="ion-margin-top"
            disabled={hospitalSaving || !hospitalName.trim()}
            onClick={() => {
              void (async () => {
                setHospitalSaving(true);
                setHospitalMessage(null);
                try {
                  await ensureHospital(hospitalName);
                  setHospitalMessage(`Saved: ${hospitalName.trim()}`);
                  setHospitalName('');
                } catch (e) {
                  setHospitalMessage(
                    e instanceof Error ? e.message : 'Could not create hospital.'
                  );
                } finally {
                  setHospitalSaving(false);
                }
              })();
            }}
          >
            {hospitalSaving ? 'Saving…' : 'Create in API'}
          </IonButton>
        </IonContent>
      </IonModal>

      {staffModalOpen && (
        <div
          className="tab14-staff-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tab13-staff-modal-title"
        >
          <button
            type="button"
            className="tab14-staff-modal__backdrop"
            aria-label="Close dialog"
            disabled={staffSubmitting}
            onClick={() => {
              if (!staffSubmitting) setStaffModalOpen(false);
            }}
          />
          <div className="tab14-staff-modal__panel">
            <h2 id="tab13-staff-modal-title">Staff sign-in</h2>
            <p className="tab14-staff-modal__hint">
              Staff access is required to run admin shortcuts and create hospitals.
            </p>
            <form onSubmit={(e) => void submitStaffModal(e)}>
              <div className="form-field">
                <label htmlFor="tab13-staff-user">Staff username</label>
                <input
                  id="tab13-staff-user"
                  name="username"
                  autoComplete="username"
                  value={staffUsername}
                  onChange={(e) => setStaffUsername(e.target.value)}
                  disabled={staffSubmitting}
                />
              </div>
              <div className="form-field">
                <label htmlFor="tab13-staff-pass">Password</label>
                <input
                  id="tab13-staff-pass"
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
                  onClick={() => setStaffModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="tab14-staff-modal__btn tab14-staff-modal__btn--primary"
                  disabled={staffSubmitting}
                >
                  {staffSubmitting ? 'Signing in…' : 'Unlock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </IonPage>
  );
};

export default Tab13;
