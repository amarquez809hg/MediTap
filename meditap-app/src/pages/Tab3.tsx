import React, { useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import './Tab3.css';
import bgImage from './MediTapBG.jpg';
import { useAuth } from '../contexts/AuthContext';

/** Epic developer portal (app registration, sandbox, docs)—not MediTap auth. */
const EPIC_ON_FHIR_PORTAL =
  (import.meta.env.VITE_EPIC_DEVELOPER_PORTAL_URL as string | undefined)?.trim() ||
  'https://fhir.epic.com/';

const Tab3: React.FC = () => {
  const history = useHistory();
  const { authReady, authInitError, isAuthenticated, loginWithPassword } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
      setFormError('Enter username and password.');
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
        <nav className="nav">
          <a href="/tab9">Create account</a>
          <a href="/tab10">About us</a>
          <a href="/tab8">Support</a>
        </nav>
      </header>

      <main className="main-content">
        <div className="overlay">
          <div className="text-section">
            <div className="slogan">
              Your data ready.
              <br />
              Instant intake
            </div>
          </div>

          <aside
            className="login-card"
            role="complementary"
            aria-labelledby="login-card-title"
          >
            <div className="login-card__accent" aria-hidden="true" />

            <div className="login-card__header">
              <span className="login-card__badge">Secure access</span>
              <h2 id="login-card-title" className="login-card__title">
                Sign in to MediTap
              </h2>
              <p className="login-card__subtitle">
                Sign in with the <strong>username</strong> you chose at registration (it may differ
                from your email). New users can create an account from the registration page.
              </p>
            </div>

            {displayError && (
              <div className="login-card__alert" role="alert">
                <span className="login-card__alert-icon" aria-hidden="true">
                  !
                </span>
                <div className="login-card__alert-body">
                  <strong>Sign-in problem</strong>
                  <p>{displayError}</p>
                  <button
                    type="button"
                    className="login-card__alert-retry"
                    onClick={() => window.location.reload()}
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            <form className="login-card__actions" onSubmit={onSubmit}>
              <label className="login-card__field">
                <span className="login-card__field-label">Username</span>
                <input
                  className="login-card__input"
                  name="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={!authReady || submitting}
                />
              </label>
              <label className="login-card__field">
                <span className="login-card__field-label">Password</span>
                <input
                  className="login-card__input"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={!authReady || submitting}
                />
              </label>
              <button
                type="submit"
                className="login-card__btn login-card__btn--primary"
                disabled={!authReady || submitting}
              >
                <span className="login-card__btn-label">
                  {submitting ? 'Signing in…' : authReady ? 'Sign in' : 'Loading…'}
                </span>
              </button>

              <div className="login-card__divider">
                <span>New here?</span>
              </div>

              <Link
                to="/tab9"
                className="login-card__btn login-card__btn--secondary"
                style={{ textDecoration: 'none', textAlign: 'center', display: 'block' }}
              >
                <span className="login-card__btn-label">Create an account</span>
              </Link>
            </form>

            <div className="login-card__epic">
              <p className="login-card__epic-label">Epic on FHIR</p>
              <p className="login-card__epic-hint">
                Sign in on Epic’s site to manage sandbox apps and documentation. Separate from
                MediTap sign-in above.
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

export default Tab3;
