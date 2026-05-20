import React, { useMemo, useState } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
import PublicPageLayout from '../components/PublicPageLayout';
import { confirmPasswordReset } from '../api/publicContact';
import './AuthPublicPages.css';

const ResetPasswordPage: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const uid = params.get('uid') ?? '';
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const linkInvalid = !uid || !token;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (password !== passwordConfirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const msg = await confirmPasswordReset({
        uid,
        token,
        password,
        password_confirm: passwordConfirm,
      });
      setSuccess(msg);
      window.setTimeout(() => history.replace('/tab3'), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicPageLayout
      title="Choose a new password"
      subtitle="Enter and confirm your new password below."
    >
      <section className="public-page__card auth-public-card">
        {linkInvalid && (
          <p className="auth-public-alert auth-public-alert--error" role="alert">
            This reset link is incomplete or expired.{' '}
            <Link to="/forgot-password">Request a new link</Link>.
          </p>
        )}
        {error && (
          <p className="auth-public-alert auth-public-alert--error" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="auth-public-alert auth-public-alert--success" role="status">
            {success} Redirecting to log in…
          </p>
        )}
        {!linkInvalid && !success && (
          <form className="auth-public-form" onSubmit={onSubmit}>
            <label className="auth-public-field">
              <span>New password</span>
              <div className="auth-public-password-row">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="auth-public-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>
            <label className="auth-public-field">
              <span>Confirm password</span>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password_confirm"
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                disabled={submitting}
              />
            </label>
            <button type="submit" className="auth-public-submit" disabled={submitting}>
              {submitting ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}
        <p className="auth-public-footer-link">
          <Link to="/tab3">Back to log in</Link>
        </p>
      </section>
    </PublicPageLayout>
  );
};

export default ResetPasswordPage;
