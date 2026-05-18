import React from 'react';
import { Link } from 'react-router-dom';
import PublicPageLayout from '../components/PublicPageLayout';

const PrivacyPage: React.FC = () => (
  <PublicPageLayout
    title="Privacy Policy"
    subtitle="How MediTap handles information when you use our platform."
    activeNav="privacy"
  >
    <section className="public-page__card">
      <h2>Overview</h2>
      <p>
        MediTap respects your privacy. This policy describes the types of information we process when
        you use the application and the choices available to you.
      </p>
    </section>

    <section className="public-page__card">
      <h2>Information we collect</h2>
      <ul>
        <li>Account information such as username, email, and authentication credentials.</li>
        <li>Patient intake data you enter or upload (for example demographics, medications, allergies).</li>
        <li>Technical logs needed to operate and secure the service (device/browser, timestamps, errors).</li>
      </ul>
    </section>

    <section className="public-page__card">
      <h2>How we use information</h2>
      <p>We use information to:</p>
      <ul>
        <li>Provide login, intake, dashboard, and staff workflow features.</li>
        <li>Improve reliability, security, and product quality.</li>
        <li>Support optional integrations you or your organization enable (such as Epic FHIR sandbox linking).</li>
      </ul>
    </section>

    <section className="public-page__card">
      <h2>Sharing</h2>
      <p>
        We do not sell personal health information. Data may be shared with your healthcare organization,
        service providers that help us host and operate MediTap, or when required by law.
      </p>
    </section>

    <section className="public-page__card">
      <h2>Security and retention</h2>
      <p>
        We apply administrative, technical, and organizational safeguards appropriate to a health
        technology platform. Retention periods depend on your organization’s policies and applicable
        regulations.
      </p>
    </section>

    <section className="public-page__card">
      <h2>Your choices</h2>
      <p>
        You may request access, correction, or deletion of your account data through your care
        organization or via our{' '}
        <Link to="/tab8" className="public-page__inline-link">
          Support
        </Link>{' '}
        contact form.
      </p>
      <p>
        <em>Last updated: May 2026</em>
      </p>
    </section>
  </PublicPageLayout>
);

export default PrivacyPage;
