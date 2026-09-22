import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import GoBackButton from '../components/GoBackButton';
import { useAuth } from '../contexts/AuthContext';
import { useAdminPatient } from './AdminPatientContext';
import { ADMIN_LOGIN_PATH, ADMIN_PORTAL_HOME } from './portalPaths';
import { ADMIN_PATIENT_VIEW_BASE, ADMIN_PATIENT_VIEW_PATHS } from './adminPatientViewPaths';
import './portalShell.css';
import './adminDashboard.css';

type AdminPortalLayoutProps = {
  children: React.ReactNode;
};

type NavItem = {
  to?: string;
  label: string;
  icon: string;
  soon?: boolean;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Patient care',
    items: [
      { to: '/admin-portal/patients', label: 'Patients', icon: 'fa-users' },
      { to: '/admin-portal/cards', label: 'Profile cards', icon: 'fa-id-card' },
      { to: '/admin-portal/documents', label: 'Document review', icon: 'fa-folder-open' },
      { to: '/admin-portal/hospitals', label: 'Hospitals', icon: 'fa-hospital' },
      { to: '/admin-portal/charts', label: 'Clinical charts', icon: 'fa-notes-medical' },
      { to: ADMIN_PATIENT_VIEW_PATHS.appointments, label: 'Scheduling', icon: 'fa-calendar-check' },
      { to: '/admin-portal/activity', label: 'Activity', icon: 'fa-bolt' },
      { to: ADMIN_PATIENT_VIEW_PATHS.dashboard, label: 'Patient view', icon: 'fa-user' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { to: '/admin-portal/panel', label: 'Admin panel', icon: 'fa-th-large' },
      { label: 'User management', icon: 'fa-user-shield', soon: true },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Settings', icon: 'fa-cog', soon: true },
      { to: '/admin-portal/activity', label: 'Audit log', icon: 'fa-clipboard-list' },
      { label: 'Reports', icon: 'fa-chart-bar', soon: true },
      { to: '/admin-portal/panel', label: 'Integrations', icon: 'fa-plug' },
    ],
  },
];

