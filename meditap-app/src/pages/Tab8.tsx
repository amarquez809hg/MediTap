import React, { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PublicPageLayout from '../components/PublicPageLayout';
import { submitSupportContact } from '../api/publicContact';
import './Tab8.css';

const Tab8: React.FC = () => {
  const { t } = useTranslation();
  const faqData = useMemo(
    () => t('support.faq', { returnObjects: true }) as { question: string; answer: string }[],
    [t]
  );
  const faqListId = useId();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const toggleFaq = (index: number) => {
    setActiveFaq(index === activeFaq ? null : index);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    setSubmitting(true);
    try {
      const msg = await submitSupportContact(formData);
      setSuccessMessage(msg);
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('support.sendError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicPageLayout
      title={t('support.title')}
      subtitle={t('support.subtitle')}
      activeNav="support"
    >
      <section className="public-page__card tab8-faq-wrap">
        <h2>{t('support.faqTitle')}</h2>
        <div className="faq-list" id={faqListId}>
          {faqData.map((item, index) => {
            const expanded = activeFaq === index;
            const answerId = `${faqListId}-answer-${index}`;
            return (
              <div key={item.question} className={`faq-item ${expanded ? 'active' : ''}`}>
                <button
                  type="button"
                  className="faq-question"
                  onClick={() => toggleFaq(index)}
                  aria-expanded={expanded}
                  aria-controls={answerId}
                >
                  {item.question}
                  <span className="faq-icon" aria-hidden>
                    {expanded ? '−' : '+'}
                  </span>
                </button>
                {expanded && (
                  <div className="faq-answer" id={answerId} role="region">
                    <p>{item.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="public-page__card tab8-contact-wrap">
        <h2>{t('support.contactTitle')}</h2>
        <p className="tab8-contact-lead">
          {t('support.contactLead')}
        </p>
        {formError && (
          <p className="tab8-error" role="alert">
            {formError}
          </p>
        )}
        {successMessage && (
          <p className="tab8-success" role="status">
            {successMessage}
          </p>
        )}
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="support-name">{t('support.yourName')}</label>
            <input
              type="text"
              id="support-name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              disabled={submitting}
            />
          </div>
          <div className="form-group">
            <label htmlFor="support-email">{t('support.email')}</label>
            <input
              type="email"
              id="support-email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              disabled={submitting}
            />
          </div>
          <div className="form-group">
            <label htmlFor="support-subject">{t('support.subject')}</label>
            <input
              type="text"
              id="support-subject"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              required
              disabled={submitting}
            />
          </div>
          <div className="form-group">
            <label htmlFor="support-message">{t('support.message')}</label>
            <textarea
              id="support-message"
              name="message"
              rows={5}
              value={formData.message}
              onChange={handleInputChange}
              required
              disabled={submitting}
            />
          </div>
          <button type="submit" className="submit-button" disabled={submitting}>
            {submitting ? t('support.sending') : t('support.sendMessage')}
          </button>
        </form>
      </section>

      <section className="public-page__card">
        <h2>{t('support.otherResources')}</h2>
        <p>
          Email:{' '}
          <a href="mailto:support@meditap.ai" className="tab8-mail-link">
            support@meditap.ai
          </a>
        </p>
        <p>
          {t('support.otherResourcesPartnership')}
        </p>
      </section>
    </PublicPageLayout>
  );
};

export default Tab8;
