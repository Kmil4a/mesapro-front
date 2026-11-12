import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { PublicRoute } from "../auth/PublicRoute";
import { LoginPage } from "../pages/LoginPage";
import { ProtectedRoute, RoleProtectedRoute } from "../auth/ProtectedRoute";
import { AppLayout } from "../components/layout/AppLayout";
const DashboardPage = lazy(() =>
  import("../pages/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);
import MesasPage from "../modules/mesas/pages/MesasPage";
import CatalogoPage from "../modules/catalogo/pages/CatalogoPage";
import OrdersPage from "../modules/pedidos/pages/OrdersPage";
import CajaPage from "../modules/caja/pages/CajaPage";
import DailyClosePage from "../modules/reportes/pages/DailyClosePage";
import UsersPage from "../modules/usuarios/pages/UsersPage";
import ConfigurationPage from "../modules/configuracion/pages/ConfigurationPage";

export function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route element={<RoleProtectedRoute path="/dashboard" />}>
            <Route
              path="/dashboard"
              element={
                <Suspense
                  fallback={
                    <div role="status" className="p-8 text-slate-500">
                      Cargando dashboard...
                    </div>
                  }
                >
                  <DashboardPage />
                </Suspense>
              }
            />
          </Route>
          <Route element={<RoleProtectedRoute path="/mesas" />}>
            <Route path="/mesas" element={<MesasPage />} />
          </Route>
          <Route element={<RoleProtectedRoute path="/pedidos" />}>
            <Route path="/pedidos" element={<OrdersPage />} />
          </Route>
          <Route element={<RoleProtectedRoute path="/caja" />}>
            <Route path="/caja" element={<CajaPage />} />
          </Route>
          <Route element={<RoleProtectedRoute path="/productos" />}>
            <Route path="/productos" element={<CatalogoPage />} />
          </Route>
          <Route element={<RoleProtectedRoute path="/reportes" />}>
            <Route path="/reportes" element={<DailyClosePage />} />
          </Route>
          <Route element={<RoleProtectedRoute path="/usuarios" />}>
            <Route path="/usuarios" element={<UsersPage />} />
          </Route>
          <Route element={<RoleProtectedRoute path="/configuracion" />}>
            <Route path="/configuracion" element={<ConfigurationPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
