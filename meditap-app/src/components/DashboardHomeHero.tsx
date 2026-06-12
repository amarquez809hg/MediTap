import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './DashboardHomeHero.css';

type DashboardHomeHeroProps = {
  greeting: string;
  contextLine: string;
};

const QUICK_ACTIONS = [
  { href: '/tab14', icon: 'fas fa-user-edit', labelKey: 'dashboard.updateIntake' },
  { href: '/tab14', icon: 'fas fa-file-upload', labelKey: 'dashboard.uploadDocument' },
  { href: '/tab2', icon: 'fas fa-chart-line', labelKey: 'dashboard.quickStatusLink' },
] as const;

const DashboardHomeHero: React.FC<DashboardHomeHeroProps> = ({ greeting, contextLine }) => {
  const { t } = useTranslation();

  return (
    <section className="dashboard-hero" aria-label={t('dashboard.welcomeAria')}>
      <div className="dashboard-hero__text">
        <h1 className="dashboard-hero__greeting">{greeting}</h1>
        <p className="dashboard-hero__context">{contextLine}</p>
      </div>
      <nav className="dashboard-hero__actions" aria-label={t('dashboard.quickActionsAria')}>
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.labelKey}
            to={action.href}
            className="dashboard-hero__action meditap-glass-btn meditap-glass-btn--compact"
          >
            <i className={action.icon} aria-hidden />
            <span>{t(action.labelKey)}</span>
          </Link>
        ))}
      </nav>
    </section>
  );
};

export default DashboardHomeHero;
