import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './Tab2.css';
import './Tab5.css';
import HeaderLanguagePicker from '../components/HeaderLanguagePicker';
import GoBackButton from '../components/GoBackButton';
import { chartPageGoBackFallback, navigatePortal } from '../navigation/portalGoBack';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonRow,
  IonCol,
  IonSpinner,
} from '@ionic/react';
import {
  alarmOutline,
  calendarOutline,
  beakerOutline,
  medkitOutline,
  personCircleOutline,
  documentTextOutline,
  shieldCheckmarkOutline,
  fitnessOutline,
  chevronForwardOutline,
} from 'ionicons/icons';
import { useAuth } from '../contexts/AuthContext';
import StatusKpiCard from '../components/StatusKpiCard';
import {
  fetchDashboardDetail,
  fetchIntakeSnapshotSurfaces,
  fetchPatientLabPanels,
  fetchTab6Data,
  formatSessionOrTokenErrorForUi,
  type DashboardDetail,
  type PatientLabPanelApi,
} from '../api';
import { mapTab14LabPanelToApi } from '../labResults/labResultModel';
import { snapshotHospitalVisits } from '../intake/restoreParseSnapshot';
import { usePatientAppointments } from '../appointments/usePatientAppointments';
import {
  ANTONIO_DISPLAY_BANNER,
  DEMO_APPOINTMENTS,
  DEMO_ENCOUNTERS,
  antonioDemoLabPanels,
  fillIfEmpty,
  overlayDemoDashboardDetail,
  shouldUseDashboardDemo,
} from '../dashboard/antonioDisplayFixtures';
import {
  buildNextSteps,
  computeProfileCompleteness,
  countLabAttention,
  countSevereAllergies,
  hasUrgentNextSteps,
  trimNextStepsForQuickStatus,
  type NextStepTone,
} from '../dashboard/nextSteps';

type IonColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'medium';

type Tab2NextStepItem = {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  href: string;
  tone: NextStepTone;
  color?: IonColor;
};

const ION_STEP_ICONS: Record<string, string> = {
  profile: personCircleOutline,
  'profile-fields': personCircleOutline,
  'upload-doc': documentTextOutline,
  'labs-pending': beakerOutline,
  'labs-new': beakerOutline,
  'appts-pending': calendarOutline,
  meds: medkitOutline,
  insurance: shieldCheckmarkOutline,
  chronic: fitnessOutline,
  allergies: alarmOutline,
  book: calendarOutline,
  'meds-review': medkitOutline,
  dashboard: documentTextOutline,
};

function toneToIonColor(tone: NextStepTone): IonColor {
  if (tone === 'danger') return 'danger';
  // Keep queue chrome navy; only severe rows keep a danger icon tint.
  if (tone === 'warning' || tone === 'neutral') return 'primary';
  return 'primary';
}

function stepRowClass(tone: NextStepTone | undefined): string {
  return tone === 'danger' ? 'tab2-step tab2-step--danger' : 'tab2-step';
}

function toTab2Steps(
  steps: ReturnType<typeof buildNextSteps>
): Tab2NextStepItem[] {
  return steps.map((s) => ({
    id: s.id,
    icon: ION_STEP_ICONS[s.id] ?? documentTextOutline,
    title: s.title,
    subtitle: s.subtitle,
    href: s.href,
    tone: s.tone,
    color: toneToIonColor(s.tone),
  }));
}

