import React, { useEffect, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  isOnboardingComplete,
  loadOnboarding,
  markOnboardingStep,
  patientInfoLooksComplete,
  skipOnboarding,
  startOnboardingForNewUser,
  type OnboardingSteps,
} from '../onboarding/onboardingStorage';
import './OnboardingPage.css';

const STEPS = [
  {
    id: 'profile' as const,
    title: 'Complete your profile',
    body: 'Add your name, date of birth, and contact details so your care team recognizes you.',
    href: '/tab14',
    cta: 'Open patient information',
  },
  {
    id: 'upload' as const,
    title: 'Upload a medical document',
    body: 'Bring a PDF or photo of records, labs, or a visit summary—we can help pre-fill your intake.',
    href: '/tab14',
    cta: 'Upload on intake form',
  },
  {
    id: 'finished' as const,
    title: 'You are ready',
    body: 'Your dashboard shows health metrics, appointments, and records. You can update intake anytime.',
    href: '/tab1',
    cta: 'Go to dashboard',
  },
];

const OnboardingPage: React.FC = () => {
  const history = useHistory();
  const { username, authReady, isAuthenticated } = useAuth();
  const [steps, setSteps] = useState<OnboardingSteps | null>(null);

  useEffect(() => {
    if (authReady && !isAuthenticated) {
      history.replace('/tab3');
    }
  }, [authReady, isAuthenticated, history]);

  useEffect(() => {
    if (!authReady || !isAuthenticated) return;
    let rec = loadOnboarding(username);
    if (!rec && username) {
      startOnboardingForNewUser(username);
      rec = loadOnboarding(username);
    }
    if (rec) {
      const next = { ...rec.steps };
      if (patientInfoLooksComplete() && !next.profile) {
        markOnboardingStep(username, 'profile', true);
        next.profile = true;
      }
      setSteps(next);
    }
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
    const rec = loadOnboarding(username);
    if (rec) setSteps({ ...rec.steps });
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
        <p className="onboarding-page__loading">Loading…</p>
      </div>
    );
  }

  const completedCount = [steps.profile, steps.upload].filter(Boolean).length;

  return (
    <div className="onboarding-page">
      <header className="onboarding-page__header">
        <Link to="/tab1" className="onboarding-page__logo">
          MediTap
        </Link>
        <button type="button" className="onboarding-page__skip" onClick={onSkip}>
          Skip for now
        </button>
      </header>

      <main className="onboarding-page__main">
        <h1 className="onboarding-page__title">Welcome to MediTap</h1>
        <p className="onboarding-page__subtitle">
          Three quick steps to get the most from your account ({completedCount} of 2 done).
        </p>

        <ol className="onboarding-steps">
          {STEPS.map((step, index) => {
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

        <p className="onboarding-page__hint">
          Need help? Visit <Link to="/tab8">Support</Link> or email{' '}
          <a href="mailto:support@meditap.ai">support@meditap.ai</a>.
        </p>
      </main>
    </div>
  );
};

export default OnboardingPage;
