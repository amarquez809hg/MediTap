import React from 'react';
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import PublicPageLayout from '../components/PublicPageLayout';

function TermsList({ items }: { items: string[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

const TermsPage: React.FC = () => {
  const { t } = useTranslation();
  const s4AuthItems = t('terms.s4.authItems', { returnObjects: true }) as string[];
  const s4RepItems = t('terms.s4.repItems', { returnObjects: true }) as string[];
  const s4AccessItems = t('terms.s4.accessItems', { returnObjects: true }) as string[];

  return (
    <PublicPageLayout
      title={t('terms.title')}
      subtitle={t('terms.subtitle')}
      activeNav="terms"
    >
      <section className="public-page__card">
        <h2>{t('terms.s1.title')}</h2>
        <p>
          <Trans
            i18nKey="terms.s1.p1"
            components={{
              privacyLink: <Link to="/privacy" className="public-page__inline-link" />,
            }}
          />
        </p>
        <p>{t('terms.s1.p2')}</p>
      </section>

      <section className="public-page__card">
        <h2>{t('terms.s2.title')}</h2>
        <p>{t('terms.s2.p1')}</p>
        <p>{t('terms.s2.p2')}</p>
      </section>

      <section className="public-page__card">
        <h2>{t('terms.s3.title')}</h2>
        <p>{t('terms.s3.p1')}</p>
        <TermsList items={t('terms.s3.items', { returnObjects: true }) as string[]} />
      </section>

      <section className="public-page__card public-page__card--accent">
        <h2>{t('terms.s4.title')}</h2>
        <p>
          <strong>{t('terms.s4.lead')}</strong>
        </p>
        <h3>{t('terms.s4.authHeading')}</h3>
        <p>{t('terms.s4.authIntro')}</p>
        <TermsList items={s4AuthItems} />
        <h3>{t('terms.s4.repHeading')}</h3>
        <p>{t('terms.s4.repIntro')}</p>
        <TermsList items={s4RepItems} />
        <h3>{t('terms.s4.accessHeading')}</h3>
        <p>{t('terms.s4.accessIntro')}</p>
        <TermsList items={s4AccessItems} />
        <h3>{t('terms.s4.durationHeading')}</h3>
        <p>{t('terms.s4.durationBody')}</p>
      </section>

      <section className="public-page__card">
        <h2>{t('terms.s5.title')}</h2>
        <p>{t('terms.s5.p1')}</p>
        <p>{t('terms.s5.p2')}</p>
      </section>

      <section className="public-page__card">
        <h2>{t('terms.s6.title')}</h2>
        <p>{t('terms.s6.p1')}</p>
        <p>{t('terms.s6.p2')}</p>
      </section>

      <section className="public-page__card">
        <h2>{t('terms.s7.title')}</h2>
        <p>{t('terms.s7.p1')}</p>
      </section>

      <section className="public-page__card">
        <h2>{t('terms.s8.title')}</h2>
        <p>
          <Trans i18nKey="terms.s8.p1" components={{ strong: <strong /> }} />
        </p>
      </section>

      <section className="public-page__card">
        <h2>{t('terms.s9.title')}</h2>
        <p>{t('terms.s9.p1')}</p>
        <p>
          <Trans
            i18nKey="terms.s9.p2"
            components={{
              supportLink: <Link to="/tab8" className="public-page__inline-link" />,
            }}
          />
        </p>
        <p>
          <em>{t('terms.lastUpdated')}</em>
        </p>
      </section>
    </PublicPageLayout>
  );
};

export default TermsPage;
