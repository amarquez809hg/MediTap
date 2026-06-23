import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Tab2.css';
import './Tab5.css';
import HeaderLanguagePicker from '../components/HeaderLanguagePicker';
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
  warningOutline,
} from 'ionicons/icons';
import { useAuth } from '../contexts/AuthContext';
import StatusKpiCard from '../components/StatusKpiCard';
import {
  fetchDashboardDetail,
  fetchPatientLabPanels,
  fetchTab6Data,
  formatSessionOrTokenErrorForUi,
  type DashboardDetail,
  type PatientLabPanelApi,
} from '../api';
import { usePatientAppointments } from '../appointments/usePatientAppointments';
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
  if (tone === 'warning') return 'warning';
  if (tone === 'danger') return 'danger';
  if (tone === 'neutral') return 'medium';
  return 'primary';
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
    color: toneToIonColor(s.tone),
  }));
}

const Tab2: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const { username } = useAuth();
  const [detail, setDetail] = useState<DashboardDetail | null>(null);
  const [labPanels, setLabPanels] = useState<PatientLabPanelApi[]>([]);
  const [incidentCount, setIncidentCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { appointments } = usePatientAppointments(username, refreshKey);

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
          setLabPanels(panels);
          setIncidentCount(tab6.incidents.length);
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
    const { pending, newPanels } = countLabAttention(labPanels);
    const needsAttention = labPanels.filter(
      (r) => r.status.toLowerCase() === 'pending' || r.is_new
    ).length;
    return { pending, newPanels, needsAttention };
  }, [labPanels]);

  const appointmentStats = useMemo(() => {
    const total = appointments.length;
    const confirmed = appointments.filter(
      (a) => a.status.toLowerCase() === 'confirmed'
    ).length;
    const pending = appointments.filter(
      (a) => a.status.toLowerCase() === 'pending'
    ).length;
    return { total, confirmed, pending };
  }, [appointments]);

  const profileCompleteness = useMemo(
    () => computeProfileCompleteness(detail, t),
    [detail, t]
  );

  const chronicCount = detail?.chronicConditions.length ?? null;
  const allergyCount = detail?.allergies.length ?? null;
  const severeAllergies = useMemo(() => countSevereAllergies(detail), [detail]);
  const medCount = detail?.medications.length ?? null;

  const allNextSteps = useMemo(() => {
    if (loading) return [];
    return buildNextSteps(
      detail,
      appointments,
      labStats.pending,
      labStats.newPanels,
      { surface: 'quick-status' },
      t
    );
  }, [loading, detail, appointments, labStats.pending, labStats.newPanels, t]);

  const nextSteps = useMemo(
    () => toTab2Steps(trimNextStepsForQuickStatus(allNextSteps, 6)),
    [allNextSteps]
  );

  const showUrgencyHeading = useMemo(
    () => hasUrgentNextSteps(allNextSteps),
    [allNextSteps]
  );

  const go = useCallback(
    (href: string) => {
      history.push(href);
    },
    [history]
  );

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
    incidentCount === null
      ? loadError
        ? t('quickStatus.incidentsLoadError')
        : t('common.loading')
      : incidentCount === 0
        ? t('quickStatus.incidentsNone')
        : t('quickStatus.incidentsCount', { count: incidentCount });

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
          <header className="chronic-conditions-header">
            <h1>
              <i className="fas fa-notes-medical"></i> {t('quickStatus.title')}
            </h1>
            <div className="chronic-conditions-header__actions">
              <HeaderLanguagePicker className="chronic-conditions-header__action-btn" />
              <a href="/tab1" className="book-btn meditap-glass-btn meditap-glass-btn--compact">
                <i className="fas fa-arrow-left"></i> {t('common.goBackToDashboard')}
              </a>
            </div>
          </header>

          {loadError && (
            <p className="tab2-inline-warning" role="status">
              {t('quickStatus.loadError', { error: loadError })}
            </p>
          )}

          <IonRow className="ion-margin-bottom tab2-kpi-grid">
            <IonCol size="6" sizeMd="4">
              <StatusKpiCard
                title={t('quickStatus.bmi')}
                value={detail?.healthSummary.bmi ?? (loading ? '—' : 'N/A')}
                subtitle={
                  detail?.healthSummary.bmi !== 'N/A'
                    ? `${detail?.healthSummary.bmiCategory ?? '—'} · ${detail?.healthSummary.heightDisplay ?? '—'} · ${detail?.healthSummary.weightDisplay ?? '—'}`
                    : t('quickStatus.openVitals')
                }
                href="/tab14?section=vitals"
                highlightClass="highlight-1"
                onNavigate={go}
                loading={loading}
              />
            </IonCol>
            <IonCol size="6" sizeMd="4">
              <StatusKpiCard
                title={t('quickStatus.profileComplete')}
                value={`${profileCompleteness.percent}%`}
                subtitle={profileCompleteness.subtitle}
                href="/tab14"
                highlightClass="highlight-1"
                onNavigate={go}
                loading={loading}
              />
            </IonCol>
            <IonCol size="6" sizeMd="4">
              <StatusKpiCard
                title={t('quickStatus.appointments')}
                value={appointmentStats.total}
                subtitle={appointmentsSubtitle}
                href="/tab4"
                highlightClass="highlight-2"
                onNavigate={go}
              />
            </IonCol>
            <IonCol size="6" sizeMd="4">
              <StatusKpiCard
                title={t('quickStatus.labsAttention')}
                value={labsPrimary}
                subtitle={labsSubtitle}
                href="/tab7"
                highlightClass="highlight-3"
                onNavigate={go}
                loading={loading && labPanels.length === 0 && !loadError}
              />
            </IonCol>
            <IonCol size="6" sizeMd="4">
              <StatusKpiCard
                title={t('quickStatus.medications')}
                value={medCount === null ? '—' : medCount}
                subtitle={medsSubtitle}
                href="/tab14"
                highlightClass="highlight-4"
                onNavigate={go}
                loading={loading}
              />
            </IonCol>
            <IonCol size="6" sizeMd="4">
              <StatusKpiCard
                title={t('quickStatus.chronicConditions')}
                value={chronicCount === null ? '—' : chronicCount}
                subtitle={chronicSubtitle}
                href="/tab5"
                highlightClass="highlight-5"
                onNavigate={go}
                loading={loading}
              />
            </IonCol>
            <IonCol size="6" sizeMd="4">
              <StatusKpiCard
                title={t('quickStatus.incidents')}
                value={incidentCount === null ? '—' : incidentCount}
                subtitle={incidentSubtitle}
                href="/tab6"
                highlightClass="highlight-6"
                onNavigate={go}
                loading={loading && incidentCount === null}
              />
            </IonCol>
          </IonRow>

          {allergyCount !== null && allergyCount > 0 && (
            <p className="tab2-next-steps-hint" role="status">
              <i className="fas fa-allergies" aria-hidden /> {allergySubtitle}
            </p>
          )}

          <h2
            className={
              showUrgencyHeading
                ? 'tab2-urgency-heading tab2-urgency-heading--alert'
                : 'section-title'
            }
          >
            {showUrgencyHeading && (
              <IonIcon icon={warningOutline} className="tab2-urgency-icon" aria-hidden />
            )}
            {showUrgencyHeading ? t('quickStatus.needsAttention') : t('quickStatus.yourNextSteps')}
          </h2>

          <p className="tab2-next-steps-hint">
            {t('quickStatus.prioritizedHint')}
          </p>

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
                    onClick={() => go(step.href)}
                  >
                    <IonIcon icon={step.icon} slot="start" color={step.color} />
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
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Tab2;
