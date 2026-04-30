import React, { useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import './Tab3.css';
import bgImage from './MediTapBG.jpg';
import { useAuth } from '../contexts/AuthContext';
import { getApiBase } from '../config/api';

const EPIC_ON_FHIR_PORTAL =
  (import.meta.env.VITE_EPIC_DEVELOPER_PORTAL_URL as string | undefined)?.trim() ||
  'https://fhir.epic.com/';

const Tab9: React.FC = () => {
  const history = useHistory();
  const { authReady, isAuthenticated, loginWithPassword } = useAuth();
  const [accUsername, setAccUsername] = useState('');
  const [accEmail, setAccEmail] = useState('');
  const [accPassword, setAccPassword] = useState('');
  const [accPasswordConfirm, setAccPasswordConfirm] = useState('');
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
      const body = (await r.json().catch(() => ({}))) as Record<string, unknown>;
      if (!r.ok) {
        const parts: string[] = [];
        for (const [k, v] of Object.entries(body)) {
          if (k === 'detail' && typeof v === 'string') {
            parts.push(v);
            continue;
          }
          if (Array.isArray(v)) parts.push(`${k}: ${v.join(', ')}`);
          else if (typeof v === 'string') parts.push(`${k}: ${v}`);
          else if (v && typeof v === 'object') {
            parts.push(`${k}: ${JSON.stringify(v)}`);
          }
        }
        setAccError(parts.join(' ') || 'Registration failed.');
        return;
      }
      await loginWithPassword(u, accPassword);
      history.replace('/tab1');
    } catch {
      setAccError('Could not complete registration. Try again.');
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
        <div className="logo">MediTap</div>
        <nav className="nav">
          <a href="/tab3">Sign in</a>
          <a href="/tab10">About us</a>
          <a href="/tab8">Support</a>
        </nav>
      </header>

      <main className="main-content">
        <div className="overlay">
          <div className="text-section">
            <div className="slogan">
              Start your journey.
              <br />
              One secure account
            </div>
          </div>

          <aside
            className="login-card"
            role="complementary"
            aria-labelledby="register-card-title"
          >
            <div className="login-card__accent" aria-hidden="true" />

            <div className="login-card__header">
              <span className="login-card__badge">New account</span>
              <h2 id="register-card-title" className="login-card__title">
                Create your MediTap account
              </h2>
              <p className="login-card__subtitle">
                Choose a username, email, and password. Your password must meet the server’s
                security rules (length and complexity). You’ll be signed in right after
                registration.
              </p>
            </div>

            {accError && (
              <div className="login-card__alert" role="alert">
                <span className="login-card__alert-icon" aria-hidden="true">
                  !
                </span>
                <div className="login-card__alert-body">
                  <strong>Could not create account</strong>
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
                <span className="login-card__field-label">Username</span>
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
                <span className="login-card__field-label">Email</span>
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
                <span className="login-card__field-label">Password</span>
                <input
                  className="login-card__input"
                  id="accPassword"
                  type="password"
                  value={accPassword}
                  onChange={(e) => setAccPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={!authReady || accSubmitting}
                />
              </label>
              <label className="login-card__field">
                <span className="login-card__field-label">Confirm password</span>
                <input
                  className="login-card__input"
                  id="accPasswordConfirm"
                  type="password"
                  value={accPasswordConfirm}
                  onChange={(e) => setAccPasswordConfirm(e.target.value)}
                  autoComplete="new-password"
                  disabled={!authReady || accSubmitting}
                />
              </label>

              <button
                type="submit"
                className="login-card__btn login-card__btn--primary"
                disabled={!authReady || accSubmitting}
              >
                <span className="login-card__btn-label">
                  {accSubmitting ? 'Creating account…' : authReady ? 'Create account' : 'Loading…'}
                </span>
              </button>

              <div className="login-card__divider">
                <span>Already registered?</span>
              </div>

              <Link
                to="/tab3"
                className="login-card__btn login-card__btn--secondary"
                style={{ textDecoration: 'none', textAlign: 'center', display: 'block' }}
              >
                <span className="login-card__btn-label">Back to sign in</span>
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
              By continuing you agree to our{' '}
              <a href="#">Terms of Service</a> and{' '}
              <a href="#">Privacy Policy</a>.
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default Tab9;
