import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listAdminActivity,
  listHospitalsForAdmin,
  searchPatientsForAdmin,
  type AdminActivityApi,
  type PatientApi,
} from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useAdminPatient } from './AdminPatientContext';
import { formatPatientDisplayName } from './adminPatientStorage';
import { ADMIN_PATIENT_VIEW_PATHS } from './adminPatientViewPaths';
import './adminDashboard.css';

function isIncomplete(p: PatientApi): boolean {
  const missingName = !(p.given_name || '').trim() || !(p.family_name || '').trim();
  const missingDob = !(p.date_of_birth || '').trim();
  return missingName || missingDob;
}

function greetingForHour(d = new Date()): string {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function firstName(username: string | null): string {
  if (!username) return 'there';
  const part = username.split(/[._@\s-]/)[0] || username;
  return part.charAt(0).toUpperCase() + part.slice(1);
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

function activityIcon(action: string): string {
  const a = action.toLowerCase();
  if (a.includes('document')) return 'fa-file-medical';
  if (a.includes('hospital')) return 'fa-hospital';
  if (a.includes('login') || a.includes('auth')) return 'fa-sign-in-alt';
  if (a.includes('upload')) return 'fa-cloud-upload-alt';
  return 'fa-notes-medical';
}

function activityTone(action: string): string {
  const a = action.toLowerCase();
  if (a.includes('document') || a.includes('upload')) return 'violet';
  if (a.includes('hospital')) return 'teal';
  if (a.includes('login')) return 'blue';
  return 'orange';
}

type HomeStats = {
  patients: number;
  hospitals: number;
  incomplete: number;
  actionsToday: number;
};

/**
 * Admin portal landing — dashboard matching the professional admin UI mock.
 */
const AdminPortalHome: React.FC = () => {
  const { username } = useAuth();
  const { selected, clearPatient } = useAdminPatient();
  const [queue, setQueue] = useState<PatientApi[]>([]);
  const [activity, setActivity] = useState<AdminActivityApi[]>([]);
  const [stats, setStats] = useState<HomeStats>({
    patients: 0,
    hospitals: 0,
    incomplete: 0,
    actionsToday: 0,
  });
  const [selectedPatient, setSelectedPatient] = useState<PatientApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [patients, hospitals, events] = await Promise.all([
        searchPatientsForAdmin(''),
        listHospitalsForAdmin(),
        listAdminActivity(),
      ]);
      const incomplete = patients.filter(isIncomplete);
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const actionsToday = events.filter(
        (e) => new Date(e.created_at).getTime() >= startOfDay.getTime()
      ).length;

      setQueue(incomplete.slice(0, 6));
      setActivity(events.slice(0, 6));
      setStats({
        patients: patients.length,
        hospitals: hospitals.length,
        incomplete: incomplete.length,
        actionsToday,
      });

      if (selected?.patientId) {
        setSelectedPatient(
          patients.find((p) => p.patient_id === selected.patientId) || null
        );
      } else {
        setSelectedPatient(null);
      }
      setUpdatedAt(new Date());
    } catch {
      /* keep previous */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when selection changes
  }, [selected?.patientId]);

  const greeting = useMemo(() => greetingForHour(), []);

  const kpiCards = [
    {
      key: 'patients',
      label: 'Active patients',
      value: stats.patients,
      hint: loading ? 'Loading…' : 'In your clinic directory',
      icon: 'fa-user-injured',
      tone: 'blue',
    },
    {
      key: 'charts',
      label: 'Open charts',
      value: stats.incomplete,
      hint: loading ? 'Loading…' : 'Incomplete demographics',
      icon: 'fa-clipboard-list',
      tone: 'violet',
    },
    {
      key: 'hospitals',
      label: 'Hospitals',
      value: stats.hospitals,
      hint: loading ? 'Loading…' : 'Facilities on file',
      icon: 'fa-hospital',
      tone: 'teal',
    },
    {
      key: 'actions',
      label: 'Staff actions today',
      value: stats.actionsToday,
      hint: loading ? 'Loading…' : 'From the activity trail',
      icon: 'fa-heartbeat',
      tone: 'orange',
    },
  ];

  const quickLinks = [
    {
      to: '/admin-portal/patients',
      label: 'Patients',
      desc: 'Search and open charts',
      icon: 'fa-users',
      tone: 'blue',
    },
    {
      to: '/admin-portal/hospitals',
      label: 'Hospitals',
      desc: 'Facilities and locations',
      icon: 'fa-hospital',
      tone: 'teal',
    },
    {
      to: '/admin-portal/activity',
      label: 'Activity',
      desc: 'Staff action trail',
      icon: 'fa-bolt',
      tone: 'orange',
    },
    {
      to: '/admin-portal/panel',
      label: 'Admin panel',
      desc: 'Epic and facility ops',
      icon: 'fa-th-large',
      tone: 'violet',
    },
    {
      to: ADMIN_PATIENT_VIEW_PATHS.dashboard,
      label: 'Patient view',
      desc: 'Open chart inside admin workspace',
      icon: 'fa-user',
      tone: 'green',
    },
  ];

  return (
    <div className="admin-home">
      <header className="admin-home__hero">
        <div>
          <h1>
            {greeting}, {firstName(username)}
          </h1>
          <p>Review patients, facilities, and staff activity from one workspace.</p>
        </div>
        <button type="button" className="admin-home__ghost-btn" onClick={() => void load()}>
          <i className="fas fa-sync-alt" aria-hidden />
          Refresh dashboard
        </button>
      </header>

      <section className="admin-home__kpis" aria-label="Summary">
        {kpiCards.map((card) => (
          <article key={card.key} className={`admin-home__kpi admin-home__kpi--${card.tone}`}>
            <div className="admin-home__kpi-top">
              <span className="admin-home__kpi-label">{card.label}</span>
              <span className="admin-home__kpi-icon" aria-hidden>
                <i className={`fas ${card.icon}`} />
              </span>
            </div>
            <p className="admin-home__kpi-value">{card.value}</p>
            <p className="admin-home__kpi-hint">{card.hint}</p>
            <div className="admin-home__kpi-spark" aria-hidden />
          </article>
        ))}
      </section>

      <div className="admin-home__grid">
        <section className="admin-home__panel" aria-label="Quick access">
          <div className="admin-home__panel-head">
            <h2>Quick access</h2>
          </div>
          <div className="admin-home__quick-grid">
            {quickLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`admin-home__quick admin-home__quick--${link.tone}`}
              >
                <span className="admin-home__quick-icon" aria-hidden>
                  <i className={`fas ${link.icon}`} />
                </span>
                <strong>{link.label}</strong>
                <span>{link.desc}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="admin-home__panel admin-home__panel--patient" aria-label="Active patient">
          <div className="admin-home__panel-head">
            <h2>Active patient</h2>
            {selected ? (
              <button type="button" className="admin-home__text-btn" onClick={clearPatient}>
                Clear
              </button>
            ) : null}
          </div>
          {selected ? (
            <div className="admin-home__patient">
              <div className="admin-home__patient-title">
                <strong>{selected.displayName}</strong>
                <span>MRN · {selected.patientId.slice(0, 8).toUpperCase()}</span>
              </div>
              <dl className="admin-home__patient-dl">
                <div>
                  <dt>Date of birth</dt>
                  <dd>{selectedPatient?.date_of_birth || '—'}</dd>
                </div>
                <div>
                  <dt>Sex at birth</dt>
                  <dd>{selectedPatient?.sex_at_birth || '—'}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{selectedPatient?.email || '—'}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{selectedPatient?.phone || '—'}</dd>
                </div>
              </dl>
              <Link
                className="admin-home__primary-btn"
                to={`/admin-portal/patients/${selected.patientId}`}
              >
                Open patient hub
                <i className="fas fa-arrow-right" aria-hidden />
              </Link>
            </div>
          ) : (
            <div className="admin-home__empty">
              <i className="fas fa-user-plus" aria-hidden />
              <p>No patient selected. Search or open Patients to start on-behalf work.</p>
              <Link to="/admin-portal/patients" className="admin-home__primary-btn">
                Find a patient
                <i className="fas fa-arrow-right" aria-hidden />
              </Link>
            </div>
          )}
        </section>

        <section className="admin-home__panel" aria-label="Needs attention">
          <div className="admin-home__panel-head">
            <h2>Needs attention</h2>
            <button type="button" className="admin-home__icon-refresh" onClick={() => void load()} aria-label="Refresh">
              <i className="fas fa-sync-alt" aria-hidden />
            </button>
          </div>
          {queue.length === 0 ? (
            <div className="admin-home__caught-up">
              <span className="admin-home__check" aria-hidden>
                <i className="fas fa-check" />
              </span>
              <strong>You’re all caught up!</strong>
              <p>No incomplete charts in the current sample.</p>
              <span className="admin-home__updated">
                Last updated{' '}
                {updatedAt
                  ? relativeTime(updatedAt.toISOString()) || 'just now'
                  : '—'}
              </span>
            </div>
          ) : (
            <ul className="admin-home__queue">
              {queue.map((p) => (
                <li key={p.patient_id}>
                  <div>
                    <strong>{formatPatientDisplayName(p)}</strong>
                    <span>
                      {!(p.given_name || '').trim() || !(p.family_name || '').trim()
                        ? 'Missing name'
                        : 'Missing DOB'}
                    </span>
                  </div>
                  <Link to={`/admin-portal/patients/${p.patient_id}`}>Open</Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-home__panel" aria-label="Recent activity">
          <div className="admin-home__panel-head">
            <h2>Recent activity</h2>
            <Link to="/admin-portal/activity">View all</Link>
          </div>
          {activity.length === 0 ? (
            <p className="admin-home__muted">No staff activity logged yet.</p>
          ) : (
            <ul className="admin-home__activity">
              {activity.map((row) => (
                <li key={row.event_id}>
                  <span
                    className={`admin-home__activity-icon admin-home__activity-icon--${activityTone(row.action)}`}
                    aria-hidden
                  >
                    <i className={`fas ${activityIcon(row.action)}`} />
                  </span>
                  <div>
                    <strong>{row.action.replace(/[._]/g, ' ')}</strong>
                    <span>
                      {row.patient_label || row.actor_username || 'System'}
                    </span>
                  </div>
                  <time>{relativeTime(row.created_at)}</time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <footer className="admin-home__footer">
        <span>© {new Date().getFullYear()} MediTap. All rights reserved.</span>
        <nav aria-label="Legal">
          <a href="/privacy" target="_blank" rel="noopener noreferrer">
            Privacy policy
          </a>
          <a href="/terms" target="_blank" rel="noopener noreferrer">
            Terms of service
          </a>
          <a href="/tab10" target="_blank" rel="noopener noreferrer">
            Support
          </a>
        </nav>
      </footer>
    </div>
  );
};

export default AdminPortalHome;
