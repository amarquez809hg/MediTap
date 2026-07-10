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

        <h3>{t('terms.s4.hipaaHeading')}</h3>
        <p>{t('terms.s4.hipaaP1')}</p>
        <p>{t('terms.s4.hipaaP2')}</p>

        <h3>{t('terms.s4.authHeading')}</h3>
        <p>{t('terms.s4.authIntro')}</p>
        <TermsList items={t('terms.s4.authItems', { returnObjects: true }) as string[]} />
        <p>{t('terms.s4.authNote')}</p>

        <h3>{t('terms.s4.repHeading')}</h3>
        <p>{t('terms.s4.repIntro')}</p>
        <TermsList items={t('terms.s4.repItems', { returnObjects: true }) as string[]} />

        <h3>{t('terms.s4.accessHeading')}</h3>
        <p>{t('terms.s4.accessIntro')}</p>
        <p>{t('terms.s4.accessSubIntro')}</p>
        <TermsList items={t('terms.s4.accessItems', { returnObjects: true }) as string[]} />
        <p>{t('terms.s4.accessMinimumNecessary')}</p>

        <h3>{t('terms.s4.securityHeading')}</h3>
        <p>{t('terms.s4.securityIntro')}</p>
        <p>{t('terms.s4.securityIntro2')}</p>
        <TermsList items={t('terms.s4.securityItems', { returnObjects: true }) as string[]} />
        <p>{t('terms.s4.securityClosing')}</p>

        <h3>{t('terms.s4.emergencyHeading')}</h3>
        <p>{t('terms.s4.emergencyBody')}</p>

        <h3>{t('terms.s4.privacyRightsHeading')}</h3>
        <p>{t('terms.s4.privacyRightsIntro')}</p>
        <TermsList items={t('terms.s4.privacyRightsItems', { returnObjects: true }) as string[]} />
        <p>{t('terms.s4.privacyRightsClosing')}</p>

        <h3>{t('terms.s4.willNotHeading')}</h3>
        <p>{t('terms.s4.willNotIntro')}</p>
        <TermsList items={t('terms.s4.willNotItems', { returnObjects: true }) as string[]} />

        <h3>{t('terms.s4.retentionHeading')}</h3>
        <p>{t('terms.s4.retentionBody')}</p>

        <h3>{t('terms.s4.breachHeading')}</h3>
        <p>{t('terms.s4.breachBody')}</p>

        <h3>{t('terms.s4.contactHeading')}</h3>
        <p>{t('terms.s4.contactIntro')}</p>
        <p>
          <strong>{t('terms.s4.contactOrg')}</strong>
          <br />
          <Trans
            i18nKey="terms.s4.contactEmail"
            components={{
              emailLink: (
                <a href="mailto:cindyrenee@meditap.ai" className="public-page__inline-link" />
              ),
            }}
          />
        </p>
        <p>{t('terms.s4.closing')}</p>
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
