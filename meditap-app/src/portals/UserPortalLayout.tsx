import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import GoBackButton from '../components/GoBackButton';
import PortalNavLink from '../components/PortalNavLink';
import { canAccessAdminPortal } from './portalIdentity';
import { ADMIN_PORTAL_HOME } from './portalPaths';
import { chartPageGoBackFallback, navigatePortal } from '../navigation/portalGoBack';
import './portalShell.css';

type UserPortalLayoutProps = {
  children: React.ReactNode;
};

/**
 * Patient / caregiver shell chrome (Phase 1 — thin banner + nav).
 * Staff who open Patient view get a return link to the admin portal.
 * Tab links hard-navigate so Ionic sibling routes do not stick.
 */
const UserPortalLayout: React.FC<UserPortalLayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const { portalIdentity } = useAuth();
  const showAdminReturn = canAccessAdminPortal(portalIdentity);

  return (
    <div className="portal-shell portal-shell--user" data-portal="user">
      <header className="portal-shell__chrome" aria-label="User portal">
        <div className="portal-shell__brand">
          <GoBackButton fallback={chartPageGoBackFallback()} variant="shell" />
          <span className="portal-shell__product">MediTap</span>
          <span className="portal-shell__label">{t('portal.patientLabel')}</span>
        </div>
        <nav className="portal-shell__nav" aria-label="Patient sections">
          <PortalNavLink to="/app/dashboard">{t('portal.navDashboard')}</PortalNavLink>
          <PortalNavLink to="/app/status">{t('portal.navStatus')}</PortalNavLink>
          <PortalNavLink to="/app/intake">{t('portal.navIntake')}</PortalNavLink>
          <PortalNavLink to="/app/appointments">{t('portal.navAppointments')}</PortalNavLink>
          <PortalNavLink to="/app/settings">{t('portal.navSettings')}</PortalNavLink>
          {showAdminReturn ? (
            <a
              href={ADMIN_PORTAL_HOME}
              className="portal-shell__nav-link portal-shell__nav-link--admin-return"
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
                  return;
                }
                e.preventDefault();
                navigatePortal(ADMIN_PORTAL_HOME);
              }}
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
