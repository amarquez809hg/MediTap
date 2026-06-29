import React from 'react';
import { Link } from 'react-router-dom';
import PublicPageLayout from '../components/PublicPageLayout';

const TermsPage: React.FC = () => (
  <PublicPageLayout
    title="Terms of Service"
    subtitle="These terms govern your use of the MediTap patient intake and health-record workflow platform, including your authorization for clinical use of the information you provide."
    activeNav="terms"
  >
    <section className="public-page__card">
      <h2>1. Acceptance</h2>
      <p>
        By creating an account, logging in, uploading documents, or otherwise using MediTap, you
        agree to these Terms of Service and to our{' '}
        <Link to="/privacy" className="public-page__inline-link">
          Privacy Policy
        </Link>
        . If you do not agree, do not use the service.
      </p>
      <p>
        Where you act on behalf of another person (for example, as a parent, legal guardian, or
        authorized representative), you represent that you have lawful authority to accept these
        terms and to provide that person&apos;s health information through MediTap.
      </p>
    </section>

    <section className="public-page__card">
      <h2>2. The service</h2>
      <p>
        MediTap helps patients and authorized care teams capture, review, and manage health intake
        information, including document upload and optional integrations such as Epic FHIR sandbox
        connectivity for demonstration and development purposes.
      </p>
      <p>
        MediTap is a technology platform that supports clinical workflows. It does not replace
        in-person evaluation, emergency services, or the professional judgment of licensed healthcare
        providers.
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

    <section className="public-page__card public-page__card--accent">
      <h2>4. Authorization for medical and clinical use of your information</h2>
      <p>
        <strong>
          By using MediTap, you voluntarily authorize MediTap, your participating healthcare
          organization, and authorized members of your care team to collect, store, review, use,
          and disclose the health-related information you enter, upload, or import through the
          platform for legitimate medical and clinical purposes.
        </strong>
      </p>

      <h3>What you authorize</h3>
      <p>You understand and agree that information you provide may be used to:</p>
      <ul>
        <li>
          Build and maintain your patient intake record and health summary (for example
          demographics, allergies, medications, chronic conditions, laboratory results, visit
          history, insurance details, and vital signs).
        </li>
        <li>
          Support treatment, care coordination, referral, billing support, quality review, and
          operational workflows performed by authorized clinicians and staff at your organization.
        </li>
        <li>
          Populate dashboards, quick-status views, and staff-assisted documentation tools so your
          care team can review accurate information before and during care.
        </li>
        <li>
          Process documents you upload (including PDFs and imported records) using automated
          extraction tools to pre-fill intake fields, subject to staff review where applicable.
        </li>
        <li>
          Synchronize or display data from optional integrations you or your organization enable
          (such as Epic FHIR sandbox connectivity), in accordance with the permissions granted
          during connection.
        </li>
      </ul>

      <h3>What you represent</h3>
      <p>By submitting information through MediTap, you represent that:</p>
      <ul>
        <li>
          The information is provided voluntarily and, to the best of your knowledge, is accurate,
          complete, and not misleading.
        </li>
        <li>
          You are the patient named in the record, or you are legally authorized to provide the
          patient&apos;s information and to grant this authorization on their behalf.
        </li>
        <li>
          You will update information when it changes materially (for example, new allergies,
          medication changes, or updated contact details) when continuing to use the platform.
        </li>
      </ul>

      <h3>Who may access your information</h3>
      <p>
        Access is limited to users and systems with a legitimate need under your organization&apos;s
        policies, including:
      </p>
      <ul>
        <li>You, through your authenticated patient portal session.</li>
        <li>
          Authorized clinical and administrative staff acting within assigned roles (including
          temporary staff elevation on shared devices when your organization permits it).
        </li>
        <li>
          Service providers that host, secure, or operate MediTap on behalf of your organization,
          under contractual confidentiality and security obligations.
        </li>
        <li>
          Third-party health systems or integration partners only when you or your organization
          explicitly enables a connection and grants the applicable permissions.
        </li>
      </ul>

      <h3>Duration and withdrawal</h3>
      <p>
        This authorization remains in effect while you maintain an active account or while your
        organization retains records in accordance with its medical records and retention policies.
        You may request to withdraw or limit use of your information by contacting your healthcare
        organization or MediTap Support; however, withdrawal may prevent some features from
        functioning and may not require deletion of information already incorporated into a legal
        medical record or retained as required by law.
      </p>
    </section>

    <section className="public-page__card">
      <h2>5. Health information and regulatory responsibility</h2>
      <p>
        MediTap is designed to support clinical workflows. Your healthcare organization remains
        responsible for compliance with applicable laws (including HIPAA and state privacy laws where
        applicable), obtaining any additional consents required for your jurisdiction, and
        determining how information is used in production care environments.
      </p>
      <p>
        MediTap does not provide medical advice, diagnosis, or treatment. Clinical decisions remain
        the responsibility of licensed providers who review your record and evaluate you directly.
      </p>
    </section>

    <section className="public-page__card">
      <h2>6. Document upload and imported records</h2>
      <p>
        When you upload documents or authorize import from external systems, you confirm that you
        have the right to share those materials for clinical intake purposes and that they relate to
        your care (or the care of the individual you represent).
      </p>
      <p>
        Automated parsing may suggest field values that require human verification. You agree that
        parsed or synced data should be reviewed by you and/or authorized staff before being relied
        upon for clinical decisions.
      </p>
    </section>

    <section className="public-page__card">
      <h2>7. Acceptable use</h2>
      <p>
        You may not misuse MediTap, attempt to breach security, reverse engineer the service except
        as permitted by law, upload unlawful or harmful content, or enter information about another
        person without proper authorization.
      </p>
    </section>

    <section className="public-page__card">
      <h2>8. Emergency and urgent care</h2>
      <p>
        <strong>MediTap is not for medical emergencies.</strong> If you think you may have a
        medical emergency, call your local emergency number (for example, 911 in the United States)
        or go to the nearest emergency department immediately. Do not rely on MediTap for
        time-sensitive or life-threatening situations.
      </p>
    </section>

    <section className="public-page__card">
      <h2>9. Changes and contact</h2>
      <p>
        We may update these terms from time to time. Material changes will be reflected on this page
        with an updated date. Continued use after changes constitutes acceptance of the revised
        terms.
      </p>
      <p>
        Questions about these terms or your authorization: contact us through the{' '}
        <Link to="/tab8" className="public-page__inline-link">
          Support
        </Link>{' '}
        page or your participating healthcare organization.
      </p>
      <p>
        <em>Last updated: May 2026</em>
      </p>
    </section>
  </PublicPageLayout>
);

export default TermsPage;
