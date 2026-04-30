import React from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './SessionExpiredModal.css';

/**
 * Shown when the JWT can no longer be refreshed or API returns 401.
 */
const SessionExpiredModal: React.FC = () => {
  const history = useHistory();
  const { authReady, sessionExpired, dismissSessionExpired } = useAuth();

  if (!authReady || !sessionExpired) return null;

  const handleGoToLoginPage = () => {
    dismissSessionExpired();
    history.replace('/tab3');
  };

  return (
    <div
      className="session-expired-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
    >
      <div className="session-expired-card">
        <h2 id="session-expired-title" className="session-expired-title">
          Session ended
        </h2>
        <p className="session-expired-text">
          Your sign-in session has expired or is no longer valid. Sign in again to continue
          working in MediTap.
        </p>
        <div className="session-expired-actions">
          <button
            type="button"
            className="session-expired-btn session-expired-btn--primary"
            onClick={handleGoToLoginPage}
          >
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionExpiredModal;
