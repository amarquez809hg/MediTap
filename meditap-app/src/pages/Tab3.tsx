import React from 'react';
import { useHistory } from 'react-router-dom';
import './Tab3.css';
import bgImage from './MediTapBG.jpg';
import { useAuth } from '../contexts/AuthContext';

/** Epic developer portal (app registration, sandbox, docs)—not MediTap auth. */
const EPIC_ON_FHIR_PORTAL =
  (import.meta.env.VITE_EPIC_DEVELOPER_PORTAL_URL as string | undefined)?.trim() ||
  'https://fhir.epic.com/';

const Tab3: React.FC = () => {
  const history = useHistory();
  const {
    keycloakReady,
    authInitError,
    isAuthenticated,
    loginWithKeycloak,
    registerWithKeycloak,
    loginWithGoogle,
  } = useAuth();

  React.useEffect(() => {
    if (keycloakReady && isAuthenticated) {
      history.replace('/tab1');
    }
  }, [keycloakReady, isAuthenticated, history]);

  return (
    <div
      className="login-container"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <header className="header">
        <div className="logo">MediTap</div>
        <nav className="nav">
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
                Enterprise identity via Keycloak. One account for secure access to
                your health intake experience.
              </p>
            </div>

            {authInitError && (
              <div className="login-card__alert" role="alert">
                <span className="login-card__alert-icon" aria-hidden="true">
                  !
                </span>
                <div className="login-card__alert-body">
                  <strong>Cannot reach sign-in</strong>
                  <p>{authInitError}</p>
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

            <div className="login-card__actions">
              <button
                type="button"
                className="login-card__btn login-card__btn--primary"
                onClick={loginWithKeycloak}
                disabled={!keycloakReady}
              >
                <span className="login-card__btn-icon" aria-hidden="true">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="login-card__btn-label">
                  {keycloakReady ? 'Continue to sign in' : 'Connecting…'}
                </span>
              </button>

              <div className="login-card__divider">
                <span>New here?</span>
              </div>

              <button
                type="button"
                className="login-card__btn login-card__btn--secondary"
                onClick={registerWithKeycloak}
                disabled={!keycloakReady}
              >
                <span className="login-card__btn-icon" aria-hidden="true">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8zm8 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="login-card__btn-label">Create an account</span>
              </button>
            </div>

            <div className="login-card__sso">
              <p className="login-card__sso-label">Or continue with</p>
              <button
                type="button"
                className="login-card__google-btn"
                onClick={loginWithGoogle}
                disabled={!keycloakReady}
                aria-label="Sign in with Google"
              >
                <span className="login-card__google-btn-icon" aria-hidden="true">
                  <svg
                    className="login-card__google-logo"
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                </span>
                <span className="login-card__google-btn-label">
                  {keycloakReady ? 'Sign in with Google' : 'Connecting…'}
                </span>
              </button>
            </div>

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
