import React, { useState } from 'react';
import './Tab8.css';

// Data for a simple FAQ section
const faqData = [
  {
    question: 'How do I reset my password?',
    answer: 'You can reset your password by clicking the "Forgot Password" link on the login page and following the instructions sent to your registered email address.',
  },
  {
    question: 'Where can I find my account settings?',
    answer: 'Your account settings are located under the profile icon in the top right corner of the dashboard.',
  },
  {
    question: 'Is there a guide for new users?',
    answer: 'Yes! You can find a comprehensive "Getting Started" guide in the Documentation section linked below.',
  },
];

const Tab8: React.FC = () => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });

  const toggleFaq = (index: number) => {
    setActiveFaq(index === activeFaq ? null : index);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Send this data to your backend API
    console.log('Support Form Submitted:', formData);
    alert('Thank you for your message! We will get back to you shortly.');
    setFormData({ name: '', email: '', subject: '', message: '' }); // Clear form
  };

  return (
    <div className="tab8-container">
      <h1>💡 Support & Help Center</h1>
      <button className="book-btn">
            <a href="http://localhost:8100/tab3" className="nav-item">
            <i className="fas fa-plus"></i> 
            Go back to CareTap Login
             </a>
             </button>

      {/* --- FAQ Section --- */}
      <section className="faq-section">
        <h2>Frequently Asked Questions</h2>
        <div className="faq-list">
          {faqData.map((item, index) => (
            <div key={index} className={`faq-item ${activeFaq === index ? 'active' : ''}`}>
              <button className="faq-question" onClick={() => toggleFaq(index)}>
                {item.question}
                <span className="faq-icon">{activeFaq === index ? '−' : '+'}</span>
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

      {/* --- Contact Form Section --- */}
      <section className="contact-form-section">
        <h2>Contact Support</h2>
        <p>Can't find your answer? Send us a message directly.</p>
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Your Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="subject">Subject</label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="message">Message</label>
            <textarea
              id="message"
              name="message"
              rows={5}
              value={formData.message}
              onChange={handleInputChange}
              required
            ></textarea>
          </div>
          <button type="submit" className="submit-button">Send Message</button>
        </form>
      </section>

      {/* --- Resources Section --- */}
      <section className="resources-section">
        <h2>Further Resources</h2>
        <div className="resource-links">
          <a href="/documentation" target="_blank" rel="noopener noreferrer">📚 Documentation</a>
          <a href="/video-tutorials" target="_blank" rel="noopener noreferrer">▶️ Video Tutorials</a>
          <a href="mailto:support@yourcompany.com">📧 Direct Email</a>
        </div>
      </section>
    </div>
  );
};

export default Tab8;