import React, { useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import './Tab3.css';
import bgImage from './MediTapBG.jpg';
import { useAuth } from '../contexts/AuthContext';

const HERO_PROOF_POINTS = [
  'Fill intake from PDFs and images in minutes',
  'Epic FHIR sandbox–ready for health systems',
  'Secure patient and staff workflows in one place',
] as const;

const Tab3: React.FC = () => {
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
      setFormError('Enter username (or email) and password.');
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
          <Link to="/tab10">About us</Link>
          <Link to="/tab8">Support</Link>
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
            <ul className="hero-proof-points" aria-label="MediTap highlights">
              {HERO_PROOF_POINTS.map((point) => (
                <li key={point}>{point}</li>
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
              <span className="login-card__badge">Already have an account</span>
              <h2 id="login-card-title" className="login-card__title">
                Log in to MediTap
              </h2>
              <p className="login-card__subtitle">
                Use the <strong>username</strong> or <strong>email</strong> and password for your
                existing MediTap account. Need an account? Use <strong>Create an account</strong>{' '}
                below.
              </p>
            </div>

            {displayError && (
              <div className="login-card__alert" role="alert">
                <span className="login-card__alert-icon" aria-hidden="true">
                  !
                </span>
                <div className="login-card__alert-body">
                  <strong>Login problem</strong>
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
                <span className="login-card__field-label">Username or email</span>
                <input
                  className="login-card__input"
                  name="username"
                  autoComplete="username"
                  placeholder="Username or email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={!authReady || submitting}
                />
              </label>
              <label className="login-card__field">
                <span className="login-card__field-label">Password</span>
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
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>
              <button
                type="submit"
                className="login-card__btn login-card__btn--primary"
                disabled={!authReady || submitting}
              >
                <span className="login-card__btn-label">
                  {submitting ? 'Logging in…' : authReady ? 'Log in' : 'Loading…'}
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


            <p className="login-card__terms">
              By continuing you agree to our{' '}
              <Link to="/terms">Terms of Service</Link> and{' '}
              <Link to="/privacy">Privacy Policy</Link>.
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default Tab3;
