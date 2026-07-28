import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import HeaderLanguagePicker from '../components/HeaderLanguagePicker';
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
  syncEpicPatientFromFhir,
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
  const { t } = useTranslation();
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
  const [epicSyncing, setEpicSyncing] = useState(false);
  const [epicSyncMessage, setEpicSyncMessage] = useState<string | null>(null);

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
          e instanceof Error ? e.message : t('admin.epic.loadError')
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

  const sections = useMemo(
    () => [
      {
        title: t('admin.shortcutSections.dashboard.title'),
        subtitle: t('admin.shortcutSections.dashboard.subtitle'),
        headIcon: gridOutline,
        items: [
          { label: t('admin.shortcutSections.dashboard.patientName'), icon: accessibilityOutline, path: 'patient-name' },
          { label: t('admin.shortcutSections.dashboard.patientId'), icon: peopleOutline, path: 'patient-id' },
          { label: t('admin.shortcutSections.dashboard.patientEmail'), icon: atCircleOutline, path: 'patient-email' },
          { label: t('admin.shortcutSections.dashboard.bmiScore'), icon: analyticsOutline, path: 'bmi-score' },
          { label: t('admin.shortcutSections.dashboard.lastVisit'), icon: archiveOutline, path: 'last-visit' },
          { label: t('admin.shortcutSections.dashboard.knownAllergies'), icon: alertCircle, path: 'known-allergies' },
          { label: t('admin.shortcutSections.dashboard.activeMeds'), icon: bagAddOutline, path: 'active-meds' },
        ],
      },
      {
        title: t('admin.shortcutSections.quickStatus.title'),
        subtitle: t('admin.shortcutSections.quickStatus.subtitle'),
        headIcon: speedometerOutline,
        items: [
          { label: t('admin.shortcutSections.quickStatus.appointments'), icon: easelOutline, path: 'appointments' },
          { label: t('admin.shortcutSections.quickStatus.resultsPending'), icon: fileTrayFullOutline, path: 'pending' },
          { label: t('admin.shortcutSections.quickStatus.medications'), icon: eyedropOutline, path: 'meds' },
        ],
      },
      {
        title: t('admin.shortcutSections.chronic.title'),
        subtitle: t('admin.shortcutSections.chronic.subtitle'),
        headIcon: medkitOutline,
        items: [
          { label: t('admin.shortcutSections.chronic.modify1'), icon: optionsOutline, path: 'cond-1' },
          { label: t('admin.shortcutSections.chronic.modify2'), icon: optionsSharp, path: 'cond-2' },
          { label: t('admin.shortcutSections.chronic.addNew'), icon: pencilOutline, path: 'add-cond' },
        ],
      },
      {
        title: t('admin.shortcutSections.labs.title'),
        subtitle: t('admin.shortcutSections.labs.subtitle'),
        headIcon: flaskOutline,
        items: [
          { label: t('admin.shortcutSections.labs.modify1'), icon: statsChartOutline, path: 'lab-1' },
          { label: t('admin.shortcutSections.labs.addNew'), icon: pencilOutline, path: 'add-lab' },
        ],
      },
    ],
    [t]
  );

  return (
    <IonPage className="ct-page ct-tab13">
      <IonContent fullscreen>
        <div className="admin-panel-container">
          <header className="admin-panel-header">
            <h1>
              <i className="fas fa-user-shield" aria-hidden />
              {t('admin.title')}
            </h1>
            <div className="admin-panel-header__actions">
              <HeaderLanguagePicker className="patient-insurance-header__action-btn" />
              <a
                href={fullAppUrl('/admin-portal/home')}
                className="book-btn patient-insurance-header__action-btn"
              >
                <i className="fas fa-arrow-left" aria-hidden />
                {t('common.goBackToDashboard')}
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
                    <h2 id="tab13-overview-heading">{t('admin.introTitle')}</h2>
                    <p>
                      {t('admin.introBody')}
                    </p>
                  </div>
                </div>

                {!canEditAdmin && (
                  <p className="tab13-readonly-hint">
                    {t('admin.readonlyHint')}
                  </p>
                )}
                {canEditAdmin && (
                  <div className="tab13-staff-banner">
                    <p className="tab13-staff-banner__text">
                      {t('admin.staffBanner')}
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
                        {t('common.endStaffMode')}
                      </IonButton>
                    )}
                  </div>
                )}
              </section>

              <section className="tab13-zone tab13-zone--facility" aria-labelledby="tab13-facility-heading">
                <h2 className="tab13-zone__label" id="tab13-facility-heading">
                  {t('admin.facilityOps')}
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
                    {t('admin.addHospital')}
                  </button>
                  <button
                    type="button"
                    className="tab13-ops__btn"
                    onClick={() => {
                      window.location.assign('/admin-portal/activity');
                    }}
                  >
                    <IonIcon icon={settingsOutline} aria-hidden />
                    {t('admin.viewLogs')}
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
                      {t('admin.shortcuts')}
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
                      {t('admin.integrations')}
                    </h2>
                    <section className="tab13-epic-card" aria-labelledby="tab13-epic-title">
                      <header className="tab13-epic-card__head">
                        <span className="tab13-epic-card__badge">{t('admin.epicFhir')}</span>
                        <h3 id="tab13-epic-title">{t('admin.sandboxLinkage')}</h3>
                      </header>
                      <div className="tab13-epic-card__body">
                        <p className="tab13-epic-card__lead">
                          {t('admin.epic.lead')}
                        </p>
                  {epicLoading && <p className="tab13-epic-card__meta">{t('common.loading')}</p>}
                  {epicErr && <p className="tab13-epic-card__meta">{epicErr}</p>}
                  {!epicLoading && epicCfg && (
                    <>
                      <div className="tab13-epic-card__status">
                        {t('admin.epic.oauthReady')}{' '}
                        <strong>{epicCfg.integration_enabled ? t('admin.epic.yes') : t('admin.epic.no')}</strong>
                        {epicLink && (
                          <>
                            <br />
                            {t('admin.epic.status')} <strong>{epicLink.status}</strong>
                            {epicLink.epic_patient_fhir_id ? (
                              <>
                                <br />
                                {t('admin.epic.epicPatientId')}{' '}
                                <strong>{epicLink.epic_patient_fhir_id}</strong>
                              </>
                            ) : null}
                            {epicLink.last_sync_at ? (
                              <>
                                <br />
                                {t('admin.epic.lastSync')}{' '}
                                <strong>
                                  {new Date(epicLink.last_sync_at).toLocaleString()}
                                </strong>
                                {epicLink.last_sync_summary?.updated_fields?.length ? (
                                  <>
                                    <br />
                                    {t('admin.epic.lastSyncFields', {
                                      count:
                                        epicLink.last_sync_summary.updated_fields.length,
                                    })}
                                  </>
                                ) : null}
                              </>
                            ) : null}
                          </>
                        )}
                      </div>
                      {epicSyncMessage && (
                        <p className="tab13-epic-card__meta tab13-epic-card__meta--success">
                          {epicSyncMessage}
                        </p>
                      )}
                      {epicCfg.hint ? <p className="tab13-epic-card__meta">{epicCfg.hint}</p> : null}
                      {!epicPatientId && (
                        <p className="tab13-epic-card__meta">
                          {t('admin.epic.noPatientRecord')}
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
                                      : t('admin.epic.oauthStartError')
                                  )
                                );
                              }
                            })();
                          }}
                        >
                          {t('admin.epic.connectSandbox')}
                        </IonButton>
                        <IonButton
                          expand="block"
                          fill="outline"
                          disabled={epicLoading}
                          onClick={() => void reloadEpic()}
                        >
                          {t('admin.epic.refreshStatus')}
                        </IonButton>
                        {epicPatientId && epicLink?.status === 'connected' && (
                          <IonButton
                            expand="block"
                            fill="outline"
                            color="primary"
                            disabled={!canEditAdmin || epicLoading || epicSyncing}
                            onClick={() => {
                              void (async () => {
                                if (!epicPatientId) return;
                                setEpicSyncing(true);
                                setEpicErr(null);
                                setEpicSyncMessage(null);
                                try {
                                  const result = await syncEpicPatientFromFhir(epicPatientId);
                                  setEpicLink(result.link);
                                  const n = result.summary.updated_fields.length;
                                  setEpicSyncMessage(
                                    t('admin.epic.syncSuccess', {
                                      count: n,
                                      observations: result.summary.observations_read,
                                    })
                                  );
                                } catch (e) {
                                  setEpicErr(
                                    formatSessionOrTokenErrorForUi(
                                      e instanceof Error ? e.message : t('admin.epic.syncError')
                                    )
                                  );
                                } finally {
                                  setEpicSyncing(false);
                                }
                              })();
                            }}
                          >
                            {epicSyncing ? t('admin.epic.syncing') : t('admin.epic.syncFromEpic')}
                          </IonButton>
                        )}
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
                                      e instanceof Error ? e.message : t('admin.epic.clearLinkError')
                                    )
                                  );
                                }
                              })();
                            }}
                          >
                            {t('admin.epic.clearLink')}
                          </IonButton>
                        )}
                      </div>
                      {canEditAdmin && epicPatientId && (
                        <>
                          <IonItem lines="none" className="tab13-epic-manual">
                            <IonLabel position="stacked">{t('admin.epic.manualIdLabel')}</IonLabel>
                            <IonInput
                              value={epicManualId}
                              placeholder={t('admin.epic.manualIdPlaceholder')}
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
                                        : t('admin.epic.saveManualIdError')
                                    )
                                  );
                                } finally {
                                  setEpicSavingManual(false);
                                }
                              })();
                            }}
                          >
                            {epicSavingManual ? t('common.saving') : t('admin.epic.saveManualId')}
                          </IonButton>
                        </>
                      )}
                        <p className="tab13-epic-card__meta">
                          {t('admin.epic.redirectUri')}{' '}
                          <code>{epicCfg.redirect_uri ?? t('admin.epic.configureBackend')}</code>
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
            <IonTitle>{t('admin.addHospital')}</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setHospitalModalOpen(false)}>{t('common.close')}</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {hospitalMessage && <p>{hospitalMessage}</p>}
          <IonItem>
            <IonLabel position="stacked">{t('admin.facilityName')}</IonLabel>
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
                  setHospitalMessage(t('admin.hospitalSaved', { name: hospitalName.trim() }));
                  setHospitalName('');
                } catch (e) {
                  setHospitalMessage(
                    e instanceof Error ? e.message : t('admin.epic.createHospitalError')
                  );
                } finally {
                  setHospitalSaving(false);
                }
              })();
            }}
          >
            {hospitalSaving ? t('common.saving') : t('admin.createInApi')}
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
            aria-label={t('common.closeDialog')}
            disabled={staffSubmitting}
            onClick={() => {
              if (!staffSubmitting) setStaffModalOpen(false);
            }}
          />
          <div className="tab14-staff-modal__panel">
            <h2 id="tab13-staff-modal-title">{t('common.staffSignIn')}</h2>
            <p className="tab14-staff-modal__hint">
              {t('admin.readonlyHint')}
            </p>
            <form onSubmit={(e) => void submitStaffModal(e)}>
              <div className="form-field">
                <label htmlFor="tab13-staff-user">{t('common.staffUsername')}</label>
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
                <label htmlFor="tab13-staff-pass">{t('common.password')}</label>
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
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="tab14-staff-modal__btn tab14-staff-modal__btn--primary"
                  disabled={staffSubmitting}
                >
                  {staffSubmitting ? t('common.signingIn') : t('common.unlockAndContinue')}
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
