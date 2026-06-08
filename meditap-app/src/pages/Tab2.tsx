import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import './Tab2.css';
import './Tab5.css';
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
    () => computeProfileCompleteness(detail),
    [detail]
  );

  const chronicCount = detail?.chronicConditions.length ?? null;
  const allergyCount = detail?.allergies.length ?? null;
  const severeAllergies = useMemo(() => countSevereAllergies(detail), [detail]);
  const medCount = detail?.medications.length ?? null;

  const allNextSteps = useMemo(() => {
    if (loading) return [];
    return buildNextSteps(detail, appointments, labStats.pending, labStats.newPanels, {
      surface: 'quick-status',
    });
  }, [loading, detail, appointments, labStats.pending, labStats.newPanels]);

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
      ? 'None scheduled — tap to open Appointments'
      : `${appointmentStats.confirmed} confirmed · ${appointmentStats.pending} pending`;

  const labsPrimary = labStats.needsAttention;
  const labsSubtitle =
    labStats.needsAttention > 0
      ? labStats.pending > 0 && labStats.newPanels > 0
        ? `${labStats.pending} pending · ${labStats.newPanels} new — tap to review`
        : labStats.pending > 0
          ? `${labStats.pending} awaiting results — tap to review`
          : `${labStats.newPanels} new result(s) — tap to review`
      : 'All caught up — tap to open Lab Results';

  const medsSubtitle =
    medCount === null
      ? loadError
        ? 'Record unavailable — tap Patient Information'
        : '—'
      : medCount === 0
        ? 'None on file — tap to add medications'
        : `${medCount} on record — tap to review`;

  const chronicSubtitle =
    chronicCount === null
      ? 'Loading…'
      : chronicCount === 0
        ? 'None on file — tap to add conditions'
        : `${chronicCount} on record — tap to review`;

  const incidentSubtitle =
    incidentCount === null
      ? loadError
        ? 'Could not load — tap Incidents tab'
        : 'Loading…'
      : incidentCount === 0
        ? 'None logged — tap to add an incident'
        : `${incidentCount} on record — tap to review`;

  const allergySubtitle =
    allergyCount === null
      ? 'Loading…'
      : allergyCount === 0
        ? 'None documented — tap Patient Information'
        : severeAllergies > 0
          ? `${allergyCount} on file · ${severeAllergies} severe — tap to review`
          : `${allergyCount} on file — tap to review`;

  return (
    <IonPage className="ct-page ct-tab2">
      <IonContent fullscreen className="ion-padding custom-content">
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Quick Status</IonTitle>
          </IonToolbar>
        </IonHeader>

        <div className="chronic-conditions-container">
          <header className="chronic-conditions-header">
            <h1>
              <i className="fas fa-notes-medical"></i> Quick Status
            </h1>
            <a href="/tab1" className="book-btn meditap-glass-btn meditap-glass-btn--compact">
              <i className="fas fa-arrow-left"></i> Back to dashboard
            </a>
          </header>

          {loadError && (
            <p className="tab2-inline-warning" role="status">
              Live summary unavailable: {loadError}. Appointment counts still
              load from the server when available.
            </p>
          )}

          <IonRow className="ion-margin-bottom tab2-kpi-grid">
            <IonCol size="6" sizeMd="4">
              <StatusKpiCard
                title="BMI"
                value={detail?.healthSummary.bmi ?? (loading ? '—' : 'N/A')}
                subtitle={
                  detail?.healthSummary.bmi !== 'N/A'
                    ? `${detail?.healthSummary.bmiCategory ?? '—'} · ${detail?.healthSummary.heightDisplay ?? '—'} · ${detail?.healthSummary.weightDisplay ?? '—'}`
                    : 'Add height & weight in Patient Information'
                }
                href="/tab14"
                highlightClass="highlight-1"
                onNavigate={go}
                loading={loading}
              />
            </IonCol>
            <IonCol size="6" sizeMd="4">
              <StatusKpiCard
                title="Profile complete"
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
                title="Appointments"
                value={appointmentStats.total}
                subtitle={appointmentsSubtitle}
                href="/tab4"
                highlightClass="highlight-2"
                onNavigate={go}
              />
            </IonCol>
            <IonCol size="6" sizeMd="4">
              <StatusKpiCard
                title="Labs need attention"
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
                title="Medications"
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
                title="Chronic conditions"
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
                title="Incidents"
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
            {showUrgencyHeading ? 'Needs attention today' : 'Your next steps'}
          </h2>

          <p className="tab2-next-steps-hint">
            Prioritized actions from your live chart, labs, and schedule. Tap a
            metric above or a step below to open the right tab.
          </p>

          <IonCard className="task-list-card">
            {loading ? (
              <div className="tab2-next-steps-loading">
                <IonSpinner name="crescent" />
                <p>Building your next steps…</p>
              </div>
            ) : nextSteps.length === 0 ? (
              <p className="tab2-next-steps-empty">
                You are caught up for now. Open the dashboard for your full health
                overview.
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
