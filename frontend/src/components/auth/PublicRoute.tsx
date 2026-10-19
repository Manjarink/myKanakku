import { Navigate, Outlet } from 'react-router-dom';
import { useIsAuthenticated } from '../../store/authStore';

export default function PublicRoute() {
  const isAuthenticated = useIsAuthenticated();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
