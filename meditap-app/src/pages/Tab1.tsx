import React from 'react';
import { IonAlert } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Tab1.css';
import { useAuth } from '../contexts/AuthContext';
import { queueOpenAddEntry, type OpenAddEntryPath } from '../auth/openAddEntry';
import DashboardHomeHero from '../components/DashboardHomeHero';
import DashboardNextSteps from '../components/DashboardNextSteps';
import DashboardSectionActions from '../components/DashboardSectionActions';
import OnboardingBanner from '../components/OnboardingBanner';
import StaffElevationModal from '../components/StaffElevationModal';
import { useStaffElevationGate } from '../hooks/useStaffElevationGate';
import {
  buildNextSteps,
  countLabAttention,
  greetingForDisplayName,
  trimNextStepsForDashboard,
  welcomeContextLine,
} from '../dashboard/nextSteps';
import {
  loadOnboarding,
  shouldShowDashboardOnboardingBanner,
  skipOnboarding,
} from '../onboarding/onboardingStorage';
import {
  fetchDashboardDetail,
  fetchPatientLabPanels,
  fetchTab5ChronicConditions,
  fetchTab6Data,
  formatSessionOrTokenErrorForUi,
  mapIncidentApiToTab6Record,
  type DashboardDetail,
  type PatientLabPanelApi,
  type Tab5ChronicCondition,
} from '../api';
import AppointmentCard from '../appointments/AppointmentCard';
import ConditionCard from '../chronic/ConditionCard';
import IncidentRecordCard from '../incidents/IncidentRecordCard';
import type { IncidentRecord } from '../incidents/incidentModel';
import LabResultCard from '../labResults/LabResultCard';
import {
  mapPatientLabPanelToRow,
  type LabResultRow,
} from '../labResults/labResultModel';
import { usePatientAppointments } from '../appointments/usePatientAppointments';

const defaultUserProfile = {
  name: 'Patient',
  id: '—',
  email: '—',
  avatarUrl: 'https://placehold.co/100x100/17A2B8/FFFFFF?text=PT',
  healthSummary: {
    bmi: 'N/A' as string | number,
    bmiCategory: 'Not recorded',
    heightDisplay: '—',
    weightDisplay: '—',
    bloodPressure: '—',
    heartRate: '—',
    lmd: '—',
    lastVisit: '—',
    allergies: 0,
    medications: 0,
  },
};

interface MetricTileProps {
  iconClass: string;
  title: string;
  value: string | number;
}

const MetricTile: React.FC<MetricTileProps> = ({ iconClass, title, value }) => (
  <div className="metric-tile" role="listitem">
    <i className={iconClass} aria-hidden />
    <div className="metric-details">
      <p className="metric-value">{value}</p>
      <p className="metric-title">{title}</p>
    </div>
  </div>
);

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'PT';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

/** Auto-created patient rows use this until Tab 14 is completed. */
function isGenericPatientRecordName(name: string): boolean {
  const t = name.trim().toLowerCase();
  return t === 'patient user' || t === 'patient';
}

/** e.g. JoseHernandez → Jose Hernandez + JH; jose@x.com → Jose + JO from local part. */
function splitLoginIntoWords(raw: string): string[] {
  const beforeAt = raw.includes('@') ? (raw.split('@')[0] || raw) : raw;
  const spaced = beforeAt.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return spaced.split(/[\s._+-]+/).filter(Boolean);
}

function displayNameAndInitialsFromLogin(username: string | null): {
  displayName: string;
  initials: string;
} {
  if (!username?.trim()) {
    return { displayName: 'Patient', initials: 'PT' };
  }
  const words = splitLoginIntoWords(username.trim());
  if (words.length === 0) {
    return { displayName: 'Patient', initials: 'PT' };
  }
  const title = (w: string) =>
    (w[0]?.toUpperCase() ?? '') + w.slice(1).toLowerCase();
  if (words.length >= 2) {
    const displayName = words.map(title).join(' ');
    const initials = `${words[0][0] ?? ''}${
      words[words.length - 1][0] ?? ''
    }`.toUpperCase();
    return { displayName, initials };
  }
  const w = words[0];
  return {
    displayName: title(w),
    initials: w.slice(0, 2).toUpperCase(),
  };
}

