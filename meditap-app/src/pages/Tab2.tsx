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
  formatSessionOrTokenErrorForUi,
  type DashboardDetail,
} from '../api';
import {
  loadAppointmentsFromStorage,
  mockAppointments,
  type Appointment,
} from '../appointments/appointmentStorage';
import { mockLabResults } from '../labResults/labResultModel';

type IonColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'medium';

type NextStepItem = {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  href: string;
  color?: IonColor;
};

function isPatientMissing(d: DashboardDetail | null): boolean {
  if (!d) return false;
  if (d.id === 'Not created yet') return true;
  if ((d.patientProfile?.patientId || '').toLowerCase().includes('not created'))
    return true;
  return false;
}

function buildNextSteps(
  detail: DashboardDetail | null,
  appointments: Appointment[],
  pendingLabs: number,
  newLabPanels: number
): NextStepItem[] {
  const steps: NextStepItem[] = [];
  const missing = isPatientMissing(detail);

  if (missing) {
    steps.push({
      id: 'profile',
      icon: personCircleOutline,
      title: 'Complete your patient profile',
      subtitle: 'Create or finish demographics and contact in Patient Information.',
      href: '/tab14',
      color: 'primary',
    });
  }

  if (pendingLabs > 0) {
    steps.push({
      id: 'labs-pending',
      icon: beakerOutline,
      title:
        pendingLabs === 1
          ? '1 lab panel still pending'
          : `${pendingLabs} lab panels pending`,
      subtitle:
        newLabPanels > 0
          ? `${newLabPanels} panel(s) have new or partial results to review.`
          : 'Open Lab Results to track status.',
      href: '/tab7',
      color: 'warning',
    });
  } else if (newLabPanels > 0) {
    steps.push({
      id: 'labs-new',
      icon: beakerOutline,
      title: 'New lab results to review',
      subtitle: 'Open Lab Results for details and reference ranges.',
      href: '/tab7',
      color: 'primary',
    });
  }

  const pendingAppts = appointments.filter(
    (a) => a.status.toLowerCase() === 'pending'
  ).length;
  if (pendingAppts > 0) {
    steps.push({
      id: 'appts-pending',
      icon: calendarOutline,
      title:
        pendingAppts === 1
          ? '1 appointment needs attention'
          : `${pendingAppts} appointments need attention`,
      subtitle: 'Confirm or update visits on the Appointments tab.',
      href: '/tab4',
      color: 'warning',
    });
  }

  const medCount = detail?.medications.length ?? 0;
  if (detail && !missing && medCount === 0) {
    steps.push({
      id: 'meds',
      icon: medkitOutline,
      title: 'Add your medications',
      subtitle: 'Document prescriptions in Patient Information for safer care.',
      href: '/tab14',
      color: 'medium',
    });
  }

  const insCount = detail?.insurance.length ?? 0;
  if (detail && !missing && insCount === 0) {
    steps.push({
      id: 'insurance',
      icon: shieldCheckmarkOutline,
      title: 'Add insurance on file',
      subtitle: 'Speeds check-in and claims on the Patient Insurance tab.',
      href: '/tab12',
      color: 'medium',
    });
  }

  const chronicCount = detail?.chronicConditions.length ?? 0;
  if (detail && !missing && chronicCount > 0) {
    steps.push({
      id: 'chronic',
      icon: fitnessOutline,
      title: 'Review chronic conditions',
      subtitle: `${chronicCount} condition(s) on file — keep history current.`,
      href: '/tab5',
      color: 'primary',
    });
  }

  const allergyCount = detail?.allergies.length ?? 0;
  if (detail && !missing && allergyCount > 0) {
    const severe = detail.allergies.some((a) =>
      /severe|high|anaphyl/i.test(a.severity || '')
    );
    if (severe) {
      steps.push({
        id: 'allergies',
        icon: alarmOutline,
        title: 'Review allergy documentation',
        subtitle: 'Severe allergies on file — confirm details in Patient Information.',
        href: '/tab14',
        color: 'danger',
      });
    }
  }

  if (detail && !missing && appointments.length === 0) {
    steps.push({
      id: 'book',
      icon: calendarOutline,
      title: 'Schedule your next visit',
      subtitle: 'No upcoming appointments — add one on the Appointments tab.',
      href: '/tab4',
      color: 'primary',
    });
  }

  if (detail && !missing && medCount > 0) {
    steps.push({
      id: 'meds-review',
      icon: medkitOutline,
      title: 'Medication list on your record',
      subtitle: `${medCount} active medication(s). Update anytime in Patient Information.`,
      href: '/tab14',
      color: 'primary',
    });
  }

  steps.push({
    id: 'dashboard',
    icon: documentTextOutline,
    title: 'Full health overview',
    subtitle: 'See metrics, labs, incidents, and more on the main dashboard.',
    href: '/tab1',
    color: 'medium',
  });

  const seen = new Set<string>();
  return steps.filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
}

const Tab2: React.FC = () => {
  const history = useHistory();
  const { username } = useAuth();
  const [detail, setDetail] = useState<DashboardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>(
    mockAppointments
  );
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const onFocus = () => setRefreshKey((k) => k + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  useEffect(() => {
    const stored = loadAppointmentsFromStorage(username);
    setAppointments(stored ?? mockAppointments);
  }, [username, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const d = await fetchDashboardDetail(username);
        if (!cancelled) setDetail(d);
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            formatSessionOrTokenErrorForUi(
              e instanceof Error ? e.message : 'Could not load patient summary.'
            )
          );
          setDetail(null);
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
    const pending = mockLabResults.filter(
      (r) => r.status.toLowerCase() === 'pending'
    ).length;
    const newPanels = mockLabResults.filter((r) => r.isNew).length;
    const needsAttention = mockLabResults.filter(
      (r) => r.status.toLowerCase() === 'pending' || r.isNew
    ).length;
    return { pending, newPanels, needsAttention };
  }, []);

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
    return buildNextSteps(
      detail,
      appointments,
      labStats.pending,
      labStats.newPanels
    );
  }, [
    loading,
    detail,
    appointments,
    labStats.pending,
    labStats.newPanels,
  ]);

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
