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
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCardContent,
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
import {
  fetchDashboardDetail,
  fetchPatientLabPanels,
  formatSessionOrTokenErrorForUi,
  type DashboardDetail,
  type PatientLabPanelApi,
} from '../api';
import {
  loadAppointmentsFromStorage,
  type Appointment,
} from '../appointments/appointmentStorage';
import {
  buildNextSteps,
  countLabAttention,
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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const onFocus = () => setRefreshKey((k) => k + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  useEffect(() => {
    const stored = loadAppointmentsFromStorage(username);
    setAppointments(stored ?? []);
  }, [username, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [d, { panels }] = await Promise.all([
          fetchDashboardDetail(username),
          fetchPatientLabPanels(username),
        ]);
        if (!cancelled) {
          setDetail(d);
          setLabPanels(panels);
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

  const medCount = detail?.medications.length ?? null;

  const nextSteps = useMemo(() => {
    if (loading) return [];
    return toTab2Steps(
      buildNextSteps(detail, appointments, labStats.pending, labStats.newPanels, {
        surface: 'quick-status',
      })
    );
  }, [loading, detail, appointments, labStats.pending, labStats.newPanels]);

  const go = useCallback(
    (href: string) => {
      history.push(href);
    },
    [history]
  );

  const appointmentsSubtitle =
    appointmentStats.total === 0
      ? 'None scheduled — add on Appointments'
      : `${appointmentStats.confirmed} confirmed · ${appointmentStats.pending} pending`;

  const labsPrimary = labStats.needsAttention;
  const labsSubtitle =
    labStats.pending > 0 && labStats.newPanels > 0
      ? `${labStats.pending} pending · ${labStats.newPanels} new to review`
      : labStats.pending > 0
        ? `${labStats.pending} awaiting final results`
        : labStats.newPanels > 0
          ? `${labStats.newPanels} new result(s) to open`
          : 'No pending or new panels — all caught up';

  const medsSubtitle =
    loading && medCount === null
      ? 'Loading from your record…'
      : medCount === null
        ? loadError
          ? 'Sign in and sync to load medications'
          : '—'
        : medCount === 0
          ? 'None on file — add in Patient Information'
          : `${medCount} active on your MediTap record`;

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
            <a href="/tab1" className="book-btn">
              <i className="fas fa-arrow-left"></i> Back to dashboard
            </a>
          </header>

          {loadError && (
            <p className="tab2-inline-warning" role="status">
              Live summary unavailable: {loadError}. Appointments and lab
              preview still reflect local/demo data.
            </p>
          )}

          <IonRow className="ion-margin-bottom">
            <IonCol size="12" sizeMd="4">
              <IonCard className="status-card highlight-1">
                <IonCardHeader>
                  <IonCardTitle>Appointments</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <div className="status-value">{appointmentStats.total}</div>
                  <IonCardSubtitle>{appointmentsSubtitle}</IonCardSubtitle>
                </IonCardContent>
              </IonCard>
            </IonCol>

            <IonCol size="12" sizeMd="4">
              <IonCard className="status-card highlight-2">
                <IonCardHeader>
                  <IonCardTitle>Results pending</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <div className="status-value">{labsPrimary}</div>
                  <IonCardSubtitle>{labsSubtitle}</IonCardSubtitle>
                </IonCardContent>
              </IonCard>
            </IonCol>

            <IonCol size="12" sizeMd="4">
              <IonCard className="status-card highlight-3">
                <IonCardHeader>
                  <IonCardTitle>Medications</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  {loading ? (
                    <IonSpinner name="crescent" />
                  ) : (
                    <>
                      <div className="status-value">
                        {medCount === null ? '—' : medCount}
                      </div>
                      <IonCardSubtitle>{medsSubtitle}</IonCardSubtitle>
                    </>
                  )}
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          <h2 className="section-title">Your next steps</h2>
          <p className="tab2-next-steps-hint">
            Based on your record, appointments, and lab status (labs use the same
            preview as the Lab Results tab until wired to the API).
          </p>

          <IonCard className="task-list-card">
            {loading ? (
              <div className="tab2-next-steps-loading">
                <IonSpinner name="crescent" />
                <p>Building your next steps…</p>
              </div>
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
