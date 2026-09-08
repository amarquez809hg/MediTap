import React, { useMemo, useState } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicPageLayout from '../components/PublicPageLayout';
import { confirmPasswordReset } from '../api/publicContact';
import SecurePasswordSuggestion from '../components/SecurePasswordSuggestion';
import { MIN_SECURE_PASSWORD_LENGTH } from '../auth/securePassword';
import './Tab3.css';
import './AuthPublicPages.css';

const ResetPasswordPage: React.FC = () => {
  const { t } = useTranslation();
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
  const [suggestionHint, setSuggestionHint] = useState<string | null>(null);

  const linkInvalid = !uid || !token;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (password !== passwordConfirm) {
      setError(t('resetPassword.passwordMismatch'));
      return;
    }
    if (password.length < MIN_SECURE_PASSWORD_LENGTH) {
      setError(t('register.passwordTooShort', { min: MIN_SECURE_PASSWORD_LENGTH }));
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
      title={t('resetPassword.title')}
      subtitle={t('resetPassword.subtitle')}
    >
      <section className="public-page__card auth-public-card">
        {linkInvalid && (
          <p className="auth-public-alert auth-public-alert--error" role="alert">
            {t('resetPassword.linkInvalid')}{' '}
            <Link to="/forgot-password">{t('resetPassword.requestNew')}</Link>.
          </p>
        )}
        {error && (
          <p className="auth-public-alert auth-public-alert--error" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="auth-public-alert auth-public-alert--success" role="status">
            {success} {t('resetPassword.redirecting')}
          </p>
        )}
        {!linkInvalid && !success && (
          <form className="auth-public-form" onSubmit={onSubmit}>
            <label className="auth-public-field">
              <span>{t('resetPassword.newPassword')}</span>
              <div className="auth-public-password-row">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setSuggestionHint(null);
                  }}
                  required
                  minLength={MIN_SECURE_PASSWORD_LENGTH}
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="auth-public-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                >
                  {showPassword ? t('login.hide') : t('login.show')}
                </button>
              </div>
            </label>
            <label className="auth-public-field">
              <span>{t('resetPassword.confirmPassword')}</span>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password_confirm"
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(e) => {
                  setPasswordConfirm(e.target.value);
                  setSuggestionHint(null);
                }}
                required
                minLength={MIN_SECURE_PASSWORD_LENGTH}
                disabled={submitting}
              />
            </label>
            <SecurePasswordSuggestion
              className="password-security--public"
              password={password}
              disabled={submitting}
              suggestionHint={suggestionHint}
              onSuggest={(next) => {
                setPassword(next);
                setPasswordConfirm(next);
                setShowPassword(true);
                setError(null);
                setSuggestionHint(t('passwordSecurity.filledHint'));
              }}
            />
            <button type="submit" className="auth-public-submit" disabled={submitting}>
              {submitting ? t('resetPassword.updating') : t('resetPassword.updatePassword')}
            </button>
          </form>
        )}
        <p className="auth-public-footer-link">
          <Link to="/tab3">{t('common.backToLogin')}</Link>
        </p>
      </section>
    </PublicPageLayout>
  );
};

export default ResetPasswordPage;