function healthSummaryNeedsSetup(hs: typeof defaultUserProfile.healthSummary): boolean {
  return (
    hs.bmi === 'N/A' &&
    hs.lastVisit === '—' &&
    hs.allergies === 0 &&
    hs.medications === 0
  );
}

function sidebarIdentityFromDashboard(
  apiPatientName: string,
  loginUsername: string | null
): { displayName: string; initials: string } {
  if (isGenericPatientRecordName(apiPatientName)) {
    return displayNameAndInitialsFromLogin(loginUsername);
  }
  const displayName = apiPatientName.trim() || 'Patient';
  return {
    displayName,
    initials: initialsFromName(displayName),
  };
}

const Tab1: React.FC = () => {
  const { t, i18n } = useTranslation();
  const history = useHistory();
  const { logout, username } = useAuth();
  const staffGate = useStaffElevationGate();
  const [user, setUser] = React.useState(defaultUserProfile);
  const [detail, setDetail] = React.useState<DashboardDetail | null>(null);
  const [loadingSummary, setLoadingSummary] = React.useState(true);
  const [summaryError, setSummaryError] = React.useState<string | null>(null);
  const [dashboardRefreshKey, setDashboardRefreshKey] = React.useState(0);
  const { appointments } = usePatientAppointments(username, dashboardRefreshKey);
  const [chronicConditions, setChronicConditions] = React.useState<
    Tab5ChronicCondition[]
  >([]);
  const [chronicLoading, setChronicLoading] = React.useState(true);
  const [chronicError, setChronicError] = React.useState<string | null>(null);

  const [labPanels, setLabPanels] = React.useState<PatientLabPanelApi[]>([]);
  const [labRows, setLabRows] = React.useState<LabResultRow[]>([]);
  const [labLoading, setLabLoading] = React.useState(true);
  const [labError, setLabError] = React.useState<string | null>(null);

  const [incidentRows, setIncidentRows] = React.useState<IncidentRecord[]>([]);
  const [incidentLoading, setIncidentLoading] = React.useState(true);
  const [incidentError, setIncidentError] = React.useState<string | null>(null);
  const [onboardingBannerKey, setOnboardingBannerKey] = React.useState(0);
  const [showLogoutAlert, setShowLogoutAlert] = React.useState(false);

  const onboardingRecord = React.useMemo(
    () => loadOnboarding(username),
    [username, onboardingBannerKey]
  );
  const showOnboardingBanner = shouldShowDashboardOnboardingBanner(username);
  const onboardingStepsDone = onboardingRecord
    ? [onboardingRecord.steps.profile, onboardingRecord.steps.upload].filter(Boolean).length
    : 0;

  React.useEffect(() => {
    const onFocus = () => setDashboardRefreshKey((k) => k + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setChronicLoading(true);
      setChronicError(null);
      try {
        const rows = await fetchTab5ChronicConditions(username);
        if (!cancelled) setChronicConditions(rows);
      } catch (e) {
        if (!cancelled) {
          setChronicError(
            e instanceof Error
              ? e.message
              : 'Could not load chronic conditions.'
          );
          setChronicConditions([]);
        }
      } finally {
        if (!cancelled) setChronicLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [username, dashboardRefreshKey]);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoadingSummary(true);
        const d = await fetchDashboardDetail(username);
        if (cancelled) return;
        setDetail(d);
        const { displayName, initials } = sidebarIdentityFromDashboard(
          d.name,
          username
        );
        setUser((prev) => ({
          ...prev,
          name: displayName,
          id: d.id,
          email: d.email,
          healthSummary: d.healthSummary,
          avatarUrl: `https://placehold.co/100x100/17A2B8/FFFFFF?text=${encodeURIComponent(
            initials
          )}`,
        }));
        setSummaryError(null);
      } catch (e) {
        if (cancelled) return;
        setDetail(null);
        setSummaryError(
          formatSessionOrTokenErrorForUi(
            e instanceof Error ? e.message : 'Could not load dashboard summary.'
          )
        );
      } finally {
        if (!cancelled) setLoadingSummary(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [username, dashboardRefreshKey]);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLabLoading(true);
      setLabError(null);
      try {
        const { panels } = await fetchPatientLabPanels(username);
        if (!cancelled) {
          setLabPanels(panels);
          setLabRows(panels.map(mapPatientLabPanelToRow));
        }
      } catch (e) {
        if (!cancelled) {
          setLabError(
            e instanceof Error ? e.message : 'Could not load lab results.'
          );
          setLabPanels([]);
          setLabRows([]);
        }
      } finally {
        if (!cancelled) setLabLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [username, dashboardRefreshKey]);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIncidentLoading(true);
      setIncidentError(null);
      try {
        const { incidents } = await fetchTab6Data(username);
        if (!cancelled) {
          setIncidentRows(incidents.map(mapIncidentApiToTab6Record));
        }
      } catch (e) {
        if (!cancelled) {
          setIncidentError(
            e instanceof Error ? e.message : 'Could not load incidents.'
          );
          setIncidentRows([]);
        }
      } finally {
        if (!cancelled) setIncidentLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [username, dashboardRefreshKey]);

  const hs = user.healthSummary;

  const labAttention = React.useMemo(() => countLabAttention(labPanels), [labPanels]);

  const dashboardNextSteps = React.useMemo(() => {
    if (loadingSummary) return [];
    return trimNextStepsForDashboard(
      buildNextSteps(
        detail,
        appointments,
        labAttention.pending,
        labAttention.newPanels,
        { surface: 'dashboard', username },
        t
      ),
      4
    );
  }, [
    loadingSummary,
    detail,
    appointments,
    labAttention.pending,
    labAttention.newPanels,
    username,
    t,
    i18n.language,
  ]);

  const welcomeGreeting = greetingForDisplayName(user.name, t);
  const welcomeContext = welcomeContextLine(
    appointments,
    loadingSummary,
    Boolean(summaryError),
    t
  );

  const handleLogout = () => {
    void logout();
  };

  const requestAddEntry = (path: OpenAddEntryPath, hint: string) => {
    staffGate.gateEdit(() => {
      queueOpenAddEntry(path);
      history.push(path);
    }, hint);
  };

  return (
    <div className="profile-container">
      <header className="profile-header">
        <div className="logo">{t('dashboard.title')}</div>
        {username && (
          <span style={{ marginRight: 12, fontSize: '0.9rem', opacity: 0.9 }}>
            {username}
          </span>
        )}
        <button type="button" className="logout-btn" onClick={() => setShowLogoutAlert(true)}>
          <i className="fas fa-sign-out-alt"></i> {t('common.logout')}
        </button>
      </header>

      <IonAlert
        isOpen={showLogoutAlert}
        onDidDismiss={() => setShowLogoutAlert(false)}
        header={t('settings.confirmLogoutTitle')}
        message={t('settings.confirmLogoutMessage')}
        buttons={[
          { text: t('common.cancel'), role: 'cancel', cssClass: 'secondary' },
          { text: t('settings.confirmLogoutButton'), handler: handleLogout },
        ]}
      />


      <main className="profile-main">
        <aside className="profile-sidebar profile-sidebar--compact">
          <div className="user-card user-card--compact">
            <img
              src={user.avatarUrl}
              alt=""
              className="user-avatar user-avatar--compact user-avatar--glass"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src =
                  'https://placehold.co/100x100/17A2B8/FFFFFF?text=PT';
              }}
            />
            <h2 className="user-name">{user.name}</h2>
            <p className="user-id">{user.id}</p>
            <div className="patient-mini-profile" aria-label={t('dashboard.patientSummaryAria')}>
              <h3 className="patient-mini-profile__title">{t('dashboard.patientSnapshot')}</h3>
              <div className="patient-mini-profile__grid">
                <span className="patient-mini-profile__label">{t('dashboard.dob')}</span>
                <span className="patient-mini-profile__value">
                  {detail?.patientProfile.dateOfBirth || '—'}
                </span>
                <span className="patient-mini-profile__label">{t('dashboard.blood')}</span>
                <span className="patient-mini-profile__value">
                  {detail?.patientProfile.bloodType || '—'}
                </span>
                <span className="patient-mini-profile__label">{t('dashboard.sex')}</span>
                <span className="patient-mini-profile__value">
                  {detail?.patientProfile.sexAtBirth || '—'}
                </span>
                <span className="patient-mini-profile__label">{t('dashboard.phone')}</span>
                <span className="patient-mini-profile__value">
                  {detail?.patientProfile.phone || '—'}
                </span>
                <div className="patient-mini-profile__email-row">
                  <span className="patient-mini-profile__label">{t('dashboard.email')}</span>
                  <span className="patient-mini-profile__value patient-mini-profile__value--email">
                    {detail?.patientProfile.email || user.email || '—'}
                  </span>
                </div>
              </div>
            </div>
            <p className="user-card__hint">{t('dashboard.careOverviewHint')}</p>
            <a href="/tab14" className="user-card__profile-link">
              {t('dashboard.updatePatientInfo')}
            </a>
          </div>

          <nav className="profile-nav">
            <a href="/tab1" className="nav-item active" aria-current="page">
              <i className="fas fa-home"></i> {t('nav.dashboard')}
            </a>
            <a href="/tab2" className="nav-item">
              <i className="fas fa-chart-line"></i> {t('nav.quickStatus')}
            </a>
            <a href="/tab4" className="nav-item">
              <i className="fas fa-calendar-check"></i> {t('nav.appointments')}
            </a>
            <a href="/tab7" className="nav-item">
              <i className="fas fa-vial"></i> {t('nav.labResults')}
            </a>
            <a href="/tab6" className="nav-item">
              <i className="fas fa-clipboard-list"></i> {t('nav.incidentRecords')}
            </a>
            <a href="/tab5" className="nav-item">
              <i className="fas fa-notes-medical"></i> {t('nav.patientHistory')}
            </a>
            <a href="/tab12" className="nav-item">
              <i className="fas fa-id-card"></i> {t('nav.patientInsurance')}
            </a>
            <a href="/tab13" className="nav-item">
              <i className="fas fa-user-shield"></i> {t('nav.adminPanel')}
            </a>
            <a href="/tab11" className="nav-item">
              <i className="fas fa-cog"></i> {t('nav.settings')}
            </a>
          </nav>
        </aside>

        <section className="dashboard-content">
          {showOnboardingBanner && (
            <OnboardingBanner
              completedSteps={onboardingStepsDone}
              totalSteps={2}
              onDismiss={() => {
                skipOnboarding(username);
                setOnboardingBannerKey((k) => k + 1);
              }}
            />
          )}

          <DashboardHomeHero greeting={welcomeGreeting} contextLine={welcomeContext} />

          <DashboardNextSteps steps={dashboardNextSteps} loading={loadingSummary} />

          {!loadingSummary && healthSummaryNeedsSetup(hs) && (
            <div className="dashboard-setup-strip" role="region" aria-label={t('dashboard.getStartedAria')}>
              <p>{t('dashboard.setupStrip')}</p>
              <a href="/tab14" className="book-btn dashboard-setup-strip__btn">
                {t('dashboard.completeIntake')}
              </a>
            </div>
          )}

          <header className="dashboard-tab-section">
            <div className="dashboard-tab-section__titles">
              <h1 className="dashboard-tab-section__title">
                <i className="fas fa-heartbeat"></i> {t('dashboard.healthMetrics')}
              </h1>
              <p className="dashboard-tab-section__subtitle">
                {t('dashboard.healthMetricsSubtitle')}
                {loadingSummary ? ` ${t('dashboard.healthMetricsSyncing')}` : ''}.
                {hs.bmi !== 'N/A' && hs.bmiCategory !== 'Not recorded'
                  ? ` ${t('dashboard.bmiRecorded', { bmi: hs.bmi, category: hs.bmiCategory })}`
                  : ` ${t('dashboard.bmiHint')}`}
                {' '}
                {t('dashboard.openOtherTabs')}
              </p>
            </div>
          </header>
          {summaryError && (
            <p className="tab1-api-warning" role="alert">
              {t('dashboard.summaryError', { error: summaryError })}
            </p>
          )}

          <div className="metrics-grid-scroll">
            <div className="metrics-grid" role="list" aria-label={t('dashboard.metricsAria')}>
              <MetricTile iconClass="fas fa-heartbeat" title={t('dashboard.bmiScore')} value={hs.bmi} />
              <MetricTile iconClass="fas fa-ruler-vertical" title={t('dashboard.height')} value={hs.heightDisplay} />
              <MetricTile iconClass="fas fa-weight" title={t('dashboard.weight')} value={hs.weightDisplay} />
              <MetricTile iconClass="fas fa-heartbeat" title={t('dashboard.vitalsUpdated')} value={hs.lmd} />
              <MetricTile
                iconClass="fas fa-tachometer-alt"
                title={t('dashboard.bpHeartRate')}
                value={
                  hs.bloodPressure !== '—'
                    ? hs.bloodPressure
                    : hs.heartRate !== '—'
                      ? hs.heartRate
                      : '—'
                }
              />
              <MetricTile iconClass="fas fa-calendar-alt" title={t('dashboard.lastVisit')} value={hs.lastVisit} />
              <MetricTile iconClass="fas fa-allergies" title={t('dashboard.knownAllergies')} value={hs.allergies} />
              <MetricTile iconClass="fas fa-pills" title={t('dashboard.activeMeds')} value={hs.medications} />
            </div>
          </div>

          <header className="dashboard-tab-section dashboard-tab-section--secondary">
            <div className="dashboard-tab-section__titles">
              <h2 className="dashboard-tab-section__title dashboard-tab-section__title--h2">
                <i className="fas fa-calendar-check"></i> {t('dashboard.upcomingAppointments')}
              </h2>
              <p className="dashboard-tab-section__subtitle">
                {t('dashboard.appointmentsSubtitle')}
              </p>
            </div>
            <DashboardSectionActions
              viewHref="/tab4"
              viewLabel={t('dashboard.appointmentsTab')}
              addLabel={t('dashboard.addAppointment')}
              onAddEntry={() =>
                requestAddEntry('/tab4', t('dashboard.staffHintAppointments'))
              }
            />
          </header>

          {appointments.length > 0 ? (
            <div className="appointments-list dashboard-appointments">
              {appointments.map((appt) => (
                <AppointmentCard
                  key={appt.id}
                  appt={appt}
                  manageHref="/tab4"
                  manageLabel={t('common.manage')}
                />
              ))}
            </div>
          ) : (
            <div className="dashboard-empty-strip">
              <p>{t('dashboard.noAppointmentsExtended')}</p>
            </div>
          )}

          <header className="dashboard-tab-section dashboard-tab-section--secondary">
            <div className="dashboard-tab-section__titles">
              <h2 className="dashboard-tab-section__title dashboard-tab-section__title--h2">
                <i className="fas fa-vial"></i> {t('dashboard.labResults')}
              </h2>
              <p className="dashboard-tab-section__subtitle">
                {t('dashboard.labResultsSubtitleLong')}
              </p>
            </div>
            <DashboardSectionActions
              viewHref="/tab7"
              viewLabel={t('dashboard.labResultsTab')}
              addLabel={t('dashboard.addLabResult')}
              onAddEntry={() =>
                requestAddEntry('/tab7', t('dashboard.staffHintLabs'))
              }
            />
          </header>

          {labLoading && (
            <p className="content-subtitle dashboard-preview-block">
              {t('dashboard.loadingLabs')}
            </p>
          )}
          {labError && !labLoading && (
            <p
              className="content-subtitle dashboard-preview-block"
              style={{ color: '#ffcece' }}
            >
              {formatSessionOrTokenErrorForUi(labError)}
            </p>
          )}
          {!labLoading && !labError && labRows.length > 0 && (
            <div className="results-list results-list--dashboard dashboard-preview-block">
              {labRows.map((result) => (
                <LabResultCard key={result.id} result={result} />
              ))}
            </div>
          )}
          {!labLoading && !labError && labRows.length === 0 && (
            <div className="dashboard-empty-strip dashboard-preview-block">
              <p>{t('dashboard.noLabsExtended')}</p>
            </div>
          )}

          <header className="dashboard-tab-section dashboard-tab-section--secondary">
            <div className="dashboard-tab-section__titles">
              <h2 className="dashboard-tab-section__title dashboard-tab-section__title--h2">
                <i className="fas fa-clipboard-list"></i> {t('dashboard.incidentRecords')}
              </h2>
              <p className="dashboard-tab-section__subtitle">
                {t('dashboard.incidentSubtitleLong')}
              </p>
            </div>
            <DashboardSectionActions
              viewHref="/tab6"
              viewLabel={t('dashboard.incidentsTab')}
              addLabel={t('dashboard.logIncident')}
              onAddEntry={() =>
                requestAddEntry('/tab6', t('dashboard.staffHintIncidents'))
              }
            />
          </header>

          {incidentLoading && (
            <p className="content-subtitle dashboard-preview-block">
              {t('dashboard.loadingIncidents')}
            </p>
          )}
          {incidentError && !incidentLoading && (
            <p
              className="content-subtitle dashboard-preview-block"
              style={{ color: '#ffcece' }}
            >
              {formatSessionOrTokenErrorForUi(incidentError)}
            </p>
          )}
          {!incidentLoading && !incidentError && incidentRows.length > 0 && (
            <div className="incidents-list incidents-list--dashboard dashboard-preview-block">
              {incidentRows.map((incident) => (
                <IncidentRecordCard key={incident.id} incident={incident} />
              ))}
            </div>
          )}
          {!incidentLoading && !incidentError && incidentRows.length === 0 && (
            <div className="dashboard-empty-strip">
              <p>{t('dashboard.noIncidentsExtended')}</p>
            </div>
          )}

          <header className="dashboard-tab-section dashboard-tab-section--secondary">
            <div className="dashboard-tab-section__titles">
              <h2 className="dashboard-tab-section__title dashboard-tab-section__title--h2">
                <i className="fas fa-notes-medical"></i> {t('dashboard.chronicConditions')}
              </h2>
              <p className="dashboard-tab-section__subtitle">
                {t('dashboard.chronicSubtitleLong')}
              </p>
            </div>
            <DashboardSectionActions
              viewHref="/tab5"
              viewLabel={t('dashboard.chronicTab')}
              addLabel={t('dashboard.addCondition')}
              onAddEntry={() =>
                requestAddEntry('/tab5', t('dashboard.staffHintChronic'))
              }
            />
          </header>

          {chronicLoading && (
            <p className="content-subtitle dashboard-preview-block">
              {t('dashboard.loadingChronic')}
            </p>
          )}
          {chronicError && !chronicLoading && (
            <p
              className="content-subtitle dashboard-preview-block"
              style={{ color: '#ffcece' }}
            >
              {chronicError}
            </p>
          )}
          {!chronicLoading && !chronicError && chronicConditions.length > 0 && (
            <div className="conditions-list conditions-list--dashboard dashboard-preview-block">
              {chronicConditions.map((c, idx) => (
                <ConditionCard
                  key={
                    c.apiId != null
                      ? `chronic-${c.apiId}`
                      : `chronic-draft-${idx}-${c.diseaseId}`
                  }
                  condition={c}
                  manageHref="/tab5"
                  manageLabel={t('common.manage')}
                />
              ))}
            </div>
          )}
          {!chronicLoading && !chronicError && chronicConditions.length === 0 && (
            <div className="dashboard-empty-strip">
              <p>{t('dashboard.noChronicExtended')}</p>
            </div>
          )}
        </section>
      </main>

      <StaffElevationModal
        open={staffGate.staffModalOpen}
        titleId="dashboard-staff-modal-title"
        hint={staffGate.staffHint}
        username={staffGate.staffUsername}
        password={staffGate.staffPassword}
        submitting={staffGate.staffSubmitting}
        error={staffGate.staffModalError}
        onUsernameChange={staffGate.setStaffUsername}
        onPasswordChange={staffGate.setStaffPassword}
        onClose={staffGate.closeStaffModal}
        onSubmit={(e) => void staffGate.submitStaffModal(e)}
      />
    </div>
  );
};

export default Tab1;
