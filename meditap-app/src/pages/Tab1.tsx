import React from 'react';
import { useHistory } from 'react-router-dom';
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
        { surface: 'dashboard', username }
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
  ]);

  const welcomeGreeting = greetingForDisplayName(user.name);
  const welcomeContext = welcomeContextLine(
    appointments,
    loadingSummary,
    Boolean(summaryError)
  );

  const requestAddEntry = (path: OpenAddEntryPath, hint: string) => {
    staffGate.gateEdit(() => {
      queueOpenAddEntry(path);
      history.push(path);
    }, hint);
  };

  return (
    <div className="profile-container">
      <header className="profile-header">
        <div className="logo">MediTap Dashboard</div>
        {username && (
          <span style={{ marginRight: 12, fontSize: '0.9rem', opacity: 0.9 }}>
            {username}
          </span>
        )}
        <button type="button" className="logout-btn" onClick={logout}>
          <i className="fas fa-sign-out-alt"></i> Logout
        </button>
      </header>

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
            <div className="patient-mini-profile" aria-label="Patient summary">
              <h3 className="patient-mini-profile__title">Patient Snapshot</h3>
              <div className="patient-mini-profile__grid">
                <span className="patient-mini-profile__label">DOB</span>
                <span className="patient-mini-profile__value">
                  {detail?.patientProfile.dateOfBirth || '—'}
                </span>
                <span className="patient-mini-profile__label">Blood</span>
                <span className="patient-mini-profile__value">
                  {detail?.patientProfile.bloodType || '—'}
                </span>
                <span className="patient-mini-profile__label">Sex</span>
                <span className="patient-mini-profile__value">
                  {detail?.patientProfile.sexAtBirth || '—'}
                </span>
                <span className="patient-mini-profile__label">Phone</span>
                <span className="patient-mini-profile__value">
                  {detail?.patientProfile.phone || '—'}
                </span>
                <div className="patient-mini-profile__email-row">
                  <span className="patient-mini-profile__label">Email</span>
                  <span className="patient-mini-profile__value patient-mini-profile__value--email">
                    {detail?.patientProfile.email || user.email || '—'}
                  </span>
                </div>
              </div>
            </div>
            <p className="user-card__hint">
              Care overview and schedules — details live in each section.
            </p>
            <a href="/tab14" className="user-card__profile-link">
              Update patient information
            </a>
          </div>

          <nav className="profile-nav">
            <a href="/tab1" className="nav-item active" aria-current="page">
              <i className="fas fa-home"></i> Dashboard
            </a>
            <a href="/tab2" className="nav-item">
              <i className="fas fa-chart-line"></i> Quick Status
            </a>
            <a href="/tab4" className="nav-item">
              <i className="fas fa-calendar-check"></i> Appointments
            </a>
            <a href="/tab7" className="nav-item">
              <i className="fas fa-vial"></i> Lab Results
            </a>
            <a href="/tab6" className="nav-item">
              <i className="fas fa-clipboard-list"></i> Incident Records
            </a>
            <a href="/tab5" className="nav-item">
              <i className="fas fa-notes-medical"></i> Patient History
            </a>
            <a href="/tab12" className="nav-item">
              <i className="fas fa-id-card"></i> Patient Insurance
            </a>
            <a href="/tab13" className="nav-item">
              <i className="fas fa-user-shield"></i> Admin Panel
            </a>
            <a href="/tab11" className="nav-item">
              <i className="fas fa-cog"></i> Settings
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
            <div className="dashboard-setup-strip" role="region" aria-label="Get started">
              <p>
                Your health summary is still empty. Complete patient intake or upload a document
                to populate BMI, allergies, medications, and more.
              </p>
              <a href="/tab14" className="book-btn dashboard-setup-strip__btn">
                Complete intake
              </a>
            </div>
          )}

          <header className="dashboard-tab-section">
            <div className="dashboard-tab-section__titles">
              <h1 className="dashboard-tab-section__title">
                <i className="fas fa-heartbeat"></i> Health metrics
              </h1>
              <p className="dashboard-tab-section__subtitle">
                At-a-glance summary from your record
                {loadingSummary ? ' (syncing…)' : ''}. Open other tabs for full
                detail.
              </p>
            </div>
          </header>
          {summaryError && (
            <p className="tab1-api-warning" role="alert">
              Could not load live summary: {summaryError}
            </p>
          )}

          <div className="metrics-grid-scroll">
            <div className="metrics-grid" role="list" aria-label="Health metrics summary">
              <MetricTile
                iconClass="fas fa-heartbeat"
                title="BMI Score"
                value={hs.bmi}
              />
              <MetricTile
                iconClass="fas fa-heartbeat"
                title="BMI Last Mod. by"
                value={hs.lmd}
              />
              <MetricTile
                iconClass="fas fa-calendar-alt"
                title="Last Visit"
                value={hs.lastVisit}
              />
              <MetricTile
                iconClass="fas fa-allergies"
                title="Known Allergies"
                value={hs.allergies}
              />
              <MetricTile
                iconClass="fas fa-pills"
                title="Active Meds"
                value={hs.medications}
              />
            </div>
          </div>

          <header className="dashboard-tab-section dashboard-tab-section--secondary">
            <div className="dashboard-tab-section__titles">
              <h2 className="dashboard-tab-section__title dashboard-tab-section__title--h2">
                <i className="fas fa-calendar-check"></i> Upcoming appointments
              </h2>
              <p className="dashboard-tab-section__subtitle">
                Your next scheduled visits with provider, date, and location.
              </p>
            </div>
            <DashboardSectionActions
              viewHref="/tab4"
              viewLabel="Appointments tab"
              addLabel="Add appointment"
              onAddEntry={() =>
                requestAddEntry(
                  '/tab4',
                  'Only staff or admin users can book appointments. Enter those credentials to add a new visit.'
                )
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
                  manageLabel="Manage"
                />
              ))}
            </div>
          ) : (
            <div className="dashboard-empty-strip">
              <p>No upcoming appointments. Use the buttons above to open the tab or add one with staff sign-in.</p>
            </div>
          )}

          <header className="dashboard-tab-section dashboard-tab-section--secondary">
            <div className="dashboard-tab-section__titles">
              <h2 className="dashboard-tab-section__title dashboard-tab-section__title--h2">
                <i className="fas fa-vial"></i> Lab results
              </h2>
              <p className="dashboard-tab-section__subtitle">
                Recent lab panels and collection dates; open a row on the full
                tab for individual results and reference ranges.
              </p>
            </div>
            <DashboardSectionActions
              viewHref="/tab7"
              viewLabel="Lab results tab"
              addLabel="Add lab result"
              onAddEntry={() =>
                requestAddEntry(
                  '/tab7',
                  'Only staff or admin users can add lab results. Enter those credentials to create a new panel.'
                )
              }
            />
          </header>

          {labLoading && (
            <p className="content-subtitle dashboard-preview-block">
              Loading lab results…
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
              <p>No lab reports in your record yet. Use the buttons above to view labs or add a result with staff sign-in.</p>
            </div>
          )}

          <header className="dashboard-tab-section dashboard-tab-section--secondary">
            <div className="dashboard-tab-section__titles">
              <h2 className="dashboard-tab-section__title dashboard-tab-section__title--h2">
                <i className="fas fa-clipboard-list"></i> Incident records
              </h2>
              <p className="dashboard-tab-section__subtitle">
                Injuries, accidents, and other clinical events logged in your
                chart with date and summary.
              </p>
            </div>
            <DashboardSectionActions
              viewHref="/tab6"
              viewLabel="Incidents tab"
              addLabel="Log incident"
              onAddEntry={() =>
                requestAddEntry(
                  '/tab6',
                  'Only staff or admin users can log incidents. Enter those credentials to add a new record.'
                )
              }
            />
          </header>

          {incidentLoading && (
            <p className="content-subtitle dashboard-preview-block">
              Loading incident records…
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
              <p>No incident records to show. Use the buttons above to open the tab or log one with staff sign-in.</p>
            </div>
          )}

          <header className="dashboard-tab-section dashboard-tab-section--secondary">
            <div className="dashboard-tab-section__titles">
              <h2 className="dashboard-tab-section__title dashboard-tab-section__title--h2">
                <i className="fas fa-notes-medical"></i> Chronic conditions
              </h2>
              <p className="dashboard-tab-section__subtitle">
                Ongoing and historical diagnoses with status and notes from your
                medical record.
              </p>
            </div>
            <DashboardSectionActions
              viewHref="/tab5"
              viewLabel="Chronic tab"
              addLabel="Add condition"
              onAddEntry={() =>
                requestAddEntry(
                  '/tab5',
                  'Only staff or admin users can add chronic conditions. Enter those credentials to create a new entry.'
                )
              }
            />
          </header>

          {chronicLoading && (
            <p className="content-subtitle dashboard-preview-block">
              Loading chronic conditions…
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
                  manageLabel="Manage"
                />
              ))}
            </div>
          )}
          {!chronicLoading && !chronicError && chronicConditions.length === 0 && (
            <div className="dashboard-empty-strip">
              <p>No chronic conditions on file yet. Use the buttons above to open the tab or add one with staff sign-in.</p>
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
