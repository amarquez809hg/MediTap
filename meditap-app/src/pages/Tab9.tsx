import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Tab9.css';
import { useAuth } from '../contexts/AuthContext';

// Interface for the form data state based on the provided image
interface RegistrationFormData {
  givenName: string;
  lastName: string;
  dateOfBirth: string;
  bloodType: string;
  email: string;
  phoneNumber: string;
  sexAtBirth: string;
}

const Tab9: React.FC = () => {
  const { registerWithKeycloak, keycloakReady } = useAuth();
  const [formData, setFormData] = useState<RegistrationFormData>({
    givenName: '',
    lastName: '',
    dateOfBirth: '',
    bloodType: '',
    email: '',
    phoneNumber: '',
    sexAtBirth: '',
  });
  const [errors, setErrors] = useState<Partial<RegistrationFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
    // Clear error for the current field as user types
    setErrors(prevErrors => ({ ...prevErrors, [name]: undefined }));
  };

  const validateForm = () => {
    const newErrors: Partial<RegistrationFormData> = {};
    
    // Basic presence validation for all required fields
    if (!formData.givenName.trim()) newErrors.givenName = 'Given Name is required.';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last Name is required.';
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of Birth is required.';
    if (!formData.bloodType) newErrors.bloodType = 'Blood Type is required.';
    if (!formData.sexAtBirth) newErrors.sexAtBirth = 'Sex at Birth is required.';

    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'A valid E-Mail address is required.';
    }
    
    // Basic phone number validation (digits only)
    if (!/^\d{10,}$/.test(formData.phoneNumber)) {
        newErrors.phoneNumber = 'A valid phone number (10+ digits) is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (validateForm()) {
      // In a real application, this is where you would call your API for user registration
      setTimeout(() => {
        console.log('Account Registration Data:', formData);
        
        // Use a custom modal or message box instead of alert()
        console.log('Success! Registration simulated.');

        // Reset the form
        setFormData({
          givenName: '',
          lastName: '',
          dateOfBirth: '',
          bloodType: '',
          email: '',
          phoneNumber: '',
          sexAtBirth: '',
        });
        setIsSubmitting(false);

      }, 1500);
    } else {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="registration-container">
      <div className="registration-card">
        <h2>CREATE AN ACCOUNT</h2>
        <p className="subtitle">
          Register through Keycloak (enable &quot;User registration&quot; on the realm), then you
          can complete medical profile details here or in the app.
        </p>

        <button
          type="button"
          className="submit-btn"
          style={{ marginBottom: '1.5rem', width: '100%' }}
          onClick={registerWithKeycloak}
          disabled={!keycloakReady}
        >
          Register with Keycloak
        </button>

        <p className="subtitle" style={{ marginBottom: '1rem' }}>
          Optional — save profile details locally (API hookup later):
        </p>

        <form onSubmit={handleSubmit}>
          
          {/* GIVEN NAME and LAST NAME */}
          <div className="name-group">
            <div className="form-group half-width">
              <label htmlFor="givenName">GIVEN NAME</label>
              <input
                type="text"
                id="givenName"
                name="givenName"
                value={formData.givenName}
                onChange={handleInputChange}
              />
              {errors.givenName && <p className="error-message">{errors.givenName}</p>}
            </div>

            <div className="form-group half-width">
              <label htmlFor="lastName">LAST NAME</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
              />
              {errors.lastName && <p className="error-message">{errors.lastName}</p>}
            </div>
          </div>

          {/* DATE OF BIRTH and BLOOD TYPE */}
          <div className="data-group">
            <div className="form-group half-width">
              <label htmlFor="dateOfBirth">DATE OF BIRTH</label>
              <input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                max={new Date().toISOString().split('T')[0]} // Prevent future dates
              />
              {errors.dateOfBirth && <p className="error-message">{errors.dateOfBirth}</p>}
            </div>

            <div className="form-group half-width">
              <label htmlFor="bloodType">BLOOD TYPE</label>
              <select
                id="bloodType"
                name="bloodType"
                value={formData.bloodType}
                onChange={handleInputChange}
              >
                <option value="" disabled>Select</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => (
                    <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.bloodType && <p className="error-message">{errors.bloodType}</p>}
            </div>
          </div>

          {/* E-MAIL */}
          <div className="form-group">
            <label htmlFor="email">E-MAIL</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
            />
            {errors.email && <p className="error-message">{errors.email}</p>}
          </div>

          {/* PHONE NUMBER and SEX AT BIRTH */}
          <div className="data-group">
            <div className="form-group half-width">
              <label htmlFor="phoneNumber">PHONE NUMBER</label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                placeholder="e.g. 5551234567"
              />
              {errors.phoneNumber && <p className="error-message">{errors.phoneNumber}</p>}
            </div>
            
            <div className="form-group half-width">
              <label htmlFor="sexAtBirth">SEX AT BIRTH</label>
              <select
                id="sexAtBirth"
                name="sexAtBirth"
                value={formData.sexAtBirth}
                onChange={handleInputChange}
              >
                <option value="" disabled>Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              {errors.sexAtBirth && <p className="error-message">{errors.sexAtBirth}</p>}
            </div>
          </div>

          
          <button type="submit" className="submit-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save profile draft'}
          </button>
        </form>

        <div className="login-link">
          Already have an account? <Link to="/tab3">Log in</Link>
        </div>

      </div>
    </div>
  );
};

export default Tab9;