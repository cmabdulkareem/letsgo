import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './ui';

export function FullScreenLoader({ label = 'Loading…' }) {
  return (
    <div className="min-h-[60vh] grid place-items-center">
      <Spinner label={label} />
    </div>
  );
}

/** Requires a logged-in user; bounces to /login remembering where they were headed. */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, booting } = useAuth();
  const location = useLocation();
  if (booting) return <FullScreenLoader />;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }
  return children || <Outlet />;
}

/** Login/register pages: already-signed-in users go home (or to `from`). */
export function PublicOnlyRoute({ children }) {
  const { isAuthenticated, booting } = useAuth();
  const location = useLocation();
  if (booting) return <FullScreenLoader />;
  if (isAuthenticated) {
    const dest = location.state?.from || '/home';
    return <Navigate to={dest} replace />;
  }
  return children || <Outlet />;
}

/** Admin-only areas. */
export function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, booting } = useAuth();
  const location = useLocation();
  if (booting) return <FullScreenLoader />;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (!isAdmin) return <Navigate to="/home" replace />;
  return children || <Outlet />;
}
