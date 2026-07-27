import React from 'react';
import './portalShell.css';

type AdminPortalLayoutProps = {
  children: React.ReactNode;
};

/**
 * Staff / org-admin shell chrome (Phase 1 — thin banner + nav).
 * Full admin IA (inbox, patient context) arrives in Phase 3.
 */
const AdminPortalLayout: React.FC<AdminPortalLayoutProps> = ({ children }) => {
  return (
    <div className="portal-shell portal-shell--admin" data-portal="admin">
      <header className="portal-shell__chrome" aria-label="Admin portal">
        <div className="portal-shell__brand">
          <span className="portal-shell__product">MediTap</span>
          <span className="portal-shell__label">Admin portal</span>
        </div>
        <nav className="portal-shell__nav" aria-label="Admin sections">
          <a href="/admin-portal/home">Home</a>
          <a href="/admin-portal/panel">Admin panel</a>
          <a href="/app/dashboard">Patient view</a>
        </nav>
      </header>
      <div className="portal-shell__body">{children}</div>
    </div>
  );
};

export default AdminPortalLayout;
