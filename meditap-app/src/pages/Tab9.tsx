import React, { useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Tab3.css';
import bgImage from './MediTapBG.jpg';
import HeaderLanguagePicker from '../components/HeaderLanguagePicker';
import { useAuth } from '../contexts/AuthContext';
import { getApiBase } from '../config/api';
import { startOnboardingForNewUser } from '../onboarding/onboardingStorage';

const EPIC_ON_FHIR_PORTAL =
  (import.meta.env.VITE_EPIC_DEVELOPER_PORTAL_URL as string | undefined)?.trim() ||
  'https://fhir.epic.com/';

/** Flatten DRF / Django validation payloads so users see real reasons (password rules, etc.). */
function formatRegisterApiErrors(body: Record<string, unknown>): string {
  const parts: string[] = [];
  const flatten = (v: unknown): string[] => {
    if (v == null) return [];
    if (typeof v === 'string') return [v];
    if (typeof v === 'number' || typeof v === 'boolean') return [String(v)];
    if (Array.isArray(v)) return v.flatMap(flatten);
    if (typeof v === 'object') {
      return Object.values(v as Record<string, unknown>).flatMap(flatten);
    }
    return [];
  };
  if (typeof body.detail === 'string') parts.push(body.detail);
  for (const [k, v] of Object.entries(body)) {
    if (k === 'detail') continue;
    const msgs = flatten(v);
    if (msgs.length) parts.push(`${k}: ${msgs.join(' ')}`);
  }
  return parts.join(' — ') || 'Registration failed.';
}

const Tab9: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const { authReady, isAuthenticated, loginWithPassword } = useAuth();
  const [accUsername, setAccUsername] = useState('');
  const [accEmail, setAccEmail] = useState('');
  const [accPassword, setAccPassword] = useState('');
  const [accPasswordConfirm, setAccPasswordConfirm] = useState('');
  const [showAccPassword, setShowAccPassword] = useState(false);
  const [showAccPasswordConfirm, setShowAccPasswordConfirm] = useState(false);
  const [accError, setAccError] = useState<string | null>(null);
  const [accSubmitting, setAccSubmitting] = useState(false);

  React.useEffect(() => {
    if (authReady && isAuthenticated) {
      history.replace('/tab1');
    }
  }, [authReady, isAuthenticated, history]);

  const registerMediTapAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccError(null);
    const u = accUsername.trim();
    const em = accEmail.trim();
    if (!u || !em || !accPassword) {
      setAccError('Enter username, email, and password.');
      return;
    }
    if (accPassword !== accPasswordConfirm) {
      setAccError('Passwords do not match.');
      return;
    }
    const base = getApiBase();
    if (!base) {
      setAccError('API base URL is not configured (set VITE_API_BASE).');
      return;
    }
    setAccSubmitting(true);
    try {
      const r = await fetch(`${base}/api/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: u,
          email: em,
          password: accPassword,
          password_confirm: accPasswordConfirm,
        }),
      });
      const raw = await r.text();
      let body: Record<string, unknown> = {};
      try {
        body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      } catch {
        body = {
          detail: raw
            ? `HTTP ${r.status} (non-JSON): ${raw.replace(/\s+/g, ' ').trim().slice(0, 280)}`
            : `HTTP ${r.status} ${r.statusText || ''}`.trim(),
        };
      }
      if (!r.ok) {
        let msg = formatRegisterApiErrors(body);
        if (msg === 'Registration failed.') {
          msg = `Registration failed (HTTP ${r.status}). If you use www. on this site, the API host must allow it (ALLOWED_HOSTS). Open DevTools → Network → register and inspect the response.`;
        }
        setAccError(msg);
        return;
      }
      try {
        await loginWithPassword(u, accPassword);
        startOnboardingForNewUser(u);
        history.replace('/onboarding');
      } catch {
        setAccError(
          'Your account was created. Use Log in with the same username and password (check spam filters if email verification is added later).'
        );
      }
    } catch {
      setAccError('Could not reach the server. Check your connection and API URL (VITE_API_BASE / same-origin /api).');
    } finally {
      setAccSubmitting(false);
    }
  };

  return (
    <div
      className="login-container"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <header className="header">
        <div className="logo">{t('common.meditap')}</div>
        <nav className="nav" aria-label="Site">
          <HeaderLanguagePicker tone="nav" />
          <Link to="/tab3">{t('login.logIn')}</Link>
          <Link to="/tab10">{t('login.aboutUs')}</Link>
          <Link to="/tab8">{t('login.support')}</Link>
        </nav>
      </header>

      <main className="main-content">
        <div className="overlay">
          <div className="text-section">
            <div className="slogan">
              {t('register.heroLine1')}
              <br />
              {t('register.heroLine2')}
            </div>
          </div>

          <aside
            className="login-card"
            role="complementary"
            aria-labelledby="register-card-title"
          >
            <div className="login-card__accent" aria-hidden="true" />

            <div className="login-card__header">
              <span className="login-card__badge">{t('register.badge')}</span>
              <h2 id="register-card-title" className="login-card__title">
                {t('register.title')}
              </h2>
              <p className="login-card__subtitle">
                Choose your own username, email, and password. Username and email must each be
                unique on MediTap (standard username characters; valid email address). Password must
                match confirmation and meet the minimum length the server requires (default 8).
                There is no limit on how many people can create an account.
              </p>
            </div>

            {accError && (
              <div className="login-card__alert" role="alert">
                <span className="login-card__alert-icon" aria-hidden="true">
                  !
                </span>
                <div className="login-card__alert-body">
                  <strong>{t('register.couldNotCreate')}</strong>
                  <p>{accError}</p>
                  <button
                    type="button"
                    className="login-card__alert-retry"
                    onClick={() => setAccError(null)}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <form className="login-card__actions" onSubmit={registerMediTapAccount}>
              <label className="login-card__field">
                <span className="login-card__field-label">{t('register.username')}</span>
                <input
                  className="login-card__input"
                  id="accUsername"
                  value={accUsername}
                  onChange={(e) => setAccUsername(e.target.value)}
                  autoComplete="username"
                  disabled={!authReady || accSubmitting}
                />
              </label>
              <label className="login-card__field">
                <span className="login-card__field-label">{t('register.email')}</span>
                <input
                  className="login-card__input"
                  id="accEmail"
                  type="email"
                  value={accEmail}
                  onChange={(e) => setAccEmail(e.target.value)}
                  autoComplete="email"
                  disabled={!authReady || accSubmitting}
                />
              </label>
              <label className="login-card__field">
                <span className="login-card__field-label">{t('login.password')}</span>
                <div className="login-card__password-wrap">
                  <input
                    className="login-card__input login-card__input--password"
                    id="accPassword"
                    type={showAccPassword ? 'text' : 'password'}
                    value={accPassword}
                    onChange={(e) => setAccPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={1}
                    disabled={!authReady || accSubmitting}
                  />
                  <button
                    type="button"
                    className="login-card__password-toggle"
                    onClick={() => setShowAccPassword((v) => !v)}
                    disabled={!authReady || accSubmitting}
                    aria-label={showAccPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showAccPassword}
                  >
                    {showAccPassword ? t('login.hide') : t('login.show')}
                  </button>
                </div>
              </label>
              <label className="login-card__field">
                <span className="login-card__field-label">{t('register.confirmPassword')}</span>
                <div className="login-card__password-wrap">
                  <input
                    className="login-card__input login-card__input--password"
                    id="accPasswordConfirm"
                    type={showAccPasswordConfirm ? 'text' : 'password'}
                    value={accPasswordConfirm}
                    onChange={(e) => setAccPasswordConfirm(e.target.value)}
                    autoComplete="new-password"
                    minLength={1}
                    disabled={!authReady || accSubmitting}
                  />
                  <button
                    type="button"
                    className="login-card__password-toggle"
                    onClick={() => setShowAccPasswordConfirm((v) => !v)}
                    disabled={!authReady || accSubmitting}
                    aria-label={showAccPasswordConfirm ? 'Hide confirm password' : 'Show confirm password'}
                    aria-pressed={showAccPasswordConfirm}
                  >
                    {showAccPasswordConfirm ? t('login.hide') : t('login.show')}
                  </button>
                </div>
              </label>

              <button
                type="submit"
                className="login-card__btn login-card__btn--primary"
                disabled={!authReady || accSubmitting}
              >
                <span className="login-card__btn-label">
                  {accSubmitting
                    ? t('register.creating')
                    : authReady
                      ? t('register.createAccount')
                      : t('common.loading')}
                </span>
              </button>

              <div className="login-card__divider">
                <span>{t('register.alreadyRegistered')}</span>
              </div>

              <Link
                to="/tab3"
                className="login-card__btn login-card__btn--secondary"
                style={{ textDecoration: 'none', textAlign: 'center', display: 'block' }}
              >
                <span className="login-card__btn-label">{t('common.backToLogin')}</span>
              </Link>
            </form>

            <div className="login-card__epic">
              <p className="login-card__epic-label">Epic on FHIR</p>
              <p className="login-card__epic-hint">
                Epic’s developer portal is separate from MediTap account creation above.
              </p>
              <a
                className="login-card__epic-link"
                href={EPIC_ON_FHIR_PORTAL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open Epic on FHIR developer portal in a new tab"
              >
                <span className="login-card__epic-link__mark" aria-hidden="true">
                  <svg
                    className="login-card__epic-link__logo"
                    viewBox="0 0 120 32"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <g transform="skewX(-11) translate(2 0)">
                      <text
                        x="0"
                        y="23"
                        fill="currentColor"
                        fontSize="26"
                        fontWeight="800"
                        fontStyle="italic"
                        fontFamily="Inter, 'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif"
                      >
                        Epic
                      </text>
                    </g>
                  </svg>
                </span>
                <span className="login-card__epic-link__text">
                  <span className="login-card__epic-link__title">on FHIR</span>
                  <span className="login-card__epic-link__subtitle">Developer portal</span>
                </span>
                <span className="login-card__epic-link__chev" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M7 17L17 7M17 7H9M17 7V15"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </a>
            </div>

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

export default Tab9;
