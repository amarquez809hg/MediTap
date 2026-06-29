import React from 'react';
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import PublicPageLayout from '../components/PublicPageLayout';

const PrivacyPage: React.FC = () => {
  const { t } = useTranslation();
  const collectItems = t('privacy.collectItems', { returnObjects: true }) as string[];
  const useItems = t('privacy.useItems', { returnObjects: true }) as string[];

  return (
    <PublicPageLayout
      title={t('privacy.title')}
      subtitle={t('privacy.subtitle')}
      activeNav="privacy"
    >
      <section className="public-page__card">
        <h2>{t('privacy.overviewTitle')}</h2>
        <p>{t('privacy.overviewBody')}</p>
      </section>

      <section className="public-page__card">
        <h2>{t('privacy.collectTitle')}</h2>
        <ul>
          {collectItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="public-page__card">
        <h2>{t('privacy.useTitle')}</h2>
        <p>{t('privacy.useIntro')}</p>
        <ul>
          {useItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="public-page__card">
        <h2>{t('privacy.sharingTitle')}</h2>
        <p>{t('privacy.sharingBody')}</p>
      </section>

      <section className="public-page__card">
        <h2>{t('privacy.securityTitle')}</h2>
        <p>{t('privacy.securityBody')}</p>
      </section>

      <section className="public-page__card">
        <h2>{t('privacy.choicesTitle')}</h2>
        <p>
          <Trans
            i18nKey="privacy.choicesBody"
            components={{
              supportLink: <Link to="/tab8" className="public-page__inline-link" />,
            }}
          />
        </p>
        <p>
          <em>{t('privacy.lastUpdated')}</em>
        </p>
      </section>
    </PublicPageLayout>
  );
};

export default PrivacyPage;
