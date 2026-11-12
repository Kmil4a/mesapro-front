import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { homeForRole } from "./moduleAccess";

export function PublicRoute() {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading)
    return (
      <div
        role="status"
        className="flex min-h-screen items-center justify-center text-slate-500"
      >
        Verificando sesión...
      </div>
    );

  return isAuthenticated ? (
    <Navigate to={homeForRole(user?.role)} replace />
  ) : (
    <Outlet />
  );
}
