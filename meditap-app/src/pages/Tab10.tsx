import React from 'react';
import { useTranslation } from 'react-i18next';
import PublicPageLayout from '../components/PublicPageLayout';

const Tab10: React.FC = () => {
  const { t } = useTranslation();
  const solutionItems = t('about.solutionItems', { returnObjects: true }) as string[];

  return (
    <PublicPageLayout
      title={t('about.title')}
      subtitle={t('about.subtitle')}
      activeNav="about"
    >
      <section className="public-page__card">
        <h2>{t('about.problemTitle')}</h2>
        <p>{t('about.problemBody')}</p>
      </section>

      <section className="public-page__card public-page__card--accent">
        <h2>{t('about.solutionTitle')}</h2>
        <p>{t('about.solutionBody')}</p>
        <ul>
          {solutionItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="public-page__card">
        <h2>{t('about.whoTitle')}</h2>
        <p>{t('about.whoBody')}</p>
      </section>
    </PublicPageLayout>
  );
};

export default Tab10;
