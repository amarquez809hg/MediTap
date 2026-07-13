import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PublicPageLayout from '../components/PublicPageLayout';
import {
  SUPPORT_PROBLEM_CATEGORIES,
  SUPPORT_USER_TYPES,
  fetchSupportConfig,
  submitSupportContact,
  type SupportProblemCategory,
  type SupportUserType,
} from '../api/publicContact';
import './Tab8.css';

type IssueSuggestion = {
  category: SupportProblemCategory;
  title: string;
  description: string;
};

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  user_type: 'visitor' as SupportUserType,
  problem_category: '' as SupportProblemCategory | '',
  message: '',
};

const Tab8: React.FC = () => {
  const { t } = useTranslation();
  const faqData = useMemo(
    () => t('support.faq', { returnObjects: true }) as { question: string; answer: string }[],
    [t]
  );
  const issueSuggestions = useMemo(
    () => t('support.issues', { returnObjects: true }) as IssueSuggestion[],
    [t]
  );
  const faqListId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState('support@meditap.ai');

  useEffect(() => {
    let active = true;
    fetchSupportConfig().then((config) => {
      if (active) setContactEmail(config.contact_email);
    });
    return () => {
      active = false;
    };
  }, []);

  const messageRequired = formData.problem_category === 'other';

  const toggleFaq = (index: number) => {
    setActiveFaq(index === activeFaq ? null : index);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const selectIssue = (category: SupportProblemCategory) => {
    setFormData((prev) => ({ ...prev, problem_category: category }));
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.problem_category) {
      setFormError(t('support.categoryRequired'));
      return;
    }
    setFormError(null);
    setSuccessMessage(null);
    setSubmitting(true);
    try {
      const msg = await submitSupportContact({
        name: formData.name,
        email: formData.email,
        user_type: formData.user_type,
        problem_category: formData.problem_category,
        phone: formData.phone,
        message: formData.message,
      });
      setSuccessMessage(msg);
      setFormData(EMPTY_FORM);
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
      <section className="public-page__card tab8-issues-wrap">
        <h2>{t('support.issuesTitle')}</h2>
        <p className="tab8-section-lead">{t('support.issuesLead')}</p>
        <div className="tab8-issue-grid" role="list">
          {issueSuggestions.map((issue) => {
            const selected = formData.problem_category === issue.category;
            return (
              <button
                key={issue.category}
                type="button"
                role="listitem"
                className={`tab8-issue-card${selected ? ' tab8-issue-card--selected' : ''}`}
                onClick={() => selectIssue(issue.category)}
                aria-pressed={selected}
              >
                <span className="tab8-issue-card__title">{issue.title}</span>
                <span className="tab8-issue-card__desc">{issue.description}</span>
              </button>
            );
          })}
        </div>
      </section>

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
        <p className="tab8-section-lead">{t('support.contactLead')}</p>
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
        <form className="contact-form" onSubmit={handleSubmit} ref={formRef}>
          <div className="tab8-form-section">{t('support.situationSection')}</div>

          <div className="form-group">
            <label htmlFor="support-user-type">{t('support.userType')}</label>
            <select
              id="support-user-type"
              name="user_type"
              value={formData.user_type}
              onChange={handleInputChange}
              disabled={submitting}
            >
              {SUPPORT_USER_TYPES.map((value) => (
                <option key={value} value={value}>
                  {t(`support.userTypes.${value}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="support-problem">
              {t('support.problemCategory')} <span className="tab8-required">*</span>
            </label>
            <select
              id="support-problem"
              name="problem_category"
              value={formData.problem_category}
              onChange={handleInputChange}
              required
              disabled={submitting}
            >
              <option value="">{t('support.problemCategoryPlaceholder')}</option>
              {SUPPORT_PROBLEM_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {t(`support.problemCategories.${value}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="support-message">{t('support.message')}</label>
            <p className="tab8-field-hint">{t('support.messageHint')}</p>
            <textarea
              id="support-message"
              name="message"
              rows={5}
              value={formData.message}
              onChange={handleInputChange}
              required={messageRequired}
              disabled={submitting}
              placeholder={t('support.messagePlaceholder')}
            />
          </div>

          <div className="tab8-form-section">{t('support.reachSection')}</div>

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
            <label htmlFor="support-email">
              {t('support.email')} <span className="tab8-required">*</span>
            </label>
            <input
              type="email"
              id="support-email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              autoComplete="email"
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="support-phone">{t('support.phone')}</label>
            <input
              type="tel"
              id="support-phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              disabled={submitting}
              placeholder={t('support.phonePlaceholder')}
            />
          </div>

          <button type="submit" className="submit-button" disabled={submitting}>
            {submitting ? t('support.sending') : t('support.sendSupportRequest')}
          </button>
        </form>
      </section>

      <section className="public-page__card tab8-resources-wrap">
        <h2>{t('support.otherResources')}</h2>
        <p>
          {t('support.directEmailLabel')}{' '}
          <a href={`mailto:${contactEmail}`} className="tab8-mail-link">
            {contactEmail}
          </a>
        </p>
        <p className="tab8-resources-note">{t('support.deliveryNote')}</p>
        <p>{t('support.otherResourcesPartnership')}</p>
      </section>
    </PublicPageLayout>
  );
};

export default Tab8;
