import React from 'react';
import { Link } from 'react-router-dom';
import './DashboardHomeHero.css';

type DashboardHomeHeroProps = {
  greeting: string;
  contextLine: string;
};

const QUICK_ACTIONS = [
  { href: '/tab14', icon: 'fas fa-user-edit', label: 'Update intake' },
  { href: '/tab14', icon: 'fas fa-file-upload', label: 'Upload document' },
  { href: '/tab2', icon: 'fas fa-chart-line', label: 'Quick status' },
] as const;

const DashboardHomeHero: React.FC<DashboardHomeHeroProps> = ({ greeting, contextLine }) => (
  <section className="dashboard-hero" aria-label="Welcome">
    <div className="dashboard-hero__text">
      <h1 className="dashboard-hero__greeting">{greeting}</h1>
      <p className="dashboard-hero__context">{contextLine}</p>
    </div>
    <nav className="dashboard-hero__actions" aria-label="Quick actions">
      {QUICK_ACTIONS.map((action) => (
        <Link
          key={action.label}
          to={action.href}
          className="dashboard-hero__action meditap-glass-btn meditap-glass-btn--compact"
        >
          <i className={action.icon} aria-hidden />
          <span>{action.label}</span>
        </Link>
      ))}
    </nav>
  </section>
);

export default DashboardHomeHero;
