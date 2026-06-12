import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicPageLayout from '../components/PublicPageLayout';
import { requestPasswordReset } from '../api/publicContact';
import './AuthPublicPages.css';

const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const em = email.trim();
    if (!em) {
      setError(t('forgotPassword.emailRequired'));
      return;
    }
    setSubmitting(true);
    try {
      const msg = await requestPasswordReset(em);
      setSuccess(msg);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset email.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicPageLayout
      title={t('forgotPassword.title')}
      subtitle={t('forgotPassword.subtitle')}
    >
      <section className="public-page__card auth-public-card">
        {error && (
          <p className="auth-public-alert auth-public-alert--error" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="auth-public-alert auth-public-alert--success" role="status">
            {success}
          </p>
        )}
        <form className="auth-public-form" onSubmit={onSubmit}>
          <label className="auth-public-field">
            <span>{t('forgotPassword.emailAddress')}</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={submitting}
            />
          </label>
          <button type="submit" className="auth-public-submit" disabled={submitting}>
            {submitting ? t('forgotPassword.sending') : t('forgotPassword.sendLink')}
          </button>
        </form>
        <p className="auth-public-footer-link">
          <Link to="/tab3">{t('common.backToLogin')}</Link>
        </p>
      </section>
    </PublicPageLayout>
  );
};

export default ForgotPasswordPage;
