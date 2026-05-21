import React from 'react';
import { Link } from 'react-router-dom';
import {
  NEXT_STEP_FA_ICON,
  type NextStepItem,
  type NextStepTone,
} from '../dashboard/nextSteps';
import './DashboardNextSteps.css';

type DashboardNextStepsProps = {
  steps: NextStepItem[];
  loading?: boolean;
};

const DashboardNextSteps: React.FC<DashboardNextStepsProps> = ({ steps, loading }) => (
  <section className="dashboard-next-steps" aria-labelledby="dashboard-next-steps-title">
    <header className="dashboard-next-steps__header">
      <h2 id="dashboard-next-steps-title" className="dashboard-next-steps__title">
        <i className="fas fa-list-check" aria-hidden /> Your next steps
      </h2>
      <p className="dashboard-next-steps__hint">
        Based on your profile, appointments, and lab status.
      </p>
    </header>

    {loading ? (
      <div className="dashboard-next-steps__loading" role="status">
        <i className="fas fa-spinner fa-spin" aria-hidden />
        <span>Building your next steps…</span>
      </div>
    ) : steps.length === 0 ? (
      <p className="dashboard-next-steps__empty">
        You are caught up for now. Use Quick status or Patient Information anytime.
      </p>
    ) : (
      <ul className="dashboard-next-steps__grid">
        {steps.map((step) => (
          <li key={step.id}>
            <Link
              to={step.href}
              className={`dashboard-next-step dashboard-next-step--${step.tone as NextStepTone}`}
            >
              <span className="dashboard-next-step__icon" aria-hidden>
                <i className={NEXT_STEP_FA_ICON[step.id] ?? 'fas fa-arrow-right'} />
              </span>
              <span className="dashboard-next-step__body">
                <span className="dashboard-next-step__title">{step.title}</span>
                <span className="dashboard-next-step__subtitle">{step.subtitle}</span>
              </span>
              <i className="fas fa-chevron-right dashboard-next-step__chevron" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    )}
  </section>
);

export default DashboardNextSteps;
