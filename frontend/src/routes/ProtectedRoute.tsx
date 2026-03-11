import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

interface ProtectedRouteProps {
  role: 'owner' | 'contractor';
  children: React.ReactNode;
}

export function ProtectedRoute({ role, children }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuthStore();

  // In dev mode, always allow access
  if (import.meta.env.DEV) {
    return <>{children}</>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }

  if (user.role !== role) {
    return <Navigate to={user.role === 'owner' ? '/dashboard' : '/app'} replace />;
  }

  return <>{children}</>;
}
