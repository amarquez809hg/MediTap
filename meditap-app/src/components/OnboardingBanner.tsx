import React from 'react';
import { Link } from 'react-router-dom';
import './OnboardingBanner.css';

type OnboardingBannerProps = {
  completedSteps: number;
  totalSteps: number;
  onDismiss?: () => void;
};

const OnboardingBanner: React.FC<OnboardingBannerProps> = ({
  completedSteps,
  totalSteps,
  onDismiss,
}) => (
  <div className="onboarding-banner" role="region" aria-label="Getting started">
    <div className="onboarding-banner__text">
      <strong>Finish setting up your account</strong>
      <p>
        {completedSteps} of {totalSteps} setup steps complete. Continue your guided setup or open
        patient intake.
      </p>
    </div>
    <div className="onboarding-banner__actions">
      <Link to="/onboarding" className="onboarding-banner__btn onboarding-banner__btn--primary">
        Continue setup
      </Link>
      <Link to="/tab14" className="onboarding-banner__btn">
        Patient intake
      </Link>
      {onDismiss && (
        <button type="button" className="onboarding-banner__dismiss" onClick={onDismiss}>
          Dismiss
        </button>
      )}
    </div>
  </div>
);

export default OnboardingBanner;
