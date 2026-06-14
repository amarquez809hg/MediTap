import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      if (!document.querySelector('.public-page')) return;
      const outlet = document.querySelector('ion-router-outlet');
      if (!outlet || outlet.scrollHeight <= outlet.clientHeight) return;
      outlet.scrollTop += event.deltaY;
      event.preventDefault();
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div className="public-page">
      <header className="public-page__header">
        <Link to="/tab3" className="public-page__logo">
          {t('common.meditap')}
        </Link>
        <nav className="public-page__nav" aria-label="Site">
          <Link
            to="/tab10"
            className={activeNav === 'about' ? 'public-page__nav-link is-active' : 'public-page__nav-link'}
          >
            {t('common.aboutUs')}
          </Link>
          <Link
            to="/tab8"
            className={
              activeNav === 'support' ? 'public-page__nav-link is-active' : 'public-page__nav-link'
            }
          >
            {t('common.support')}
          </Link>
        </nav>
      </header>

      <main className="public-page__main">
        <div className="public-page__intro">
          <Link to="/tab3" className="public-page__back">
            <i className="fas fa-arrow-left" aria-hidden /> {t('common.backToLogin')}
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
            {t('common.termsOfService')}
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
            {t('common.privacyPolicy')}
          </Link>
        </nav>
        <p className="public-page__footer-copy">© {new Date().getFullYear()} {t('common.meditap')}</p>
      </footer>
    </div>
  );
};

export default PublicPageLayout;
