import { Navigate, Outlet } from 'react-router-dom';
import { useIsAuthenticated } from '../../store/authStore';

export default function PrivateRoute() {
  const isAuthenticated = useIsAuthenticated();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
