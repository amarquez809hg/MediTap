import React, { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PublicPageLayout from '../components/PublicPageLayout';
import { submitSupportContact } from '../api/publicContact';
import './Tab8.css';

const faqData = [
  {
    question: 'How do I create a MediTap account?',
    answer:
      'From the log in page, choose Create an account. Enter a username, email, and password. After registration you can sign in and complete your patient intake.',
  },
  {
    question: 'I forgot my password. What should I do?',
    answer:
      'On the log in page, choose Forgot password and enter your account email. We will send a secure link to reset your password. The link expires after use; request a new one if needed.',
  },
  {
    question: 'How does staff editing work?',
    answer:
      'Patients can upload documents and review their information. Authorized staff unlock editing from the intake or admin screens using staff credentials—without signing the patient out.',
  },
  {
    question: 'Is Epic integration required?',
    answer:
      'No. Epic FHIR sandbox linking is optional and is configured from the Admin panel after you log in, for pilots and technical demonstrations.',
  },
];

const Tab8: React.FC = () => {
  const { t } = useTranslation();
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
      setFormError(err instanceof Error ? err.message : 'Could not send your message.');
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
          For product demos and partnership inquiries, mention your organization in the message
          subject line.
        </p>
      </section>
    </PublicPageLayout>
  );
};

export default Tab8;
