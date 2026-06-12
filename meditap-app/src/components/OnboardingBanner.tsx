import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
}) => {
  const { t } = useTranslation();

  return (
    <div className="onboarding-banner" role="region" aria-label={t('onboarding.gettingStartedAria')}>
      <div className="onboarding-banner__text">
        <strong>{t('onboarding.bannerTitle')}</strong>
        <p>
          {t('onboarding.bannerBody', { completed: completedSteps, total: totalSteps })}
        </p>
      </div>
      <div className="onboarding-banner__actions">
        <Link to="/onboarding" className="onboarding-banner__btn onboarding-banner__btn--primary">
          {t('onboarding.continueSetup')}
        </Link>
        <Link to="/tab14" className="onboarding-banner__btn">
          {t('onboarding.patientIntake')}
        </Link>
        {onDismiss && (
          <button type="button" className="onboarding-banner__dismiss" onClick={onDismiss}>
            {t('common.dismiss')}
          </button>
        )}
      </div>
    </div>
  );
};

export default OnboardingBanner;