const Tab2: React.FC = () => {
  const { t } = useTranslation();
  const { username } = useAuth();
  const [detail, setDetail] = useState<DashboardDetail | null>(null);
  const [labPanels, setLabPanels] = useState<PatientLabPanelApi[]>([]);
  const [incidentCount, setIncidentCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { appointments } = usePatientAppointments(username, refreshKey);
  const useDemo = shouldUseDashboardDemo();
  const displayDetail = useDemo ? overlayDemoDashboardDetail(detail) : detail;
  const displayAppointments = fillIfEmpty(appointments, useDemo ? DEMO_APPOINTMENTS : []);
  const displayLabPanels = fillIfEmpty(
    labPanels,
    useDemo ? antonioDemoLabPanels(detail?.id || 'demo-antonio') : []
  );
  const displayIncidentCount =
    incidentCount && incidentCount > 0
      ? incidentCount
      : useDemo
        ? DEMO_ENCOUNTERS.length
        : incidentCount;

  useEffect(() => {
    const onFocus = () => setRefreshKey((k) => k + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [d, { panels }, tab6] = await Promise.all([
          fetchDashboardDetail(username),
          fetchPatientLabPanels(username),
          fetchTab6Data(username).catch(() => ({ incidents: [] })),
        ]);
        if (!cancelled) {
          setDetail(d);
          if (panels.length > 0) {
            setLabPanels(panels);
          }
          let visitCount = tab6.incidents.length;
          if (!panels.length || !visitCount) {
            const { snap } = await fetchIntakeSnapshotSurfaces(username);
            if (!panels.length) {
              setLabPanels(
                (snap?.labPanels ?? []).map((p, i) =>
                  mapTab14LabPanelToApi(p, i, d.id)
                )
              );
            }
            if (!visitCount) {
              visitCount = snapshotHospitalVisits(snap).length;
            }
          }
          setIncidentCount(visitCount);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            formatSessionOrTokenErrorForUi(
              e instanceof Error ? e.message : 'Could not load patient summary.'
            )
          );
          setDetail(null);
          setLabPanels([]);
          setIncidentCount(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username, refreshKey]);

  const labStats = useMemo(() => {
    const { pending, newPanels } = countLabAttention(displayLabPanels);
    const needsAttention = displayLabPanels.filter(
      (r) => r.status.toLowerCase() === 'pending' || r.is_new
    ).length;
    return { pending, newPanels, needsAttention };
  }, [displayLabPanels]);

  const appointmentStats = useMemo(() => {
    const total = displayAppointments.length;
    const confirmed = displayAppointments.filter(
      (a) => a.status.toLowerCase() === 'confirmed'
    ).length;
    const pending = displayAppointments.filter(
      (a) => a.status.toLowerCase() === 'pending'
    ).length;
    return { total, confirmed, pending };
  }, [displayAppointments]);

  const profileCompleteness = useMemo(
    () => computeProfileCompleteness(displayDetail, t),
    [displayDetail, t]
  );

  const chronicCount = displayDetail?.chronicConditions.length ?? null;
  const allergyCount = displayDetail?.allergies.length ?? null;
  const severeAllergies = useMemo(() => countSevereAllergies(displayDetail), [displayDetail]);
  const medCount = displayDetail?.medications.length ?? null;

  const allNextSteps = useMemo(() => {
    if (loading) return [];
    return buildNextSteps(
      displayDetail,
      displayAppointments,
      labStats.pending,
      labStats.newPanels,
      { surface: 'quick-status' },
      t
    );
  }, [loading, displayDetail, displayAppointments, labStats.pending, labStats.newPanels, t]);

  const nextSteps = useMemo(
    () => toTab2Steps(trimNextStepsForQuickStatus(allNextSteps, 6)),
    [allNextSteps]
  );

  const showUrgencyHeading = useMemo(
    () => hasUrgentNextSteps(allNextSteps),
    [allNextSteps]
  );

  const go = useCallback((href: string) => {
    navigatePortal(href);
  }, []);

  const appointmentsSubtitle =
    appointmentStats.total === 0
      ? t('quickStatus.apptsNone')
      : appointmentStats.confirmed + appointmentStats.pending > 0
        ? t('quickStatus.apptsStats', {
            confirmed: appointmentStats.confirmed,
            pending: appointmentStats.pending,
          })
        : t('quickStatus.apptsOnFile', { count: appointmentStats.total });

  const labsPrimary = labStats.needsAttention;
  const labsSubtitle =
    labStats.needsAttention > 0
      ? labStats.pending > 0 && labStats.newPanels > 0
        ? t('quickStatus.labsPendingNew', {
            pending: labStats.pending,
            new: labStats.newPanels,
          })
        : labStats.pending > 0
          ? t('quickStatus.labsPendingOnly', { pending: labStats.pending })
          : t('quickStatus.labsNewOnly', { count: labStats.newPanels })
      : t('quickStatus.labsCaughtUp');

  const medsSubtitle =
    medCount === null
      ? loadError
        ? t('quickStatus.medsUnavailable')
        : '—'
      : medCount === 0
        ? t('quickStatus.medsNone')
        : t('quickStatus.medsCount', { count: medCount });

  const chronicSubtitle =
    chronicCount === null
      ? t('common.loading')
      : chronicCount === 0
        ? t('quickStatus.chronicNone')
        : t('quickStatus.chronicCount', { count: chronicCount });

  const incidentSubtitle =
    displayIncidentCount === null
      ? loadError
        ? t('quickStatus.incidentsLoadError')
        : t('common.loading')
      : displayIncidentCount === 0
        ? t('quickStatus.incidentsNone')
        : t('quickStatus.incidentsCount', { count: displayIncidentCount });

  const allergySubtitle =
    allergyCount === null
      ? t('common.loading')
      : allergyCount === 0
        ? t('quickStatus.allergiesNone')
        : severeAllergies > 0
          ? t('quickStatus.allergiesSevere', {
              count: allergyCount,
              severe: severeAllergies,
            })
          : t('quickStatus.allergiesCount', { count: allergyCount });

  return (
    <IonPage className="ct-page ct-tab2">
      <IonContent fullscreen className="ion-padding custom-content">
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">{t('quickStatus.title')}</IonTitle>
          </IonToolbar>
        </IonHeader>

        <div className="chronic-conditions-container">
          <header className="chronic-conditions-header meditap-glass-header">
            <h1>
              <i className="fas fa-notes-medical"></i> {t('quickStatus.title')}
            </h1>
            <div className="chronic-conditions-header__actions">
              <HeaderLanguagePicker className="chronic-conditions-header__action-btn" />
              <GoBackButton
                fallback={chartPageGoBackFallback()}
                className="meditap-glass-btn meditap-glass-btn--compact"
              />
            </div>
          </header>

          {loadError && (
            <p className="tab2-inline-warning" role="status">
              {t('quickStatus.loadError', { error: loadError })}
            </p>
          )}
          {useDemo && (
            <p className="meditap-demo-banner" role="status">
              {ANTONIO_DISPLAY_BANNER}
            </p>
          )}

          <section className="tab2-section" aria-labelledby="tab2-snapshot-heading">
            <header className="tab2-section__header">
              <p className="tab2-section__eyebrow">{t('quickStatus.snapshotEyebrow')}</p>
              <h2 id="tab2-snapshot-heading" className="tab2-section__title">
                {t('quickStatus.chartSnapshot')}
              </h2>
              <p className="tab2-section__sub">{t('quickStatus.chartSnapshotHint')}</p>
            </header>
            <IonRow className="tab2-kpi-grid">
              <IonCol size="6" sizeMd="4">
                <StatusKpiCard
                  title={t('quickStatus.bmi')}
                  value={displayDetail?.healthSummary.bmi ?? (loading ? '—' : 'N/A')}
                  subtitle={
                    displayDetail?.healthSummary.bmi !== 'N/A'
                      ? `${displayDetail?.healthSummary.bmiCategory ?? '—'} · ${displayDetail?.healthSummary.heightDisplay ?? '—'} · ${displayDetail?.healthSummary.weightDisplay ?? '—'}`
                      : t('quickStatus.openVitals')
                  }
                  href="/app/intake?section=vitals"
                  onNavigate={go}
                  loading={loading}
                />
              </IonCol>
              <IonCol size="6" sizeMd="4">
                <StatusKpiCard
                  title={t('quickStatus.profileComplete')}
                  value={`${profileCompleteness.percent}%`}
                  subtitle={profileCompleteness.subtitle}
                  href="/app/intake"
                  onNavigate={go}
                  loading={loading}
                />
              </IonCol>
              <IonCol size="6" sizeMd="4">
                <StatusKpiCard
                  title={t('quickStatus.appointments')}
                  value={appointmentStats.total}
                  subtitle={appointmentsSubtitle}
                  href="/app/appointments"
                  onNavigate={go}
                  badge={
                    appointmentStats.pending > 0
                      ? t('quickStatus.badgePending')
                      : undefined
                  }
                />
              </IonCol>
              <IonCol size="6" sizeMd="4">
                <StatusKpiCard
                  title={t('quickStatus.medications')}
                  value={medCount === null ? '—' : medCount}
                  subtitle={medsSubtitle}
                  href="/app/intake"
                  onNavigate={go}
                  loading={loading}
                />
              </IonCol>
              <IonCol size="6" sizeMd="4">
                <StatusKpiCard
                  title={t('quickStatus.chronicConditions')}
                  value={chronicCount === null ? '—' : chronicCount}
                  subtitle={chronicSubtitle}
                  href="/app/conditions"
                  onNavigate={go}
                  loading={loading}
                />
              </IonCol>
            </IonRow>
          </section>

          <section className="tab2-section tab2-section--queue" aria-labelledby="tab2-queue-heading">
            <header className="tab2-section__header">
              <p className="tab2-section__eyebrow">{t('quickStatus.queueEyebrow')}</p>
              <h2 id="tab2-queue-heading" className="tab2-section__title">
                {showUrgencyHeading
                  ? t('quickStatus.needsAttention')
                  : t('quickStatus.actionQueue')}
              </h2>
              <p className="tab2-section__sub">{t('quickStatus.prioritizedHint')}</p>
            </header>

            <IonRow className="tab2-kpi-grid tab2-kpi-grid--queue">
              <IonCol size="6" sizeMd="4">
                <StatusKpiCard
                  title={t('quickStatus.labsAttention')}
                  value={labsPrimary}
                  subtitle={labsSubtitle}
                  href="/app/labs"
                  onNavigate={go}
                  queue
                  badge={labsPrimary > 0 ? t('quickStatus.badgeReview') : undefined}
                  loading={loading && displayLabPanels.length === 0 && !loadError}
                />
              </IonCol>
              <IonCol size="6" sizeMd="4">
                <StatusKpiCard
                  title={t('quickStatus.incidents')}
                  value={displayIncidentCount === null ? '—' : displayIncidentCount}
                  subtitle={incidentSubtitle}
                  href="/app/incidents"
                  onNavigate={go}
                  queue
                  loading={loading && displayIncidentCount === null}
                />
              </IonCol>
            </IonRow>

            {allergyCount !== null && allergyCount > 0 && (
              <p
                className={`tab2-allergy-strip${
                  severeAllergies > 0 ? ' tab2-allergy-strip--severe' : ''
                }`}
                role="status"
              >
                <i className="fas fa-allergies" aria-hidden />
                <span>{allergySubtitle}</span>
              </p>
            )}

            <IonCard className="task-list-card">
              {loading ? (
                <div className="tab2-next-steps-loading">
                  <IonSpinner name="crescent" />
                  <p>{t('quickStatus.buildingSteps')}</p>
                </div>
              ) : nextSteps.length === 0 ? (
                <p className="tab2-next-steps-empty">
                  {t('quickStatus.caughtUp')}
                </p>
              ) : (
                <IonList lines="full" className="task-list">
                  {nextSteps.map((step) => (
                    <IonItem
                      key={step.id}
                      button
                      detail={false}
                      className={stepRowClass(step.tone)}
                      onClick={() => go(step.href)}
                    >
                      <IonIcon
                        icon={step.icon}
                        slot="start"
                        color={step.tone === 'danger' ? 'danger' : undefined}
                      />
                      <IonLabel>
                        <h3>{step.title}</h3>
                        <p>{step.subtitle}</p>
                      </IonLabel>
                      <IonIcon icon={chevronForwardOutline} slot="end" />
                    </IonItem>
                  ))}
                </IonList>
              )}
            </IonCard>
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Tab2;
