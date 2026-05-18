import React from 'react';
import { Link } from 'react-router-dom';
import PublicPageLayout from '../components/PublicPageLayout';

const TermsPage: React.FC = () => (
  <PublicPageLayout
    title="Terms of Service"
    subtitle="These terms govern your use of the MediTap patient intake and health-record workflow platform."
    activeNav="terms"
  >
    <section className="public-page__card">
      <h2>1. Acceptance</h2>
      <p>
        By creating an account, logging in, or using MediTap, you agree to these Terms of Service.
        If you do not agree, do not use the service.
      </p>
    </section>

    <section className="public-page__card">
      <h2>2. The service</h2>
      <p>
        MediTap helps patients and authorized care teams capture, review, and manage health intake
        information, including document upload and optional integrations such as Epic FHIR sandbox
        connectivity for demonstration and development purposes.
      </p>
    </section>

    <section className="public-page__card">
      <h2>3. Accounts and access</h2>
      <p>You are responsible for safeguarding your login credentials and for activity under your account.</p>
      <ul>
        <li>Provide accurate registration information.</li>
        <li>Notify your organization or MediTap support if you suspect unauthorized access.</li>
        <li>Staff and administrative features require appropriate roles assigned by your organization.</li>
      </ul>
    </section>

    <section className="public-page__card">
      <h2>4. Health information</h2>
      <p>
        MediTap is designed to support clinical workflows. Your organization remains responsible for
        compliance with applicable laws (including HIPAA where applicable), consent, and how data is
        used in production environments.
      </p>
    </section>

    <section className="public-page__card">
      <h2>5. Acceptable use</h2>
      <p>You may not misuse MediTap, attempt to breach security, reverse engineer the service except as
        permitted by law, or upload unlawful or harmful content.</p>
    </section>

    <section className="public-page__card">
      <h2>6. Changes and contact</h2>
      <p>
        We may update these terms from time to time. Continued use after changes constitutes acceptance.
        Questions: contact us through the{' '}
        <Link to="/tab8" className="public-page__inline-link">
          Support
        </Link>{' '}
        page.
      </p>
      <p>
        <em>Last updated: May 2026</em>
      </p>
    </section>
  </PublicPageLayout>
);

export default TermsPage;
