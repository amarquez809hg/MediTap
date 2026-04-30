import React from 'react';
import './Tab1.css';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchDashboardDetail,
  fetchPatientLabPanels,
  fetchTab5ChronicConditions,
  fetchTab6Data,
  formatSessionOrTokenErrorForUi,
  mapIncidentApiToTab6Record,
  type DashboardDetail,
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
import {
  loadAppointmentsFromStorage,
  type Appointment,
} from '../appointments/appointmentStorage';

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
  <div className="metric-tile">
    <i className={iconClass}></i>
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
  const { logout, username } = useAuth();
  const [user, setUser] = React.useState(defaultUserProfile);
  const [detail, setDetail] = React.useState<DashboardDetail | null>(null);
  const [loadingSummary, setLoadingSummary] = React.useState(true);
  const [summaryError, setSummaryError] = React.useState<string | null>(null);
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [dashboardRefreshKey, setDashboardRefreshKey] = React.useState(0);
  const [chronicConditions, setChronicConditions] = React.useState<
    Tab5ChronicCondition[]
  >([]);
  const [chronicLoading, setChronicLoading] = React.useState(true);
  const [chronicError, setChronicError] = React.useState<string | null>(null);

  const [labRows, setLabRows] = React.useState<LabResultRow[]>([]);
  const [labLoading, setLabLoading] = React.useState(true);
  const [labError, setLabError] = React.useState<string | null>(null);

  const [incidentRows, setIncidentRows] = React.useState<IncidentRecord[]>([]);
  const [incidentLoading, setIncidentLoading] = React.useState(true);
  const [incidentError, setIncidentError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const onFocus = () => setDashboardRefreshKey((k) => k + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  React.useEffect(() => {
    const stored = loadAppointmentsFromStorage(username);
    setAppointments(stored ?? []);
  }, [username, dashboardRefreshKey]);

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
          setLabRows(panels.map(mapPatientLabPanelToRow));
        }
      } catch (e) {
        if (!cancelled) {
          setLabError(
            e instanceof Error ? e.message : 'Could not load lab results.'
          );
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
              className="user-avatar user-avatar--compact"
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

          <div className="metrics-grid">
            <MetricTile
              iconClass="fas fa-heartbeat"
              title="BMI Score"
              value={hs.bmi}
            />
            <MetricTile
              iconClass="fas fa-heartbeat"
              title="BMI Last Mod. by: "
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

          <header className="dashboard-tab-section dashboard-tab-section--secondary">
            <div className="dashboard-tab-section__titles">
              <h2 className="dashboard-tab-section__title dashboard-tab-section__title--h2">
                <i className="fas fa-calendar-check"></i> Upcoming appointments
              </h2>
              <p className="dashboard-tab-section__subtitle">
                Same layout as the Appointments tab — manage visits there.
              </p>
            </div>
            <div className="dashboard-tab-section__actions">
              <a href="/tab4" className="book-btn dashboard-tab-section__btn">
                <i className="fas fa-external-link-alt"></i> Open appointments tab
              </a>
            </div>
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
              <p>No upcoming appointments.</p>
              <a href="/tab4" className="info-button">
                Go to appointments
              </a>
            </div>
          )}

          <header className="dashboard-tab-section dashboard-tab-section--secondary">
            <div className="dashboard-tab-section__titles">
              <h2 className="dashboard-tab-section__title dashboard-tab-section__title--h2">
                <i className="fas fa-vial"></i> Lab results
              </h2>
              <p className="dashboard-tab-section__subtitle">
                Same expandable cards as the Lab Results tab — tap a row for
                components and reference ranges.
              </p>
            </div>
            <div className="dashboard-tab-section__actions">
              <a href="/tab7" className="book-btn dashboard-tab-section__btn">
                <i className="fas fa-external-link-alt"></i> Open lab results tab
              </a>
            </div>
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
            <div className="lab-no-results dashboard-preview-block">
              <p>No lab reports in your record.</p>
            </div>
          )}

          <header className="dashboard-tab-section dashboard-tab-section--secondary">
            <div className="dashboard-tab-section__titles">
              <h2 className="dashboard-tab-section__title dashboard-tab-section__title--h2">
                <i className="fas fa-clipboard-list"></i> Incident records
              </h2>
              <p className="dashboard-tab-section__subtitle">
                Same incident cards as the Incident Records tab.
              </p>
            </div>
            <div className="dashboard-tab-section__actions">
              <a href="/tab6" className="book-btn dashboard-tab-section__btn">
                <i className="fas fa-external-link-alt"></i> Open incidents tab
              </a>
            </div>
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
              <p>No incident records to show.</p>
              <a href="/tab6" className="info-button">
                Go to incidents
              </a>
            </div>
          )}

          <header className="dashboard-tab-section dashboard-tab-section--secondary">
            <div className="dashboard-tab-section__titles">
              <h2 className="dashboard-tab-section__title dashboard-tab-section__title--h2">
                <i className="fas fa-notes-medical"></i> Chronic conditions
              </h2>
              <p className="dashboard-tab-section__subtitle">
                Live from your record — add or edit on the Chronic Conditions
                tab.
              </p>
            </div>
            <div className="dashboard-tab-section__actions">
              <a href="/tab5" className="book-btn dashboard-tab-section__btn">
                <i className="fas fa-external-link-alt"></i> Open chronic tab
              </a>
            </div>
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
              <p>No chronic conditions on file yet.</p>
              <a href="/tab5" className="info-button">
                Add in chronic conditions
              </a>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Tab1;
