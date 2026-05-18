import React from 'react';
import PublicPageLayout from '../components/PublicPageLayout';

const Tab10: React.FC = () => (
  <PublicPageLayout
    title="About MediTap"
    subtitle="Closing the gap between where patient data lives and where care is delivered."
    activeNav="about"
  >
    <section className="public-page__card">
      <h2>The problem</h2>
      <p>
        Despite decades of investment in digital health, clinicians still lack a unified,
        bedside-ready view of the patient story. MyChart, HIEs, and lab networks each hold part of
        the puzzle—but none deliver complete context at the moment of care.
      </p>
    </section>

    <section className="public-page__card public-page__card--accent">
      <h2>The MediTap solution</h2>
      <p>
        MediTap empowers patients to carry their medical history across networks with consent-first
        sharing and fast intake—from structured forms and uploaded PDFs and images.
      </p>
      <ul>
        <li>Patient-led intake with document extraction</li>
        <li>Staff workflows for review and chart updates</li>
        <li>Epic FHIR sandbox–ready for health-system pilots</li>
      </ul>
    </section>

    <section className="public-page__card">
      <h2>Who we serve</h2>
      <p>
        Hospitals, clinics, and digital health partners evaluating faster onboarding, better data
        quality at intake, and interoperable connections to existing EHR investments.
      </p>
    </section>
  </PublicPageLayout>
);

export default Tab10;
