import React from 'react';
import { Redirect } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { canAccessAdminPortal } from '../portals/portalIdentity';
import { USER_PORTAL_HOME, LOGIN_PATH } from '../portals/portalPaths';
import ProtectedRoute from './ProtectedRoute';

/**
 * Requires authentication + admin portal access (staff / org_admin).
 * Patients are redirected to the user portal home.
 */
const AdminPortalRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, sessionExpired, portalIdentity } = useAuth();

  if (!isAuthenticated && !sessionExpired) {
    return <Redirect to={LOGIN_PATH} />;
  }

  if (isAuthenticated && !canAccessAdminPortal(portalIdentity)) {
    return <Redirect to={USER_PORTAL_HOME} />;
  }

  return <ProtectedRoute>{children}</ProtectedRoute>;
};

export default AdminPortalRoute;
