import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './portalShell.css';

/**
 * Admin portal landing (Phase 1 stub).
 * Work queue / patient search arrive in Phase 3.
 */
const AdminPortalHome: React.FC = () => {
  const { username, portalRole, permissions } = useAuth();

  return (
    <div className="portal-home">
      <h1>Admin home</h1>
      <p>
        Signed in as <strong>{username || 'staff'}</strong> ({portalRole}). This is the staff
        workspace landing — patient chart review and inbox land in later phases.
      </p>
      {permissions.length > 0 ? (
        <p style={{ fontSize: '0.85rem' }}>
          Permissions: {permissions.slice(0, 8).join(', ')}
          {permissions.length > 8 ? '…' : ''}
        </p>
      ) : null}
      <div className="portal-home__actions">
        <Link to="/admin-portal/panel">Open admin panel</Link>
        <Link to="/app/dashboard">Open patient portal view</Link>
      </div>
    </div>
  );
};

export default AdminPortalHome;
