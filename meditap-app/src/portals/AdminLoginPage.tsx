import React, { useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../pages/Tab3.css';
import './adminLogin.css';
import bgImage from '../pages/MediTapBG.jpg';
import HeaderLanguagePicker from '../components/HeaderLanguagePicker';
import { useAuth } from '../contexts/AuthContext';
import {
  ADMIN_PORTAL_HOME,
  PATIENT_LOGIN_PATH,
  resolvePostLoginPath,
  USER_PORTAL_HOME,
} from './portalPaths';

/**
 * Staff / org-admin login door. Same JWT API as patient login; rejects patient-only accounts.
 */
const AdminLoginPage: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const {
    authReady,
    authInitError,
    isAuthenticated,
    loginWithPassword,
    portalHome,
  } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!authReady || !isAuthenticated) return;
    if (portalHome === 'admin') {
      history.replace(ADMIN_PORTAL_HOME);
      return;
    }
    // Patient session on admin door → send them to their portal
    history.replace(USER_PORTAL_HOME);
  }, [authReady, isAuthenticated, history, portalHome]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const u = username.trim();
    if (!u || !password) {
      setFormError(t('adminLogin.credentialsRequired'));
      return;
    }
    setSubmitting(true);
    try {
      const home = await loginWithPassword(u, password, { requirePortalHome: 'admin' });
      history.replace(resolvePostLoginPath(home));
    } catch (err) {
      if (err instanceof Error && err.message === 'PORTAL_MISMATCH') {
        setFormError(t('adminLogin.patientAccountRejected'));
      }
      /* other errors: authInitError set by context */
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = formError || authInitError;

  return (
    <div
      className="login-container admin-login"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <header className="header">
        <div className="logo">MediTap</div>
        <nav className="nav" aria-label="Site">
          <HeaderLanguagePicker tone="nav" />
          <Link to={PATIENT_LOGIN_PATH}>{t('adminLogin.patientSignIn')}</Link>
          <Link to="/tab8">{t('login.support')}</Link>
        </nav>
      </header>

      <main className="main-content">
        <div className="overlay admin-login__overlay">
          <div className="text-section">
            <div className="slogan">
              {t('adminLogin.sloganLine1')}
              <br />
              {t('adminLogin.sloganLine2')}
            </div>
            <ul className="hero-proof-points" aria-label={t('adminLogin.heroHighlightsAria')}>
              <li>{t('adminLogin.heroPoint1')}</li>
              <li>{t('adminLogin.heroPoint2')}</li>
              <li>{t('adminLogin.heroPoint3')}</li>
            </ul>
          </div>

          <aside
            className="login-card admin-login__card"
            role="complementary"
            aria-labelledby="admin-login-card-title"
          >
            <div className="login-card__accent" aria-hidden="true" />

            <div className="login-card__header">
              <span className="login-card__badge">{t('adminLogin.badge')}</span>
              <h2 id="admin-login-card-title" className="login-card__title">
                {t('adminLogin.title')}
              </h2>
              <p className="login-card__subtitle">{t('adminLogin.subtitle')}</p>
            </div>

            {displayError && (
              <div className="login-card__alert" role="alert">
                <span className="login-card__alert-icon" aria-hidden="true">
                  !
                </span>
                <div className="login-card__alert-body">
                  <strong>{t('adminLogin.loginProblem')}</strong>
                  <p>{displayError}</p>
                </div>
              </div>
            )}

            <form className="login-card__actions" onSubmit={onSubmit}>
              <label className="login-card__field">
                <span className="login-card__field-label">{t('login.usernameOrEmail')}</span>
                <input
                  className="login-card__input"
                  name="username"
                  autoComplete="username"
                  placeholder={t('login.usernamePlaceholder')}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={!authReady || submitting}
                />
              </label>
              <label className="login-card__field">
                <span className="login-card__field-label">{t('login.password')}</span>
                <div className="login-card__password-wrap">
                  <input
                    className="login-card__input login-card__input--password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={!authReady || submitting}
                  />
                  <button
                    type="button"
                    className="login-card__password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={!authReady || submitting}
                    aria-label={
                      showPassword ? t('login.hidePassword') : t('login.showPassword')
                    }
                    aria-pressed={showPassword}
                  >
                    {showPassword ? t('login.hide') : t('login.show')}
                  </button>
                </div>
              </label>
              <button
                type="submit"
                className="login-card__btn login-card__btn--primary"
                disabled={!authReady || submitting}
              >
                <span className="login-card__btn-label">
                  {submitting
                    ? t('login.loggingIn')
                    : authReady
                      ? t('adminLogin.logIn')
                      : t('common.loading')}
                </span>
              </button>

              <div className="login-card__divider">
                <span>{t('adminLogin.patientInstead')}</span>
              </div>

              <Link
                to={PATIENT_LOGIN_PATH}
                className="login-card__btn login-card__btn--secondary"
                style={{ textDecoration: 'none', textAlign: 'center', display: 'block' }}
              >
                <span className="login-card__btn-label">{t('adminLogin.patientSignIn')}</span>
              </Link>
            </form>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default AdminLoginPage;
