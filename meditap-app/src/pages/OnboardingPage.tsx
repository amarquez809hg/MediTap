import React, { useEffect, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import {
  isOnboardingComplete,
  loadOnboarding,
  markOnboardingStep,
  skipOnboarding,
  startOnboardingForNewUser,
  type OnboardingSteps,
} from '../onboarding/onboardingStorage';
import { loadTab14FromBackend } from '../api';
import './OnboardingPage.css';

const OnboardingPage: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const { username, authReady, isAuthenticated } = useAuth();
  const [steps, setSteps] = useState<OnboardingSteps | null>(null);
  const onboardingSteps = [
    {
      id: 'profile' as const,
      title: t('onboarding.stepProfileTitle'),
      body: t('onboarding.stepProfileBody'),
      href: '/tab14',
      cta: t('onboarding.stepProfileCta'),
    },
    {
      id: 'upload' as const,
      title: t('onboarding.stepUploadTitle'),
      body: t('onboarding.stepUploadBody'),
      href: '/tab14',
      cta: t('onboarding.stepUploadCta'),
    },
    {
      id: 'finished' as const,
      title: t('onboarding.stepReadyTitle'),
      body: t('onboarding.stepReadyBody'),
      href: '/tab1',
      cta: t('onboarding.stepReadyCta'),
    },
  ];

  useEffect(() => {
    if (authReady && !isAuthenticated) {
      history.replace('/tab3');
    }
  }, [authReady, isAuthenticated, history]);

  useEffect(() => {
    if (!authReady || !isAuthenticated) return;
    let cancelled = false;
    (async () => {
      let rec = loadOnboarding(username);
      if (!rec && username) {
        startOnboardingForNewUser(username);
        rec = loadOnboarding(username);
      }
      if (!rec) return;

      const next = { ...rec.steps };
      try {
        const bundle = await loadTab14FromBackend(username);
        if (
          !cancelled &&
          bundle.hasPatient &&
          bundle.patient.givenName.trim() &&
          bundle.patient.familyName.trim() &&
          !next.profile
        ) {
          markOnboardingStep(username, 'profile', true);
          next.profile = true;
        }
      } catch {
        /* onboarding can still render without API */
      }
      if (!cancelled) setSteps(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, isAuthenticated, username]);

  useEffect(() => {
    if (isOnboardingComplete(username)) {
      history.replace('/tab1');
    }
  }, [username, history, steps]);

  useEffect(() => {
    const onFocus = () => refreshSteps();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [username]);

  const refreshSteps = () => {
    void (async () => {
      const rec = loadOnboarding(username);
      if (!rec) return;
      const next = { ...rec.steps };
      try {
        const bundle = await loadTab14FromBackend(username);
        if (
          bundle.hasPatient &&
          bundle.patient.givenName.trim() &&
          bundle.patient.familyName.trim()
        ) {
          if (!next.profile) markOnboardingStep(username, 'profile', true);
          next.profile = true;
        }
      } catch {
        /* keep cached onboarding steps */
      }
      setSteps(next);
    })();
  };

  const finishAndGoDashboard = () => {
    markOnboardingStep(username, 'finished', true);
    history.replace('/tab1');
  };

  const onSkip = () => {
    skipOnboarding(username);
    history.replace('/tab1');
  };

  if (!steps) {
    return (
      <div className="onboarding-page">
        <p className="onboarding-page__loading">{t('onboarding.loading')}</p>
      </div>
    );
  }

  const completedCount = [steps.profile, steps.upload].filter(Boolean).length;

  return (
    <div className="onboarding-page">
      <header className="onboarding-page__header">
        <Link to="/tab1" className="onboarding-page__logo">
          {t('common.meditap')}
        </Link>
        <button type="button" className="onboarding-page__skip" onClick={onSkip}>
          {t('onboarding.skipForNow')}
        </button>
      </header>

      <main className="onboarding-page__main">
        <h1 className="onboarding-page__title">{t('onboarding.welcome')}</h1>
        <p className="onboarding-page__subtitle">
          {t('onboarding.progress', { done: completedCount })}
        </p>

        <ol className="onboarding-steps">
          {onboardingSteps.map((step, index) => {
            const done =
              step.id === 'profile'
                ? steps.profile
                : step.id === 'upload'
                  ? steps.upload
                  : steps.profile && steps.upload;
            const isCurrent =
              step.id === 'profile'
                ? !steps.profile
                : step.id === 'upload'
                  ? steps.profile && !steps.upload
                  : steps.profile && steps.upload;

            return (
              <li
                key={step.id}
                className={`onboarding-step ${done ? 'is-done' : ''} ${isCurrent ? 'is-current' : ''}`}
              >
                <div className="onboarding-step__marker" aria-hidden>
                  {done ? '✓' : index + 1}
                </div>
                <div className="onboarding-step__body">
                  <h2>{step.title}</h2>
                  <p>{step.body}</p>
                  {step.id === 'finished' ? (
                    <button
                      type="button"
                      className="onboarding-step__cta"
                      onClick={finishAndGoDashboard}
                      disabled={!steps.profile || !steps.upload}
                    >
                      {step.cta}
                    </button>
                  ) : (
                    <Link
                      to={step.href}
                      className="onboarding-step__cta"
                      onClick={() => {
                        window.addEventListener(
                          'focus',
                          () => refreshSteps(),
                          { once: true }
                        );
                      }}
                    >
                      {step.cta}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <p className="onboarding-page__hint">{t('onboarding.needHelp')}</p>
      </main>
    </div>
  );
};

export default OnboardingPage;
