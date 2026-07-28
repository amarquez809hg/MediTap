import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { canAccessAdminPortal } from './portalIdentity';
import { ADMIN_PORTAL_HOME } from './portalPaths';
import './portalShell.css';

type UserPortalLayoutProps = {
  children: React.ReactNode;
};

/**
 * Patient / caregiver shell chrome (Phase 1 — thin banner + nav).
 * Staff who open Patient view get a return link to the admin portal.
 */
const UserPortalLayout: React.FC<UserPortalLayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const { portalIdentity } = useAuth();
  const showAdminReturn = canAccessAdminPortal(portalIdentity);

  return (
    <div className="portal-shell portal-shell--user" data-portal="user">
      <header className="portal-shell__chrome" aria-label="User portal">
        <div className="portal-shell__brand">
          <span className="portal-shell__product">MediTap</span>
          <span className="portal-shell__label">{t('portal.patientLabel')}</span>
        </div>
        <nav className="portal-shell__nav" aria-label="Patient sections">
          <a href="/app/dashboard">{t('portal.navDashboard')}</a>
          <a href="/app/status">{t('portal.navStatus')}</a>
          <a href="/app/intake">{t('portal.navIntake')}</a>
          <a href="/app/appointments">{t('portal.navAppointments')}</a>
          <a href="/app/settings">{t('portal.navSettings')}</a>
          {showAdminReturn ? (
            <a
              href={ADMIN_PORTAL_HOME}
              className="portal-shell__nav-link portal-shell__nav-link--admin-return"
            >
              {t('portal.backToAdmin')}
            </a>
          ) : null}
        </nav>
      </header>
      <div className="portal-shell__body">{children}</div>
    </div>
  );
};

export default UserPortalLayout;
