import React from 'react';
import './StaffElevationModal.css';

type StaffElevationModalProps = {
  open: boolean;
  titleId: string;
  hint: string;
  username: string;
  password: string;
  submitting: boolean;
  error: string | null;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
};

const StaffElevationModal: React.FC<StaffElevationModalProps> = ({
  open,
  titleId,
  hint,
  username,
  password,
  submitting,
  error,
  onUsernameChange,
  onPasswordChange,
  onClose,
  onSubmit,
}) => {
  if (!open) return null;

  return (
    <div className="staff-elevation-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button
        type="button"
        className="staff-elevation-modal__backdrop"
        aria-label="Close dialog"
        disabled={submitting}
        onClick={onClose}
      />
      <div className="staff-elevation-modal__panel">
        <h2 id={titleId}>Staff sign-in required</h2>
        <p className="staff-elevation-modal__hint">{hint}</p>
        <form onSubmit={onSubmit}>
          <div className="form-field">
            <label htmlFor={`${titleId}-user`}>Staff username</label>
            <input
              id={`${titleId}-user`}
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="form-field">
            <label htmlFor={`${titleId}-pass`}>Password</label>
            <input
              id={`${titleId}-pass`}
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              disabled={submitting}
            />
          </div>
          {error && (
            <p className="staff-elevation-modal__error" role="alert">
              {error}
            </p>
          )}
          <div className="staff-elevation-modal__actions">
            <button
              type="button"
              className="staff-elevation-modal__btn staff-elevation-modal__btn--secondary"
              disabled={submitting}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="staff-elevation-modal__btn staff-elevation-modal__btn--primary"
              disabled={submitting}
            >
              {submitting ? 'Signing in…' : 'Unlock and continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StaffElevationModal;
