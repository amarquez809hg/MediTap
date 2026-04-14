import React from 'react';
import { Redirect } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Wraps a page that requires a logged-in Django user (JWT in localStorage).
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, sessionExpired } = useAuth();
  if (!isAuthenticated && !sessionExpired) {
    return <Redirect to="/tab3" />;
  }
  return <>{children}</>;
};

export default ProtectedRoute;
