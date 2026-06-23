import React, { useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import './Tab3.css';
import bgImage from './MediTapBG.jpg';
import HeaderLanguagePicker from '../components/HeaderLanguagePicker';
import { useAuth } from '../contexts/AuthContext';

const HERO_POINT_KEYS = ['login.heroPoint1', 'login.heroPoint2', 'login.heroPoint3'] as const;

const Tab3: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const { authReady, authInitError, isAuthenticated, loginWithPassword } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  React.useEffect(() => {
    if (authReady && isAuthenticated) {
      history.replace('/tab1');
    }
  }, [authReady, isAuthenticated, history]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const u = username.trim();
    if (!u || !password) {
      setFormError(t('login.credentialsRequired'));
      return;
    }
    setSubmitting(true);
    try {
      await loginWithPassword(u, password);
      history.replace('/tab1');
    } catch {
      /* authInitError set by context */
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = formError || authInitError;

  return (
    <div
      className="login-container"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <header className="header">
        <div className="logo">MediTap</div>
        <nav className="nav" aria-label="Site">
          <HeaderLanguagePicker tone="nav" />
          <Link to="/tab10">{t('login.aboutUs')}</Link>
          <Link to="/tab8">{t('login.support')}</Link>
        </nav>
      </header>

      <main className="main-content">
        <div className="overlay">
          <div className="text-section">
            <div className="slogan">
              {t('login.sloganLine1')}
              <br />
              {t('login.sloganLine2')}
            </div>
            <ul className="hero-proof-points" aria-label={t('login.heroHighlightsAria')}>
              {HERO_POINT_KEYS.map((key) => (
                <li key={key}>{t(key)}</li>
              ))}
            </ul>
          </div>

          <aside
            className="login-card"
            role="complementary"
            aria-labelledby="login-card-title"
          >
            <div className="login-card__accent" aria-hidden="true" />

            <div className="login-card__header">
              <span className="login-card__badge">{t('login.badge')}</span>
              <h2 id="login-card-title" className="login-card__title">
                {t('login.title')}
              </h2>
              <p className="login-card__subtitle">
                <Trans
                  i18nKey="login.subtitle"
                  components={[<strong key="u" />, <strong key="e" />, <strong key="c" />]}
                />
              </p>
            </div>

            {displayError && (
              <div className="login-card__alert" role="alert">
                <span className="login-card__alert-icon" aria-hidden="true">
                  !
                </span>
                <div className="login-card__alert-body">
                  <strong>{t('login.loginProblem')}</strong>
                  <p>{displayError}</p>
                  <button
                    type="button"
                    className="login-card__alert-retry"
                    onClick={() => window.location.reload()}
                  >
                    {t('common.retry')}
                  </button>
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
              <p className="login-card__forgot">
                <Link to="/forgot-password">{t('login.forgotPassword')}</Link>
              </p>
              <button
                type="submit"
                className="login-card__btn login-card__btn--primary"
                disabled={!authReady || submitting}
              >
                <span className="login-card__btn-label">
                  {submitting
                    ? t('login.loggingIn')
                    : authReady
                      ? t('login.logIn')
                      : t('common.loading')}
                </span>
              </button>

              <div className="login-card__divider">
                <span>{t('login.newHere')}</span>
              </div>

              <Link
                to="/tab9"
                className="login-card__btn login-card__btn--secondary"
                style={{ textDecoration: 'none', textAlign: 'center', display: 'block' }}
              >
                <span className="login-card__btn-label">{t('login.createAccount')}</span>
              </Link>
            </form>

            <p className="login-card__terms">
              {t('login.termsPrefix')}{' '}
              <Link to="/terms">{t('login.termsOfService')}</Link> {t('login.and')}{' '}
              <Link to="/privacy">{t('login.privacyPolicy')}</Link>.
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default Tab3;
