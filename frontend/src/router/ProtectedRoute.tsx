import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../redux/store';
import { getRoleRedirect } from '../helpers/getRoleRedirect';

type ProtectedRouteProps = {
  allowedRoles?: string[];
  children: React.ReactNode;
};

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const user = useSelector((s: RootState) => s.auth.user);

  if (!isAuthenticated) {
    // Save current path to sessionStorage to redirect back after login
    sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
    return <Navigate to="/login" replace />;
  }

  const userRole = (user as { role?: string; Role?: string } | null)?.role || user?.Role || '';
  if (allowedRoles && !allowedRoles.some((role) => role.toLowerCase() === userRole.toLowerCase())) {
    return <Navigate to={getRoleRedirect(userRole)} replace />;
  }

  return <>{children}</>;
}

