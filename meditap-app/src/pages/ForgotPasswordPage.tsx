import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicPageLayout from '../components/PublicPageLayout';
import { requestPasswordReset } from '../api/publicContact';
import './AuthPublicPages.css';

const ForgotPasswordPage: React.FC = () => {
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
      setError('Enter the email address for your MediTap account.');
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
      title="Forgot password"
      subtitle="We will email you a secure link to choose a new password."
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
            <span>Email address</span>
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
            {submitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
        <p className="auth-public-footer-link">
          <Link to="/tab3">Back to log in</Link>
        </p>
      </section>
    </PublicPageLayout>
  );
};

export default ForgotPasswordPage;