function displayNameFromUsername(username: string | null): string {
  if (!username) return 'Administrator';
  const cleaned = username.replace(/[._]/g, ' ').trim();
  if (!cleaned) return username;
  return cleaned
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function initialsFromUsername(username: string | null): string {
  const name = displayNameFromUsername(username);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (parts[0] || 'A').slice(0, 2).toUpperCase();
}

function isNavActive(pathname: string, to: string): boolean {
  if (to === '/admin-portal/home') {
    return pathname === '/admin-portal/home' || pathname === '/admin-portal';
  }
  if (to.startsWith('/admin-portal/patients')) {
    return pathname.startsWith('/admin-portal/patients');
  }
  if (to === '/admin-portal/charts') {
    return pathname.startsWith('/admin-portal/charts');
  }
  if (to.startsWith(ADMIN_PATIENT_VIEW_BASE)) {
    // Exact section match — don't mark “Patient view” active for every sub-route.
    if (to === ADMIN_PATIENT_VIEW_BASE) {
      return (
        pathname === ADMIN_PATIENT_VIEW_BASE ||
        pathname === `${ADMIN_PATIENT_VIEW_BASE}/`
      );
    }
    return pathname === to || pathname.startsWith(`${to}/`);
  }
  return pathname === to || pathname.startsWith(`${to}/`);
}

/**
 * Staff / org-admin shell — sidebar + top bar (admin dashboard UI v1).
 */
const AdminPortalLayout: React.FC<AdminPortalLayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const { logout, username, portalRole } = useAuth();
  const { selected, clearPatient } = useAdminPatient();
  const location = useLocation();
  const history = useHistory();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const onLogout = () => {
    clearPatient();
    logout({ redirectTo: ADMIN_LOGIN_PATH });
  };

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    closeMobile();
    setMenuOpen(false);
  }, [location.pathname, closeMobile]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const input = document.getElementById('admin-global-search');
        input?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const prettyName = useMemo(() => displayNameFromUsername(username), [username]);
  const initials = useMemo(() => initialsFromUsername(username), [username]);
  const roleLabel =
    portalRole === 'org_admin'
      ? 'Organization admin'
      : portalRole === 'staff'
        ? 'Administrator'
        : 'Staff';

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    history.push(
      q
        ? `/admin-portal/patients?q=${encodeURIComponent(q)}`
        : '/admin-portal/patients'
    );
  };

  return (
    <div
      className={`admin-dash portal-shell portal-shell--admin${collapsed ? ' admin-dash--collapsed' : ''}${mobileOpen ? ' admin-dash--mobile-open' : ''}`}
      data-portal="admin"
    >
      <button
        type="button"
        className="admin-dash__backdrop"
        aria-label="Close navigation"
        onClick={closeMobile}
      />

      <aside className="admin-dash__sidebar" aria-label="Admin navigation">
        <div className="admin-dash__brand">
          <span className="admin-dash__logo" aria-hidden>
            <i className="fas fa-plus" />
          </span>
          {!collapsed ? (
            <div className="admin-dash__brand-text">
              <strong>MediTap</strong>
              <span>Admin portal</span>
            </div>
          ) : null}
        </div>

        <nav className="admin-dash__nav">
          <Link
            to={ADMIN_PORTAL_HOME}
            className={`admin-dash__nav-link${isNavActive(location.pathname, ADMIN_PORTAL_HOME) ? ' is-active' : ''}`}
            title="Dashboard"
          >
            <i className="fas fa-th-large" aria-hidden />
            {!collapsed ? <span>Dashboard</span> : null}
          </Link>

          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="admin-dash__nav-section">
              {!collapsed ? (
                <p className="admin-dash__nav-section-title">{section.title}</p>
              ) : null}
              {section.items.map((item) =>
                item.soon || !item.to ? (
                  <span
                    key={item.label}
                    className="admin-dash__nav-link admin-dash__nav-link--soon"
                    title="Coming soon"
                  >
                    <i className={`fas ${item.icon}`} aria-hidden />
                    {!collapsed ? (
                      <>
                        <span>{item.label}</span>
                        <em>Soon</em>
                      </>
                    ) : null}
                  </span>
                ) : (
                  <Link
                    key={item.label}
                    to={item.to}
                    className={`admin-dash__nav-link${isNavActive(location.pathname, item.to) ? ' is-active' : ''}`}
                    title={item.label}
                  >
                    <i className={`fas ${item.icon}`} aria-hidden />
                    {!collapsed ? <span>{item.label}</span> : null}
                  </Link>
                )
              )}
            </div>
          ))}
        </nav>

        <div className="admin-dash__sidebar-foot">
          {!collapsed ? (
            <>
              <div className="admin-dash__org">
                <span className="admin-dash__org-label">Active organization</span>
                <strong>MediTap Health System</strong>
              </div>
              <a
                className="admin-dash__help"
                href="/tab10"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fas fa-life-ring" aria-hidden />
                <span>Need help? Open help center</span>
              </a>
            </>
          ) : null}
          <button
            type="button"
            className="admin-dash__collapse"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <i className={`fas fa-angle-${collapsed ? 'right' : 'left'}`} aria-hidden />
            {!collapsed ? <span>Collapse</span> : null}
          </button>
        </div>
      </aside>

      <div className="admin-dash__main">
        <header className="admin-dash__topbar" aria-label="Admin toolbar">
          <button
            type="button"
            className="admin-dash__menu-btn"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            <i className="fas fa-bars" aria-hidden />
          </button>

          <GoBackButton
            fallback={ADMIN_PORTAL_HOME}
            variant="shell"
            className="admin-dash__back"
          />

          <form className="admin-dash__search" onSubmit={submitSearch} role="search">
            <i className="fas fa-search" aria-hidden />
            <input
              id="admin-global-search"
              type="search"
              placeholder="Search patients, charts, hospitals…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
            />
            <kbd>⌘ K</kbd>
          </form>

          <div className="admin-dash__top-actions">
            {selected ? (
              <Link
                className="admin-dash__patient-pill"
                to={`/admin-portal/patients/${selected.patientId}`}
              >
                <i className="fas fa-user-injured" aria-hidden />
                <span>{selected.displayName}</span>
              </Link>
            ) : null}

            <button
              type="button"
              className="admin-dash__icon-btn"
              aria-label="Notifications"
              title="Notifications coming soon"
            >
              <i className="fas fa-bell" aria-hidden />
              <span className="admin-dash__badge">2</span>
            </button>

            <a
              className="admin-dash__icon-btn"
              href="/tab10"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Help"
            >
              <i className="fas fa-question-circle" aria-hidden />
            </a>

            <div className="admin-dash__user">
              <button
                type="button"
                className="admin-dash__user-btn"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onClick={() => setMenuOpen((v) => !v)}
              >
                <span className="admin-dash__avatar">{initials}</span>
                <span className="admin-dash__user-meta">
                  <strong>{prettyName}</strong>
                  <span>{roleLabel}</span>
                </span>
                <i className="fas fa-chevron-down" aria-hidden />
              </button>
              {menuOpen ? (
                <div className="admin-dash__user-menu" role="menu">
                  <Link
                    role="menuitem"
                    to={ADMIN_PATIENT_VIEW_PATHS.dashboard}
                    onClick={() => setMenuOpen(false)}
                  >
                    Patient view
                  </Link>
                  <button type="button" role="menuitem" onClick={onLogout}>
                    {t('common.logout')}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="admin-dash__body portal-shell__body">{children}</div>
      </div>
    </div>
  );
};

export default AdminPortalLayout;
