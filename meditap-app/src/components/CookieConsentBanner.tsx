import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { applyConsent, initConsent } from '../utils/cookieConsent';
import './CookieConsentBanner.css';

const CookieConsentBanner: React.FC = () => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const shouldShow = initConsent();
    setVisible(shouldShow);
  }, []);

  const handleAccept = useCallback(() => {
    applyConsent('all');
    setVisible(false);
  }, []);

  const handleReject = useCallback(() => {
    applyConsent('essential');
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="mt-cookie-banner"
      role="dialog"
      aria-labelledby="mt-cookie-banner-title"
      aria-describedby="mt-cookie-banner-desc"
    >
      <div className="mt-cookie-banner__inner">
        <div className="mt-cookie-banner__text">
          <p id="mt-cookie-banner-title" className="mt-cookie-banner__title">
            {t('cookies.title')}
          </p>
          <p id="mt-cookie-banner-desc" className="mt-cookie-banner__desc">
            {t('cookies.description')}{' '}
            <Link to="/privacy" className="mt-cookie-banner__link">
              {t('cookies.privacyLink')}
            </Link>
          </p>
        </div>
        <div className="mt-cookie-banner__actions">
          <button
            type="button"
            className="mt-cookie-banner__btn mt-cookie-banner__btn--outline"
            onClick={handleReject}
          >
            {t('cookies.essentialOnly')}
          </button>
          <button
            type="button"
            className="mt-cookie-banner__btn mt-cookie-banner__btn--accept"
            onClick={handleAccept}
          >
            {t('cookies.acceptAll')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
