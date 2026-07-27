import React from 'react';
import './portalShell.css';

type UserPortalLayoutProps = {
  children: React.ReactNode;
};

/**
 * Patient / caregiver shell chrome (Phase 1 — thin banner + nav).
 * Page headers remain on Tab* components until Phase 2 IA carve-out.
 */
const UserPortalLayout: React.FC<UserPortalLayoutProps> = ({ children }) => {
  return (
    <div className="portal-shell portal-shell--user" data-portal="user">
      <header className="portal-shell__chrome" aria-label="User portal">
        <div className="portal-shell__brand">
          <span className="portal-shell__product">MediTap</span>
          <span className="portal-shell__label">Patient portal</span>
        </div>
        <nav className="portal-shell__nav" aria-label="Patient sections">
          <a href="/app/dashboard">Dashboard</a>
          <a href="/app/status">Status</a>
          <a href="/app/intake">Intake</a>
          <a href="/app/appointments">Appointments</a>
          <a href="/app/settings">Settings</a>
        </nav>
      </header>
      <div className="portal-shell__body">{children}</div>
    </div>
  );
};

export default UserPortalLayout;
