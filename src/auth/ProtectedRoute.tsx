import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { hasModuleAccess, homeForRole } from "./moduleAccess";

function AccessDenied() {
  const { user } = useAuth();
  const home = homeForRole(user?.role);

  return (
    <section className="mx-auto max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
      <h2 className="text-lg font-semibold">No tienes acceso a este módulo</h2>
      <p className="mt-2 text-sm">Tu rol no permite abrir esta vista. Si necesitas acceso, solicita al administrador que revise tus permisos.</p>
      <Link to={home} className="mt-4 inline-block rounded-lg bg-amber-900 px-4 py-2 text-sm font-medium text-white">Volver a mi inicio</Link>
    </section>
  );
}

export function RoleProtectedRoute({ path }: { path: string }) {
  const { user } = useAuth();
  return hasModuleAccess(path, user?.role) ? <Outlet /> : <AccessDenied />;
}

export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Verificando sesión...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
