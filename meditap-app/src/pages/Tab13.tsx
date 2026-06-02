import React, { useCallback, useEffect, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonItem,
  IonLabel,
  IonIcon,
  IonButton,
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
  addOutline,
  gridOutline,
  speedometerOutline,
  medkitOutline,
  flaskOutline,
  settingsOutline,
} from 'ionicons/icons';

import './Tab13.css';
import './Tab14.css';
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
  const kcParsed = getAccessTokenPayload() ?? undefined;
  const patientSub = typeof kcParsed?.sub === 'string' ? kcParsed.sub : undefined;
  const canEditAdmin =
    hasEditorRealmRole || isMeditapIntakeElevationValidForPatient(patientSub);

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
      title: 'MediTap Dashboard',
      subtitle: 'Patient snapshot and chart overview',
      headIcon: gridOutline,
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
      title: 'Quick Status',
      subtitle: 'Triage metrics and next steps',
      headIcon: speedometerOutline,
      items: [
        { label: 'Appointments', icon: easelOutline, path: 'appointments' },
        { label: 'Results Pending', icon: fileTrayFullOutline, path: 'pending' },
        { label: 'Medications', icon: eyedropOutline, path: 'meds' },
      ],
    },
    {
      title: 'Chronic Conditions',
      subtitle: 'Long-term diagnoses and care plans',
      headIcon: medkitOutline,
      items: [
        { label: 'Modify Condition 1', icon: optionsOutline, path: 'cond-1' },
        { label: 'Modify Condition 2', icon: optionsSharp, path: 'cond-2' },
        { label: 'Add New Condition', icon: pencilOutline, path: 'add-cond' },
      ],
    },
    {
      title: 'Lab Results',
      subtitle: 'Panels, components, and new orders',
      headIcon: flaskOutline,
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
            <div className="tab13-page">
              <section
                className="tab13-zone tab13-zone--overview"
                aria-labelledby="tab13-overview-heading"
              >
                <div className="tab13-intro">
                  <IonIcon icon={keyOutline} className="tab13-intro__icon" aria-hidden />
                  <div className="tab13-intro__body">
                    <h2 id="tab13-overview-heading">Administration &amp; shortcuts</h2>
                    <p>
                      Jump to patient tabs, run facility operations, and manage Epic sandbox
                      linkage. Destructive API actions require staff access.
                    </p>
                  </div>
                </div>

                {!canEditAdmin && (
                  <p className="tab13-readonly-hint">
                    Sign in with staff credentials to use admin shortcuts and add hospitals.
                  </p>
                )}
                {canEditAdmin && (
                  <div className="tab13-staff-banner">
                    <p className="tab13-staff-banner__text">
                      Staff mode active (or record editor role). Hospital creation uses the live
                      API.
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
              </section>

              <section className="tab13-zone tab13-zone--facility" aria-labelledby="tab13-facility-heading">
                <h2 className="tab13-zone__label" id="tab13-facility-heading">
                  Facility operations
                </h2>
                <div className="tab13-ops" role="group" aria-label="Admin operations">
                  <button
                    type="button"
                    className="tab13-ops__btn tab13-ops__btn--primary"
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
                    <IonIcon icon={addOutline} aria-hidden />
                    Add hospital
                  </button>
                  <button
                    type="button"
                    className="tab13-ops__btn"
                    onClick={() =>
                      window.alert(
                        'Operational logs are not connected to an API in this build. Use Django admin or server logging.'
                      )
                    }
                  >
                    <IonIcon icon={settingsOutline} aria-hidden />
                    View logs
                  </button>
                </div>
              </section>

              <section
                className="tab13-zone tab13-zone--workspace"
                aria-labelledby="tab13-shortcuts-heading"
              >
                <div className="tab13-workspace">
                  <div className="tab13-workspace__shortcuts">
                    <h2 className="tab13-zone__label" id="tab13-shortcuts-heading">
                      Patient &amp; chart shortcuts
                    </h2>
                    <div className="tab13-shortcuts-grid">
                      {sections.map((section) => (
                        <article key={section.title} className="tab13-section-card">
                          <header className="tab13-section-card__head">
                            <IonIcon icon={section.headIcon} aria-hidden />
                            <div className="tab13-section-card__titles">
                              <h3 className="tab13-section-card__title">{section.title}</h3>
                              <p className="tab13-section-card__subtitle">{section.subtitle}</p>
                            </div>
                          </header>
                          <ul className="tab13-section-card__links">
                            {section.items.map((item) => (
                              <li key={item.path}>
                                <button
                                  type="button"
                                  className="tab13-section-card__link"
                                  onClick={() => navigateToAdminSection(item.path)}
                                >
                                  <IonIcon icon={item.icon} aria-hidden />
                                  <span className="tab13-section-card__link-label">
                                    {item.label}
                                  </span>
                                  <IonIcon
                                    icon={chevronForwardOutline}
                                    className="tab13-section-card__link-chevron"
                                    aria-hidden
                                  />
                                </button>
                              </li>
                            ))}
                          </ul>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div
                    className="tab13-workspace__integrations"
                    aria-labelledby="tab13-integrations-heading"
                  >
                    <h2 className="tab13-zone__label" id="tab13-integrations-heading">
                      Integrations
                    </h2>
                    <section className="tab13-epic-card" aria-labelledby="tab13-epic-title">
                      <header className="tab13-epic-card__head">
                        <span className="tab13-epic-card__badge">Epic FHIR</span>
                        <h3 id="tab13-epic-title">Sandbox linkage</h3>
                      </header>
                      <div className="tab13-epic-card__body">
                        <p className="tab13-epic-card__lead">
                          Link the current MediTap patient chart to an Epic sandbox patient for
                          SMART OAuth demos. The backend stores linkage metadata only—not Epic
                          access tokens.
                        </p>
                  {epicLoading && <p className="tab13-epic-card__meta">Loading…</p>}
                  {epicErr && <p className="tab13-epic-card__meta">{epicErr}</p>}
                  {!epicLoading && epicCfg && (
                    <>
                      <div className="tab13-epic-card__status">
                        OAuth ready:{' '}
                        <strong>{epicCfg.integration_enabled ? 'Yes' : 'No'}</strong>
                        {epicLink && (
                          <>
                            <br />
                            Status: <strong>{epicLink.status}</strong>
                            {epicLink.epic_patient_fhir_id ? (
                              <>
                                <br />
                                Epic Patient.id:{' '}
                                <strong>{epicLink.epic_patient_fhir_id}</strong>
                              </>
                            ) : null}
                          </>
                        )}
                      </div>
                      {epicCfg.hint ? <p className="tab13-epic-card__meta">{epicCfg.hint}</p> : null}
                      {!epicPatientId && (
                        <p className="tab13-epic-card__meta">
                          No MediTap patient record for this sign-in. Complete intake (Tab 14)
                          first.
                        </p>
                      )}
                      <div className="tab13-epic-card__actions">
                        <IonButton
                          expand="block"
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
                                    e instanceof Error
                                      ? e.message
                                      : 'Could not start Epic OAuth.'
                                  )
                                );
                              }
                            })();
                          }}
                        >
                          Connect Epic (sandbox)
                        </IonButton>
                        <IonButton
                          expand="block"
                          fill="outline"
                          disabled={epicLoading}
                          onClick={() => void reloadEpic()}
                        >
                          Refresh status
                        </IonButton>
                        {epicPatientId && epicLink?.status === 'connected' && (
                          <IonButton
                            expand="block"
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
                        <>
                          <IonItem lines="none" className="tab13-epic-manual">
                            <IonLabel position="stacked">Demo: Epic Patient.id (manual)</IonLabel>
                            <IonInput
                              value={epicManualId}
                              placeholder="e.g. eH-XXXXXXXX"
                              onIonInput={(e) => setEpicManualId(e.detail.value ?? '')}
                            />
                          </IonItem>
                          <IonButton
                            expand="block"
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
                                      e instanceof Error
                                        ? e.message
                                        : 'Could not save manual id.'
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
                        </>
                      )}
                        <p className="tab13-epic-card__meta">
                          Redirect URI:{' '}
                          <code>{epicCfg.redirect_uri ?? '(configure backend)'}</code>
                        </p>
                      </>
                    )}
                      </div>
                    </section>
                  </div>
                </div>
              </section>
            </div>
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
