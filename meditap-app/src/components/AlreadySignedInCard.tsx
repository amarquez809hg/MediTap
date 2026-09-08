import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { canAccessAdminPortal } from '../portals/portalIdentity';
import {
  ADMIN_LOGIN_PATH,
  ADMIN_PORTAL_HOME,
  PATIENT_LOGIN_PATH,
  USER_PORTAL_HOME,
} from '../portals/portalPaths';

type AlreadySignedInCardProps = {
  /** Which door this panel sits on — affects default CTA emphasis. */
  door: 'patient' | 'admin';
};

/**
 * Shown on login doors when a JWT session already exists, so URLs like /tab3
 * and /admin-portal/login are not silently forced to a single portal home.
 */
const AlreadySignedInCard: React.FC<AlreadySignedInCardProps> = ({ door }) => {
  const { t } = useTranslation();
  const { username, portalRole, portalIdentity, logout } = useAuth();
  const isAdmin = canAccessAdminPortal(portalIdentity);

  return (
    <div className="login-card__alert login-card__session" role="status">
      <span className="login-card__alert-icon" aria-hidden="true">
        ✓
      </span>
      <div className="login-card__alert-body">
        <strong>{t('session.alreadySignedInTitle')}</strong>
        <p>
          {t('session.alreadySignedInBody', {
            user: username || t('session.unknownUser'),
            role: portalRole || 'user',
          })}
        </p>
        <div className="login-card__session-actions">
          {isAdmin ? (
            <Link className="login-card__session-btn" to={ADMIN_PORTAL_HOME}>
              {t('session.openAdminHome')}
            </Link>
          ) : null}
          <Link
            className="login-card__session-btn login-card__session-btn--secondary"
            to={USER_PORTAL_HOME}
          >
            {t('session.openPatientView')}
          </Link>
          <button
            type="button"
            className="login-card__session-btn login-card__session-btn--ghost"
            onClick={() =>
              logout({
                redirectTo: door === 'admin' ? ADMIN_LOGIN_PATH : PATIENT_LOGIN_PATH,
              })
            }
          >
            {t('common.logout')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlreadySignedInCard;
