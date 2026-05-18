import React, { useState } from 'react';
import PublicPageLayout from '../components/PublicPageLayout';
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
      'Password reset by email is coming soon. For now, contact your care organization administrator or use the contact form below and we will help you regain access.',
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
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const toggleFaq = (index: number) => {
    setActiveFaq(index === activeFaq ? null : index);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <PublicPageLayout
      title="Support & Help"
      subtitle="Answers to common questions and a direct line to our team."
      activeNav="support"
    >
      <section className="public-page__card tab8-faq-wrap">
        <h2>Frequently asked questions</h2>
        <div className="faq-list">
          {faqData.map((item, index) => (
            <div key={item.question} className={`faq-item ${activeFaq === index ? 'active' : ''}`}>
              <button type="button" className="faq-question" onClick={() => toggleFaq(index)}>
                {item.question}
                <span className="faq-icon" aria-hidden>
                  {activeFaq === index ? '−' : '+'}
                </span>
              </button>
              {activeFaq === index && (
                <div className="faq-answer">
                  <p>{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="public-page__card tab8-contact-wrap">
        <h2>Contact support</h2>
        <p className="tab8-contact-lead">Cannot find your answer? Send us a message.</p>
        {submitted && (
          <p className="tab8-success" role="status">
            Thank you. We received your message and will respond shortly.
          </p>
        )}
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="support-name">Your name</label>
            <input
              type="text"
              id="support-name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="support-email">Email</label>
            <input
              type="email"
              id="support-email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="support-subject">Subject</label>
            <input
              type="text"
              id="support-subject"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="support-message">Message</label>
            <textarea
              id="support-message"
              name="message"
              rows={5}
              value={formData.message}
              onChange={handleInputChange}
              required
            />
          </div>
          <button type="submit" className="submit-button">
            Send message
          </button>
        </form>
      </section>

      <section className="public-page__card">
        <h2>Other resources</h2>
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
