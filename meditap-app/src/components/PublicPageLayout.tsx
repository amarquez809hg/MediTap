import React from 'react';
import { Link } from 'react-router-dom';
import './PublicPageLayout.css';

export type PublicNavKey = 'about' | 'support' | 'terms' | 'privacy';

type PublicPageLayoutProps = {
  title: string;
  subtitle?: string;
  activeNav?: PublicNavKey;
  children: React.ReactNode;
};

const PublicPageLayout: React.FC<PublicPageLayoutProps> = ({
  title,
  subtitle,
  activeNav,
  children,
}) => (
  <div className="public-page">
    <header className="public-page__header">
      <Link to="/tab3" className="public-page__logo">
        MediTap
      </Link>
      <nav className="public-page__nav" aria-label="Site">
        <Link
          to="/tab10"
          className={activeNav === 'about' ? 'public-page__nav-link is-active' : 'public-page__nav-link'}
        >
          About us
        </Link>
        <Link
          to="/tab8"
          className={
            activeNav === 'support' ? 'public-page__nav-link is-active' : 'public-page__nav-link'
          }
        >
          Support
        </Link>
      </nav>
    </header>

    <main className="public-page__main">
      <div className="public-page__intro">
        <Link to="/tab3" className="public-page__back">
          <i className="fas fa-arrow-left" aria-hidden /> Back to log in
        </Link>
        <h1 className="public-page__title">{title}</h1>
        {subtitle && <p className="public-page__subtitle">{subtitle}</p>}
      </div>
      {children}
    </main>

    <footer className="public-page__footer">
      <nav className="public-page__footer-nav" aria-label="Legal">
        <Link
          to="/terms"
          className={
            activeNav === 'terms' ? 'public-page__footer-link is-active' : 'public-page__footer-link'
          }
        >
          Terms of Service
        </Link>
        <span className="public-page__footer-sep" aria-hidden>
          ·
        </span>
        <Link
          to="/privacy"
          className={
            activeNav === 'privacy'
              ? 'public-page__footer-link is-active'
              : 'public-page__footer-link'
          }
        >
          Privacy Policy
        </Link>
      </nav>
      <p className="public-page__footer-copy">© {new Date().getFullYear()} MediTap</p>
    </footer>
  </div>
);

export default PublicPageLayout;
